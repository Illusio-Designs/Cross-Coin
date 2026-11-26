export const REPORT_COST_RATES_QUERY = ['reports', 'cost-rates'];
export const DEFAULT_REPORT_COST_RATES = { shipping: 90, service: 30, gatewayPct: 2, codPct: 2 };

export function browserCostRates() {
  let saved;
  try { saved = JSON.parse(localStorage.getItem('rp_knobs') || '{}'); } catch { /* storage unavailable */ }
  return Object.fromEntries(Object.entries(DEFAULT_REPORT_COST_RATES).map(([key, fallback]) => {
    const raw = saved?.[key];
    const max = key.endsWith('Pct') ? 100 : 9999999999.99;
    const value = raw === '' ? 0 : Number(raw);
    return [key, raw != null && Number.isFinite(value) && value >= 0 && value <= max ? Number(value.toFixed(2)) : fallback];
  }));
}
