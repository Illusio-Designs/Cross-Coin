// The storefront domains that belong to the CrossCoin family of brands.
//
// Shopify (and every serious analytics product) treats a referral FROM your own
// store as an internal hop, not a new traffic source — otherwise an ordinary
// page-to-page navigation shows up as a referral from your own domain and
// pollutes the "where visitors come from" report with meaningless self-referral
// names (e.g. "soxbaesocks.com" or "crosscoin.in" listed as a traffic source).
//
// This list is the belt; the braces are the live brand `domain` values, which
// the traffic report also folds in at query time (see reportsController). Keep
// hostnames here BARE (no scheme, no www., lowercase) so matching is exact.
const OWN_HOSTS = new Set([
  'crosscoin.in',
  'soxbaesocks.com',
  'morbixsocks.com',
  'gripzus.com',
  'knitwink.com',
  'velmique.co.in',
  'velquira.in',
  // Vercel preview deployments — same stores, different host.
  'soxbae.vercel.app',
  'morbix.vercel.app',
  'gripzus.vercel.app',
  'velquira.vercel.app',
]);

// Normalise any URL / host string to a bare, lowercase hostname (drops scheme,
// path, port and a leading www.). Returns '' when it can't be parsed.
function normalizeHost(value) {
  if (!value) return '';
  let h = String(value).trim().toLowerCase();
  if (!h) return '';
  // Accept a full URL, a bare host, or a host:port / host/path fragment.
  try {
    if (/^https?:\/\//.test(h)) h = new URL(h).hostname;
    else h = new URL(`http://${h}`).hostname;
  } catch {
    h = h.replace(/^https?:\/\//, '').replace(/[/:?#].*$/, '');
  }
  return h.replace(/^www\./, '');
}

// Is this host one of our own storefronts? Accepts a URL or a bare host, and
// also treats any subdomain of an own host (e.g. "shop.crosscoin.in") as ours.
// `extra` may carry additional own hosts (the live brand domains) to include.
function isOwnHost(value, extra) {
  const h = normalizeHost(value);
  if (!h) return false;
  const owned = extra && extra.size ? new Set([...OWN_HOSTS, ...extra]) : OWN_HOSTS;
  if (owned.has(h)) return true;
  for (const own of owned) {
    if (h === own || h.endsWith(`.${own}`)) return true;
  }
  return false;
}

module.exports = { OWN_HOSTS, normalizeHost, isOwnHost };
