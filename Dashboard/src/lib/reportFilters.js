import { createContext, useCallback, useContext, useMemo, useState } from 'react';

/* ──────────────────────────────────────────────────────────────
   Shared report filters (store + period) for the tabbed report pages
   (ReportHub). Inside a hub every tab reads and writes the same values, so
   switching tabs keeps the store and dates; outside one (a report opened on
   its own) useReportState is plain useState.
   ────────────────────────────────────────────────────────────── */

export const ReportFiltersContext = createContext(null);

export const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shiftDay = (s, n) => { const d = new Date(s + 'T00:00:00Z'); if (Number.isNaN(d.getTime())) return s; d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

// Store ids are kept as text ('' = all stores) so every tab's dropdown and
// API call see the same value.
const norm = (key, v) => (key === 'brandId' ? (v === '' || v == null ? '' : String(v)) : v);

export function useReportFiltersProvider() {
  const [values, setValues] = useState(() => ({ from: shiftDay(istDate(), -29), to: istDate(), brandId: '' }));
  const set = useCallback((key, v) => setValues((p) => ({ ...p, [key]: norm(key, typeof v === 'function' ? v(p[key]) : v) })), []);
  return useMemo(() => ({ values, set }), [values, set]);
}

/** [value, setValue] for 'from' | 'to' | 'brandId' — shared inside a hub. */
export function useReportState(key, initial) {
  const ctx = useContext(ReportFiltersContext);
  const [local, setLocal] = useState(initial);
  const setShared = useCallback((v) => ctx && ctx.set(key, v), [ctx, key]);
  if (!ctx) return [local, setLocal];
  return [ctx.values[key], setShared];
}
