// Cheap user-agent bot/crawler detection so automated traffic doesn't inflate
// the Traffic & Conversion funnel. Covers search crawlers, social scrapers,
// headless browsers, uptime/SEO monitors and common HTTP libraries.
const BOT_RE = /(bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|facebot|whatsapp|telegrambot|embedly|quora link preview|pinterest|redditbot|slackbot|twitterbot|linkedinbot|discordbot|headless|phantomjs|puppeteer|playwright|python-requests|python-urllib|go-http-client|axios\/|node-fetch|okhttp|java\/|libwww|curl\/|wget\/|scrapy|apache-httpclient|monitor|uptime|pingdom|lighthouse|gtmetrix|pagespeed|semrush|ahrefs|mj12bot|dotbot|petalbot|dataforseo|censys|masscan|zgrab)/i;

function isBotUserAgent(ua) {
  if (!ua || typeof ua !== 'string') return true; // no UA at all → treat as non-human
  return BOT_RE.test(ua);
}

// SQL fragment (MySQL REGEXP) to exclude bot user agents from an existing
// utm_tracking scan. Keep in sync with BOT_RE above (lowercased, no flags).
const BOT_SQL_REGEXP = 'bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|facebot|telegrambot|embedly|pinterest|redditbot|slackbot|twitterbot|linkedinbot|discordbot|headless|phantomjs|puppeteer|playwright|python-requests|python-urllib|go-http-client|node-fetch|okhttp|libwww|scrapy|apache-httpclient|monitor|uptime|pingdom|lighthouse|gtmetrix|pagespeed|semrush|ahrefs|mj12bot|dotbot|petalbot|dataforseo|censys|masscan|zgrab';

module.exports = { isBotUserAgent, BOT_SQL_REGEXP };
