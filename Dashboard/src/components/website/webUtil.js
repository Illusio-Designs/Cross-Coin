// Small helpers shared by the Website area (Sliders, Blog, Photos, SEO, Policies).
import { useCallback, useEffect, useRef, useState } from 'react';
import { brandService } from '../../services';

export function goToView(view, query = '') {
  const url = `${view === 'main' ? '/dashboard' : `/dashboard/${view}`}${query ? `?${query}` : ''}`;
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export const errText = (e, fallback = 'Something went wrong. Try again.') => {
  if (!e) return fallback;
  if (typeof e === 'string') return e;
  return e.message || e.error || fallback;
};

const DAY_FMT = { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' };
export function fmtDay(d, withYear = false) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('en-IN', withYear ? { ...DAY_FMT, year: 'numeric' } : DAY_FMT);
}

// <input type="date"> value (IST calendar day) ⇄ ISO instant.
export function dayInputValue(d) {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return new Date(dt.getTime() + 330 * 60000).toISOString().slice(0, 10);
}
export const dayStartIso = (day) => (day ? new Date(`${day}T00:00:00+05:30`).toISOString() : '');
export const dayEndIso = (day) => (day ? new Date(`${day}T23:59:59+05:30`).toISOString() : '');

export const plural = (n, one, many = `${one}s`) => `${Number(n || 0).toLocaleString('en-IN')} ${n === 1 ? one : many}`;

export function fmtBytes(n) {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${Math.round(n / 1024)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

export const brandLabel = (b) => (b ? (b.display_name || b.name || `Store #${b.id}`) : '');

// ─── Storefront links ────────────────────────────────────────────────────────
// The brand's real web address (Brands → domain). No domain → no link.
export function siteBase(brand) {
  const d = String(brand?.domain || '').trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  return d ? `https://${d}` : null;
}

// Policy pages live at different paths per storefront.
export function policyPath(brand, slug) {
  const s = String(brand?.slug || '').toLowerCase();
  if (s === 'crosscoin') return `/policy/${slug}`;
  if (s === 'velmique') {
    if (/privacy/.test(slug)) return '/privacy-policy';
    if (/terms/.test(slug)) return '/terms';
    if (/shipping/.test(slug)) return '/shipping-returns';
    if (/cancel|refund|return/.test(slug)) return '/cancellation-refund';
  }
  return `/policies/${slug}`;
}

export function siteUrl(brand, pathname = '/') {
  const base = siteBase(brand);
  if (!base) return null;
  return `${base}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

// Loads `fn()` whenever `deps` change; ignores answers to stale requests.
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const seq = useRef(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const run = useCallback(async (quiet = false) => {
    const my = ++seq.current;
    setState((s) => ({ ...s, loading: !quiet || !s.data, error: null }));
    try {
      const data = await fnRef.current();
      if (my === seq.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (my === seq.current) setState((s) => ({ ...s, loading: false, error: errText(e, 'The server did not answer.') }));
    }
  }, []);
  useEffect(() => { run(); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, reload: run, setData: (fnOrData) => setState((s) => ({ ...s, data: typeof fnOrData === 'function' ? fnOrData(s.data) : fnOrData })) };
}

// Brands list, fetched once per page load and shared by every tab.
let brandsPromise = null;
export function loadBrands() {
  if (!brandsPromise) {
    brandsPromise = brandService.getAllBrands(true)
      .then((r) => (Array.isArray(r?.data) ? r.data : Array.isArray(r) ? r : []).filter((b) => b.status !== 'inactive'))
      .catch((e) => { brandsPromise = null; throw e; });
  }
  return brandsPromise;
}
