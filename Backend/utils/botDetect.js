// Cheap user-agent bot/crawler detection so automated traffic doesn't inflate
// the Traffic & Conversion funnel. Covers search crawlers, social scrapers,
// headless browsers, uptime/SEO monitors and common HTTP libraries.
const BOT_RE = /(bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|facebot|whatsapp|telegrambot|embedly|quora link preview|pinterest|redditbot|slackbot|twitterbot|linkedinbot|discordbot|headless|phantomjs|puppeteer|playwright|python-requests|python-urllib|go-http-client|axios\/|node-fetch|okhttp|java\/|libwww|curl\/|wget\/|scrapy|apache-httpclient|monitor|uptime|pingdom|lighthouse|gtmetrix|pagespeed|semrush|ahrefs|mj12bot|dotbot|petalbot|dataforseo|censys|masscan|zgrab)/i;

function isBotUserAgent(ua) {
  if (!ua || typeof ua !== 'string') return true; // no UA at all → treat as non-human
  return BOT_RE.test(ua);
}

// SQL fragment (MySQL REGEXP) to exclude bot user agents from an existing
// utm_tracking scan. DERIVED from BOT_RE so the two can never drift apart (the
// hand-maintained copy had silently lost whatsapp, quora link preview, axios/,
// java/, curl/ and wget/). Strip the wrapping group, unescape `\/` → `/` (MySQL
// REGEXP treats `/` literally), and lowercase (it's matched against
// LOWER(user_agent)).
const BOT_SQL_REGEXP = BOT_RE.source
  .replace(/^\(|\)$/g, '')
  .replace(/\\\//g, '/')
  .toLowerCase();

module.exports = { isBotUserAgent, BOT_SQL_REGEXP };
