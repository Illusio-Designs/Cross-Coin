// Admin toasts — goey-toast (gooey, morphing pills built on Sonner). Every
// toast helper in the app (utils/toast, utils/toastNotification, the API error
// interceptor, live order / WhatsApp alerts) goes through here.
//
// A short message is the pill's title. A long one keeps a short title
// ("Saved", "Error"…) and opens into the message on expand. Toasts with the
// same id replace each other, so a repeated message shows once.
import { gooeyToast } from 'goey-toast';

const TITLES = { success: 'Done', error: 'Something went wrong', info: 'Note', warning: 'Check this' };
const SHORT = 56;

export function notify(type, message, opts = {}) {
  if (typeof window === 'undefined') return undefined;
  const text = typeof message === 'string' ? message.trim() : '';
  const fn = gooeyToast[type] || gooeyToast;
  const short = text && text.length <= SHORT;
  const title = opts.title || (short ? text : TITLES[type] || 'Note');
  const description = opts.description !== undefined ? opts.description : (!short && text ? text : undefined);
  try {
    return fn(title, {
      id: opts.id || `${type}:${text || title}`,
      description,
      action: opts.action,
      duration: opts.duration || (type === 'error' ? 5000 : 3500),
    });
  } catch (_) {
    return undefined; // a toast must never break the page
  }
}

export const dismissToast = (id) => { try { gooeyToast.dismiss(id); } catch (_) { /* ignore */ } };

// Go to a dashboard view the way the shell expects (path + popstate).
function goToView(view) {
  const url = view === 'main' ? '/dashboard' : `/dashboard/${view}`;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const inr = (v) => `₹${Math.round(Number(v) || 0).toLocaleString('en-IN')}`;

// Live alerts from the notification poll: a new order, or a WhatsApp message.
export function notifyEvent(type, data = {}) {
  if (type === 'order') {
    const pay = String(data.paymentType || '').toLowerCase() === 'cod' ? 'COD' : 'Prepaid';
    return notify('success', '', {
      id: `order:${data.id}`,
      title: `New order${data.orderNumber ? ` #${data.orderNumber}` : ''}`,
      description: `${inr(data.amount)} · ${pay}`,
      action: { label: 'View orders', onClick: () => goToView('orders') },
      duration: 7000,
    });
  }
  if (type === 'whatsapp') {
    const msg = String(data.message || '').trim();
    return notify('info', '', {
      id: `wa:${data.id}:${msg.slice(0, 40)}`,
      title: `WhatsApp${data.phone ? ` · ${data.phone}` : ''}`,
      description: msg ? (msg.length > 140 ? `${msg.slice(0, 140)}…` : msg) : 'New message',
      action: { label: 'Open inbox', onClick: () => goToView('whatsapp') },
      duration: 7000,
    });
  }
  return undefined;
}
