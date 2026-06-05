/**
 * Network-Information-API helpers.
 *
 * Returns a hint object the storefront can use to defer heavy media on
 * users with weak connections — falls back to "fast" on browsers that
 * don't expose the API (Safari, Firefox).
 *
 *   import { getNetworkHint, prefersReducedData } from '@/lib/netinfo';
 *
 *   if (prefersReducedData()) {
 *     // serve a smaller image, skip the autoplay video, etc.
 *   }
 *
 * Why a helper instead of inlining the check: a single source of truth
 * keeps the "is this a slow user?" decision consistent across the hero
 * slider, ReviewsSection, CrossSell, BlogStrip, etc.
 *
 * Returns booleans/strings rather than the raw `navigator.connection`
 * because the connection object's properties throw on access in some
 * iframes / extension contexts. Defensive reads here, no surprises in
 * callers.
 */

const FAST_TYPES = new Set(['4g', '5g']);

export function getNetworkHint() {
  if (typeof navigator === 'undefined') return { fast: true, type: 'unknown', saveData: false };
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return { fast: true, type: 'unknown', saveData: false };
  try {
    const type = c.effectiveType || 'unknown';
    return {
      fast: FAST_TYPES.has(type),
      type,
      saveData: !!c.saveData,
      downlink: c.downlink,
    };
  } catch {
    return { fast: true, type: 'unknown', saveData: false };
  }
}

/**
 * True when the user has explicitly asked for reduced data usage
 * (Save-Data header) OR is on a 2g/slow-2g connection.
 */
export function prefersReducedData() {
  const h = getNetworkHint();
  if (h.saveData) return true;
  if (h.type === 'slow-2g' || h.type === '2g') return true;
  return false;
}

/**
 * Pick the right image variant from a set of candidates based on the
 * user's connection. Pass it the list in quality order: [thumb, small,
 * medium, large]. Returns `large` for fast connections, `small` for
 * 2g, `medium` for unknown.
 */
export function pickImageForConnection(variants = {}) {
  const h = getNetworkHint();
  if (h.saveData || h.type === 'slow-2g') return variants.thumb || variants.small || variants.medium || variants.large;
  if (h.type === '2g') return variants.small || variants.medium || variants.large;
  if (h.type === '3g') return variants.medium || variants.large || variants.small;
  return variants.large || variants.medium || variants.small;
}
