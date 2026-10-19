// Real auth for the /test preview — phone-OTP via the live MSG91 widget, then
// the real /api/users/login (same contract as the production storefront). The
// token is stored in localStorage.token, which every authed API (orders,
// addresses, profile) already reads. A guest checkout also stores that token,
// so the account page lights up either way.
import { useSyncExternalStore } from 'react';
import axios from 'axios';
import { API_URL, addBrandHeader } from '../../services/api/config';
import { loginUser, getCurrentUser, getUserOrders, getUserShippingAddresses } from '../../services/publicApi';

const TKEY = 'token';
const subs = new Set();
function emit() { subs.forEach((fn) => fn()); }

export function getToken() { try { return localStorage.getItem(TKEY); } catch (_) { return null; } }
function setToken(t) { try { if (t) localStorage.setItem(TKEY, t); } catch (_) {} emit(); }
export function signOut() { try { localStorage.removeItem(TKEY); } catch (_) {} emit(); }

export function subscribeAuth(fn) {
  subs.add(fn);
  if (typeof window !== 'undefined') window.addEventListener('storage', fn);
  return () => { subs.delete(fn); if (typeof window !== 'undefined') window.removeEventListener('storage', fn); };
}
export function useAuthed() {
  return useSyncExternalStore(subscribeAuth, () => !!getToken(), () => false);
}

const tokenOf = (d) => d?.token || d?.access_token || d?.accessToken || d?.data?.token || d?.user?.token || null;

// Only existing consumers can sign in — tells the login page to send to register.
export async function checkPhone(phone) {
  try {
    const { data } = await axios.post(`${API_URL}/api/users/check-phone`, { phone }, addBrandHeader());
    return { exists: data?.exists !== false };
  } catch (_) { return { exists: null }; } // unknown — don't block
}

// Phone + MSG91 access token → real login. Stores the returned token.
export async function loginOtp({ phone, access_token }) {
  try {
    const data = await loginUser({ phone, access_token });
    const t = tokenOf(data);
    if (t) { setToken(t); return { ok: true }; }
    return { ok: false, message: data?.message || 'Login failed. Please try again.' };
  } catch (e) { return { ok: false, message: (e && (e.message || e.error)) || 'Login failed. Please try again.' }; }
}

// Register — mirrors the live flow exactly: best-effort create (random password
// + placeholder email), then phone-OTP login (stores token), then persist the
// chosen name/email via the profile endpoint.
export async function registerOtp({ name, email, phone, access_token }) {
  const digits = String(phone || '').replace(/\D/g, '');
  const nm = (name || '').trim();
  const em = (email || '').trim();
  try {
    await axios.post(`${API_URL}/api/users/register`, {
      username: nm, email: em || `${digits}@phone.crosscoin.in`, phone: digits,
      age_confirmed: true, password: Math.random().toString(36).slice(-12) + 'Cc1!',
    }, addBrandHeader()).catch(() => {});
    const res = await loginOtp({ phone: digits, access_token });
    if (!res.ok) return res;
    const token = getToken();
    if (token) {
      const base = addBrandHeader();
      await axios.put(`${API_URL}/api/users/profile`, { username: nm, ...(em ? { email: em } : {}) },
        { headers: { ...(base.headers || {}), Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    return { ok: true };
  } catch (e) { return { ok: false, message: (e && (e.message || e.error)) || 'Could not create your account.' }; }
}

export async function fetchMe() {
  try { const r = await getCurrentUser(); return r?.user || r?.data?.user || r?.data || r || null; } catch (_) { return null; }
}
export async function fetchMyOrders() {
  try {
    const r = await getUserOrders({ limit: 20 });
    const list = r?.orders || r?.data?.orders || (Array.isArray(r) ? r : (Array.isArray(r?.data) ? r.data : []));
    return (list || []).map((o) => ({
      id: o.id ?? o.order_id,
      number: o.order_number || o.orderNumber || o.number || `#${o.id ?? ''}`,
      date: o.createdAt || o.created_at || o.placed_at || '',
      status: o.status || o.order_status || o.current_status || 'pending',
      total: Number(o.final_amount ?? o.total_amount ?? o.total ?? o.grand_total ?? o.amount ?? 0),
      invoiceUrl: o.invoice_url || '',
      items: (o.OrderItems || o.items || o.order_items || []).map((it) => {
        const attrs = it.ProductVariation?.attributes || it.attributes || {};
        const pick = (k) => (Array.isArray(attrs?.[k]) ? attrs[k].join('/') : attrs?.[k]);
        return {
          name: it.product_name || it.Product?.name || it.name || it.productName || it.title || 'Item',
          variant: [pick('color') || it.color, pick('size') || it.size].filter(Boolean).join(' · '),
          qty: it.quantity ?? it.qty ?? 1,
        };
      }),
    }));
  } catch (_) { return []; }
}
export async function fetchMyAddresses() {
  try {
    const r = await getUserShippingAddresses();
    return Array.isArray(r) ? r : (r?.addresses || r?.data || (r ? [r] : []));
  } catch (_) { return []; }
}
