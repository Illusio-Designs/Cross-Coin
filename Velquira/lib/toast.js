/* Tiny toast pub/sub. Call toast.success('…') etc. from any client component;
 * <ToastHost /> (mounted in the layout) renders them. Themed to Morbix colours.
 */
let listeners = [];
let counter = 0;

export function subscribeToasts(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((l) => l !== fn); };
}

export function toast(message, type = 'info', opts = {}) {
  if (!message) return;
  const t = { id: ++counter, message, type, duration: opts.duration ?? 3000 };
  listeners.forEach((l) => l(t));
  return t.id;
}

toast.success = (m, o) => toast(m, 'success', o);
toast.error = (m, o) => toast(m, 'error', o);
toast.info = (m, o) => toast(m, 'info', o);
toast.cart = (m, o) => toast(m, 'cart', o);
toast.wishlist = (m, o) => toast(m, 'wishlist', o);
