// Cheap user-agent bot/crawler detection so automated traffic doesn't inflate
// the Traffic & Conversion funnel. Covers search crawlers, social scrapers,
// headless browsers, uptime/SEO monitors and common HTTP libraries.
const BOT_RE = /(bot|crawl|spider|slurp|mediapartners|bingpreview|facebookexternalhit|facebot|meta-externalagent|meta-externalfetcher|meta-externalads|facebookcatalog|whatsapp|telegrambot|embedly|quora link preview|pinterest|redditbot|slackbot|twitterbot|linkedinbot|discordbot|headless|phantomjs|puppeteer|playwright|python-requests|python-urllib|go-http-client|axios\/|node-fetch|okhttp|java\/|libwww|curl\/|wget\/|scrapy|apache-httpclient|monitor|uptime|pingdom|lighthouse|gtmetrix|pagespeed|semrush|ahrefs|mj12bot|dotbot|petalbot|dataforseo|censys|masscan|zgrab)/i;

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

// Meta's own network (AS32934). Shoppers never browse from it — what does is
// Meta checking a page: ad review, link and landing-page checks, its crawlers.
// Those load the page with ordinary or Facebook-app user agents, so the user
// agent alone counts them as Facebook visits.
const META_V4 = [
  '31.13.24.0/21', '31.13.64.0/18', '45.64.40.0/22', '57.141.0.0/16', '57.144.0.0/14',
  '66.220.144.0/20', '69.63.176.0/20', '69.171.224.0/19', '74.119.76.0/22',
  '102.132.96.0/20', '103.4.96.0/22', '129.134.0.0/16', '157.240.0.0/16',
  '163.70.128.0/17', '173.252.64.0/18', '179.60.192.0/22', '185.60.216.0/22',
  '185.89.216.0/22', '204.15.20.0/22',
].map((c) => {
  const [ip, bits] = c.split('/');
  const mask = bits === '0' ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return [(v4Int(ip) & mask) >>> 0, mask];
});
const META_V6 = /^(2a03:2880:|2a03:83e0:|2620:0{0,4}:1c[0-9a-f]{2}:)/;
function v4Int(ip) {
  return ip.split('.').reduce((n, o) => ((n << 8) + Number(o)) >>> 0, 0);
}
function isMetaNetwork(ip) {
  const a = String(ip || '').trim().toLowerCase().replace(/^::ffff:/, '');
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(a)) {
    const n = v4Int(a);
    return META_V4.some(([net, mask]) => ((n & mask) >>> 0) === net);
  }
  return META_V6.test(a);
}

// SQL condition (MySQL) that is true when the `col` IP is on Meta's network,
// for rows stored before the filter above. IPv4 may be stored IPv4-mapped
// (::ffff:1.2.3.4).
function metaNetworkSql(col) {
  const v4 = `COALESCE(INET_ATON(SUBSTRING_INDEX(${col}, ':', -1)), 0)`;
  return `(${META_V4.map(([net, mask]) => `(${v4} & ${mask}) = ${net}`).join(' OR ')}`
    + ` OR LOWER(${col}) LIKE '2a03:2880:%' OR LOWER(${col}) LIKE '2a03:83e0:%' OR LOWER(${col}) LIKE '2620:0:1c%')`;
}

// Not a shopper: a bot user agent, or a request from Meta's network.
function isBotRequest(req) {
  return isBotUserAgent(req.headers['user-agent']) || isMetaNetwork(req.ip);
}

module.exports = { isBotUserAgent, isMetaNetwork, isBotRequest, metaNetworkSql, BOT_SQL_REGEXP };
