import { useEffect, useState } from 'react';
import { dashboardService } from '../../services';

const POLL_MS = 60 * 1000;

// Menu badge numbers from GET /api/admin/nav-counts. Polls every minute while
// the tab is visible, and again when the page changes (`refreshKey`) or the
// tab comes back. Never blocks the menu: starts empty, keeps the last good
// numbers if a poll fails.
export default function useNavCounts({ enabled = true, brandId = null, refreshKey } = {}) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!enabled) return undefined;
    let alive = true;
    const load = async () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      try {
        const next = await dashboardService.getNavCounts(brandId);
        if (alive) setCounts(next);
      } catch { /* keep the last numbers */ }
    };
    load();
    const timer = setInterval(load, POLL_MS);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, brandId, refreshKey]);

  return counts;
}
