// Shared traffic-source classification — the single source of truth used by the
// traffic report (reportsController), the consented visit tracker (utmController)
// and the cookieless anonymous pageview counter (pageviewController). Keeping it
// in one place means the Shopify-style channel buckets never drift between them.
const { isOwnHost } = require('./ownHosts');

// Bare, lowercase hostname from a URL/referrer (drops scheme, path, www.).
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
}

// Classify a visit with NO UTM params by its referrer host, so organic / social
// / direct / referral traffic is still bucketed. Self-referrals (a hop within
// our own storefronts) are treated as direct — Shopify behaviour.
function deriveSource(referrer) {
  const h = hostOf(referrer);
  if (!h) return 'direct';
  if (isOwnHost(h)) return 'direct';
  // AI assistants first — some live on google/bing/microsoft subdomains.
  if (/(chatgpt|openai)/.test(h)) return 'chatgpt';
  if (/perplexity/.test(h)) return 'perplexity';
  if (/gemini\.google|bard\.google|gemini\./.test(h)) return 'gemini';
  if (/copilot|(^|\.)bing\.com.*chat/.test(h)) return 'copilot';
  if (/claude\.ai|anthropic/.test(h)) return 'claude';
  if (/(poe\.com|phind|deepseek|you\.com|grok|meta\.ai)/.test(h)) return 'ai';
  if (/google\./.test(h)) return 'google';
  if (/bing\./.test(h)) return 'bing';
  if (/duckduckgo\./.test(h)) return 'duckduckgo';
  if (/(facebook|fb)\./.test(h) || h === 'l.facebook.com') return 'facebook';
  if (/instagram\./.test(h)) return 'instagram';
  if (/(youtube|youtu\.be)/.test(h)) return 'youtube';
  if (/(twitter|t\.co|x\.com)/.test(h)) return 'twitter';
  if (/(whatsapp|wa\.me)/.test(h)) return 'whatsapp';
  if (/linkedin\./.test(h)) return 'linkedin';
  return h; // any other referring domain
}

function deriveMedium(referrer) {
  const h = hostOf(referrer);
  if (!h) return 'none';          // direct
  if (isOwnHost(h)) return 'none'; // self-referral → treated as direct
  if (/(google|bing|duckduckgo|yahoo)\./.test(h)) return 'organic';
  if (/(facebook|fb|instagram|youtube|youtu\.be|twitter|t\.co|x\.com|linkedin|whatsapp|wa\.me)/.test(h)) return 'social';
  return 'referral';
}

// Roll a raw source/medium up into Shopify-style marketing channels:
// Direct, Facebook, Instagram, Google, WhatsApp, AI chatbot, Email, SMS,
// Referral (any other website or app).
// `selfHosts` is an optional Set of extra own-domains (the live brand domains).
function channelOf(source, medium, selfHosts) {
  const s = String(source || '').toLowerCase().trim();
  const m = String(medium || '').toLowerCase().trim();
  if (!s || s === 'direct' || s === '(direct)' || s === 'none' || s === '(none)') return 'Direct';
  if (isOwnHost(s, selfHosts)) return 'Direct';
  if (/^e[-]?mail$|newsletter|klaviyo|mailchimp|sendgrid/.test(s) || /^e[-]?mail$|newsletter/.test(m)) return 'Email';
  if (/^sms$|textmessage|text-message/.test(s) || /^sms$|^text$/.test(m)) return 'SMS';
  if (/facebook|(^|[^a-z])fb([^a-z]|$)|meta$|meta\b/.test(s) || /facebook/.test(m)) return 'Facebook';
  if (s === 'instagram' || s === 'ig' || /instagram/.test(s)) return 'Instagram';
  if (/google/.test(s)) return 'Google';
  if (/whatsapp|^wa$|wa\.me/.test(s)) return 'WhatsApp';
  if (/chatgpt|openai|perplexity|gemini|bard|copilot|claude|anthropic|poe|phind|deepseek|you\.com|grok|meta\.ai|(^|[^a-z])ai([^a-z]|$)/.test(s)) return 'AI chatbot';
  return 'Referral';
}

// Where a visit came from when the link has no UTM tags and the browser sent
// no usable referrer — common for app traffic: Instagram and Facebook open
// links in their own browser and often send no referrer, so without this an
// Instagram story or a Google ad lands in Direct. Two clues, in order:
//  1. the ad platform's click id in the landing URL (gclid = Google Ads,
//     fbclid = Meta — Instagram when its in-app browser opened it —, igshid =
//     Instagram share, ttclid = TikTok, msclkid = Microsoft Ads);
//  2. the in-app browser naming itself in the user agent.
// `landing` = the landing URL or just its query string; `clicks` = the click
// id names the store edge saw (it only sends which ones were present).
const IN_APP = [
  [/Instagram/i, 'instagram', 'social'],
  [/FBAN|FBAV|FB_IAB|FBIOS|FB4A|\[FB/i, 'facebook', 'social'],
  [/musical_ly|BytedanceWebview|TikTok/i, 'tiktok', 'social'],
  [/Snapchat/i, 'snapchat', 'social'],
  [/LinkedInApp/i, 'linkedin', 'social'],
  [/Pinterest/i, 'pinterest', 'social'],
  [/Twitter/i, 'twitter', 'social'],
  [/WhatsApp/i, 'whatsapp', 'social'],
  [/\bGSA\//, 'google', 'organic'], // the Google app (Discover, search)
];
function clickParams(landing, clicks) {
  const out = new Set((Array.isArray(clicks) ? clicks : []).map((c) => String(c).toLowerCase()));
  if (landing) {
    try {
      const q = String(landing).includes('?') ? String(landing).slice(String(landing).indexOf('?')) : String(landing);
      for (const k of new URLSearchParams(q).keys()) out.add(k.toLowerCase());
    } catch { /* not a URL */ }
  }
  return out;
}
function inferSource({ landing, clicks, ua } = {}) {
  const c = clickParams(landing, clicks);
  const inApp = IN_APP.find(([re]) => re.test(String(ua || '')));
  if (c.has('gclid') || c.has('gbraid') || c.has('wbraid')) return { source: 'google', medium: 'cpc' };
  if (c.has('msclkid')) return { source: 'bing', medium: 'cpc' };
  if (c.has('ttclid')) return { source: 'tiktok', medium: 'paid_social' };
  if (c.has('fbclid')) return { source: inApp && inApp[1] === 'instagram' ? 'instagram' : 'facebook', medium: 'social' };
  if (c.has('igshid') || c.has('igsh')) return { source: 'instagram', medium: 'social' };
  if (inApp) return { source: inApp[1], medium: inApp[2] };
  return null;
}

// The source + medium of a visit: UTM tags first, then a known referrer, then
// the click id / in-app browser clues above, else direct.
function resolveSource({ utm_source, utm_medium, referrer, landing, clicks, ua } = {}) {
  if (utm_source) return { source: String(utm_source), medium: utm_medium || null };
  const fromRef = deriveSource(referrer);
  // A click id beats a referrer that only says "an app" or "our own site".
  const inferred = inferSource({ landing, clicks, ua });
  if (fromRef !== 'direct' && !(inferred && /^(com\.|android-app)/.test(hostOf(referrer)))) {
    const clickWins = inferred && inferred.medium === 'cpc';
    if (!clickWins) return { source: fromRef, medium: deriveMedium(referrer) };
  }
  return inferred || { source: 'direct', medium: 'none' };
}

// Convenience for the pageview counter: given what the storefront sends, return
// the channel bucket to increment. UTM wins over the referrer, exactly like the
// consented tracker.
function classifyChannel({ utm_source, utm_medium, referrer, landing, clicks, ua } = {}, selfHosts) {
  const { source, medium } = resolveSource({ utm_source, utm_medium, referrer, landing, clicks, ua });
  return channelOf(source, medium, selfHosts);
}

module.exports = { hostOf, deriveSource, deriveMedium, channelOf, classifyChannel, resolveSource, inferSource };
