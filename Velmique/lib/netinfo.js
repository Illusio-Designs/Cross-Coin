/**
 * Network-Information-API helpers — same shape as Knitwink's.
 *
 *   getNetworkHint()        → { fast, type, saveData, downlink }
 *   prefersReducedData()    → boolean
 *   pickImageForConnection({thumb, small, medium, large}) → url
 *
 * Defensive reads on navigator.connection so it doesn't throw in
 * iframes / extension contexts.
 */

const FAST_TYPES = new Set(['4g', '5g']);

export function getNetworkHint() {
  if (typeof navigator === 'undefined') return { fast: true, type: 'unknown', saveData: false };
  const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  if (!c) return { fast: true, type: 'unknown', saveData: false };
  try {
    const type = c.effectiveType || 'unknown';
    return { fast: FAST_TYPES.has(type), type, saveData: !!c.saveData, downlink: c.downlink };
  } catch { return { fast: true, type: 'unknown', saveData: false }; }
}

export function prefersReducedData() {
  const h = getNetworkHint();
  if (h.saveData) return true;
  if (h.type === 'slow-2g' || h.type === '2g') return true;
  return false;
}

export function pickImageForConnection(variants = {}) {
  const h = getNetworkHint();
  if (h.saveData || h.type === 'slow-2g') return variants.thumb || variants.small || variants.medium || variants.large;
  if (h.type === '2g') return variants.small || variants.medium || variants.large;
  if (h.type === '3g') return variants.medium || variants.large || variants.small;
  return variants.large || variants.medium || variants.small;
}
