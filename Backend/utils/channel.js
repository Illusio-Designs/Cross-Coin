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
// Direct, Facebook, Instagram, Google, AI chatbot, Email, SMS, Referral.
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
  if (/chatgpt|openai|perplexity|gemini|bard|copilot|claude|anthropic|poe|phind|deepseek|you\.com|grok|meta\.ai|(^|[^a-z])ai([^a-z]|$)/.test(s)) return 'AI chatbot';
  return 'Referral';
}

// Convenience for the pageview counter: given what the storefront sends, return
// the channel bucket to increment. UTM wins over the referrer, exactly like the
// consented tracker.
function classifyChannel({ utm_source, utm_medium, referrer } = {}, selfHosts) {
  const source = utm_source || deriveSource(referrer);
  const medium = utm_medium || (utm_source ? null : deriveMedium(referrer));
  return channelOf(source, medium, selfHosts);
}

module.exports = { hostOf, deriveSource, deriveMedium, channelOf, classifyChannel };
