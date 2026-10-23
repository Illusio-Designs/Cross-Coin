// Clean product links. Catalog cards are one per colour; instead of a
// ?color= query, the clicked colour rides in a short-lived cookie
// ("<slug>:<colour>"), and that product's page reads it (on the server, so
// the first paint already shows that colour). Old ?color= links still work.
// The cookie is site-wide (path /): after in-app navigation the browser
// still checks cookie paths against the page first loaded.
export const PDP_COLOR_COOKIE = 'pdp_color';

export const productHref = (slug) => `/products/${slug}`;

// Call when a card is clicked: remembers its colour for that product
// (10 minutes, so a reload keeps it); a card without one clears any old pick.
export function rememberPdpColor(slug, color) {
  if (typeof document === 'undefined' || !slug) return;
  document.cookie = color
    ? `${PDP_COLOR_COOKIE}=${encodeURIComponent(`${slug}:${color}`)}; path=/; max-age=600; samesite=lax`
    : `${PDP_COLOR_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

// The remembered colour for this product, from the cookie's raw value.
export function pdpColorFor(slug, raw) {
  if (!raw || !slug) return null;
  let v = raw;
  try { v = decodeURIComponent(raw); } catch { /* keep raw */ }
  const i = v.indexOf(':');
  return i > 0 && v.slice(0, i) === String(slug) ? v.slice(i + 1) || null : null;
}

// On the product page: drop a legacy ?color= from the address bar.
export function cleanColorParam() {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has('color')) return;
  url.searchParams.delete('color');
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}
