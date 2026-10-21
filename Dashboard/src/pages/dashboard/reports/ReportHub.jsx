import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { ReportFiltersContext, useReportFiltersProvider } from '../../../lib/reportFilters';
import Reports from './reports';
import RevenueProfitReport from './revenueProfit';
import ProductReport from './productReport';
import InventoryReport from './inventoryReport';
import LocationReport from './locationReport';
import TrafficReport from './trafficReport';
import AdsReport from './adsReport';
import CouponReport from './couponReport';
import CustomerReport from './customerReport';

/* ──────────────────────────────────────────────────────────────
   Two report pages, each a row of tabs over the existing reports:
     Sales     — Overview · Revenue & profit · Products · Inventory · Location
     Marketing — Traffic · Ads · Coupons · Customers
   The open tab lives in the address (#inventory) so it can be bookmarked;
   the store + period are shared by every tab (reportFilters.js). A tab only
   shows when the person may open its report view.
   ────────────────────────────────────────────────────────────── */

export const REPORT_GROUPS = {
  sales: {
    view: 'reports-sales',
    title: 'Sales reports',
    tabs: [
      { key: 'overview', label: 'Overview', view: 'reports', Component: Reports },
      { key: 'profit', label: 'Revenue & profit', view: 'revenue-profit', Component: RevenueProfitReport },
      { key: 'products', label: 'Products', view: 'report-products', Component: ProductReport },
      { key: 'inventory', label: 'Inventory', view: 'report-inventory', Component: InventoryReport },
      { key: 'location', label: 'Location', view: 'report-location', Component: LocationReport },
    ],
  },
  marketing: {
    view: 'reports-marketing',
    title: 'Marketing reports',
    tabs: [
      { key: 'traffic', label: 'Traffic', view: 'traffic-report', Component: TrafficReport },
      { key: 'ads', label: 'Ads', view: 'report-ads', Component: AdsReport },
      { key: 'coupons', label: 'Coupons', view: 'report-coupons', Component: CouponReport },
      { key: 'customers', label: 'Customers', view: 'report-customers', Component: CustomerReport },
    ],
  },
};

// Old single-report views → the page and tab that now hold them.
export const LEGACY_REPORT_VIEWS = Object.fromEntries(
  Object.entries(REPORT_GROUPS).flatMap(([group, g]) => g.tabs.map((t) => [t.view, { group, tab: t.key }]))
);

const hashTab = () => (typeof window === 'undefined' ? '' : decodeURIComponent(window.location.hash.replace(/^#/, '')));

export default function ReportHub({ group = 'sales', initialTab = null }) {
  const { canAccessView } = useAuth();
  const filters = useReportFiltersProvider();
  const g = REPORT_GROUPS[group] || REPORT_GROUPS.sales;
  const tabs = useMemo(() => g.tabs.filter((t) => canAccessView(t.view)), [g, canAccessView]);
  const pick = (key) => (tabs.some((t) => t.key === key) ? key : tabs[0]?.key);
  const [tab, setTab] = useState(() => pick(hashTab() || initialTab));

  // Keep the address in step with the tab (no history entry per click),
  // and follow it when someone edits the address or goes back.
  useEffect(() => {
    if (!tab) return;
    const url = `/dashboard/${g.view}#${tab}`;
    if (window.location.pathname + window.location.hash !== url) window.history.replaceState(window.history.state, '', url);
  }, [tab, g.view]);
  useEffect(() => {
    const onHash = () => { const k = hashTab(); if (k && tabs.some((t) => t.key === k)) setTab(k); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [tabs]);

  const current = tabs.find((t) => t.key === tab) || tabs[0];
  if (!current) return null;
  const Body = current.Component;

  return (
    <ReportFiltersContext.Provider value={filters}>
      <div className="rhub">
        <nav className="rhub-tabs" aria-label={`${g.title} sections`}>
          {tabs.map((t) => (
            <button key={t.key} type="button" className={`rhub-tab${t.key === current.key ? ' is-on' : ''}`}
              aria-current={t.key === current.key ? 'page' : undefined} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        {/* key: each tab mounts fresh (its own queries); filters come from the provider */}
        <Body key={current.key} />
      </div>
    </ReportFiltersContext.Provider>
  );
}
