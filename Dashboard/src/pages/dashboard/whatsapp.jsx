// When accessed directly, render full dashboard shell
export { default } from './index';

// ─── WhatsApp studio shell ───────────────────────────────────────────────────
// A thin frame: the left section nav, the brand selector and which page is
// open. Every page is its own component in components/whatsapp/ and is loaded
// only when first opened, so the inbox doesn't pay for the analytics charts.
//
// Page props (shared contract): { brandId, brands, isAdmin, goTo, extra }
//   brandId — '' for all brands, else a brand id (number)
//   brands  — [{ id, name }]
//   goTo(pageKey, extra) — switch page; `extra` (e.g. { conversationId }) is
//   handed to the new page as the `extra` prop.
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  WhatsappIcon, Message01Icon, RoboticIcon, Megaphone01Icon, File01Icon, FlashIcon,
  ShoppingCartRemove01Icon, Analytics01Icon, Settings01Icon,
} from '@hugeicons/core-free-icons';
import { brandService } from '../../services';
import { useAuth } from '../../context/AuthContext';

function PageLoading() {
  return (
    <div className="wst-loading" role="status" aria-label="Loading">
      <span /><span /><span />
    </div>
  );
}

const load = (importer) => dynamic(importer, { ssr: false, loading: PageLoading });

const PAGE_COMPONENTS = {
  inbox:           load(() => import('../../components/whatsapp/InboxPage')),
  automations:     load(() => import('../../components/whatsapp/AutomationsPage')),
  broadcasts:      load(() => import('../../components/whatsapp/BroadcastsPage')),
  'broadcast-new': load(() => import('../../components/whatsapp/NewBroadcastPage')),
  templates:       load(() => import('../../components/whatsapp/TemplatesPage')),
  'quick-replies': load(() => import('../../components/whatsapp/QuickRepliesPage')),
  carts:           load(() => import('../../components/whatsapp/CartsPage')),
  analytics:       load(() => import('../../components/whatsapp/AnalyticsPage')),
  settings:        load(() => import('../../components/whatsapp/SettingsPage')),
};

const NAV = [
  { key: 'inbox',         label: 'Inbox',              icon: Message01Icon },
  { key: 'automations',   label: 'Automatic messages', icon: RoboticIcon },
  { key: 'broadcasts',    label: 'Broadcasts',         icon: Megaphone01Icon, also: ['broadcast-new'] },
  { key: 'templates',     label: 'Templates',          icon: File01Icon },
  { key: 'quick-replies', label: 'Quick replies',      icon: FlashIcon },
  { key: 'carts',         label: 'Abandoned carts',    icon: ShoppingCartRemove01Icon },
  { key: 'analytics',     label: 'Analytics',          icon: Analytics01Icon },
  { key: 'settings',      label: 'Settings',           icon: Settings01Icon, adminOnly: true },
];

const BRAND_KEY = 'obz-wa-brand';

// The page lives in the URL hash (#templates) so a refresh or a shared link
// lands on the same section. Inbox (the default) keeps a clean URL.
function pageFromHash() {
  if (typeof window === 'undefined') return null;
  const h = (window.location.hash || '').replace(/^#/, '');
  return PAGE_COMPONENTS[h] ? h : null;
}

// Deep link from Orders / customer profile / global search / home cards:
// they stash the conversation id and navigate to the WhatsApp view.
function takeDeepLinkConversation() {
  let id = null;
  try {
    id = sessionStorage.getItem('obz-wa-open');
    if (id) sessionStorage.removeItem('obz-wa-open');
  } catch { /* storage blocked */ }
  return id && Number(id) ? Number(id) : null;
}

export function WhatsAppManager() {
  const { isAdmin } = useAuth();
  const [page, setPage] = useState('inbox');
  const [extra, setExtra] = useState(null);
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState('');
  const [unread, setUnread] = useState(null);

  const goTo = useCallback((key, ext = null) => {
    const next = PAGE_COMPONENTS[key] ? key : 'inbox';
    setPage(next);
    // A fresh object each time so asking for the same chat twice still reacts.
    setExtra(ext ? { ...ext, _at: Date.now() } : null);
    try {
      const url = window.location.pathname + window.location.search + (next === 'inbox' ? '' : `#${next}`);
      window.history.replaceState(window.history.state, '', url);
    } catch { /* ignore */ }
    if (typeof window !== 'undefined') {
      const main = document.querySelector('.wst-main');
      if (main) main.scrollTop = 0;
    }
  }, []);

  // First load: deep-linked chat wins, then the URL hash, then Inbox.
  useEffect(() => {
    const convId = takeDeepLinkConversation();
    if (convId) goTo('inbox', { conversationId: convId });
    else {
      const fromHash = pageFromHash();
      if (fromHash) { setPage(fromHash); }
    }
    try {
      const saved = localStorage.getItem(BRAND_KEY);
      if (saved && Number(saved)) setBrandId(Number(saved));
    } catch { /* ignore */ }
    // The dashboard re-uses this component for /whatsapp and /whatsapp-chat,
    // so a deep link fired while it is already mounted arrives as a popstate.
    const onPop = () => {
      const id = takeDeepLinkConversation();
      if (id) goTo('inbox', { conversationId: id });
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [goTo]);

  useEffect(() => {
    let alive = true;
    brandService.getAllBrands(true)
      .then((r) => {
        if (!alive || !r?.success) return;
        setBrands((r.data || []).map((b) => ({ id: b.id, name: b.display_name || b.name, slug: b.slug })));
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // Forget a saved brand that no longer exists.
  useEffect(() => {
    if (brandId && brands.length && !brands.some((b) => b.id === brandId)) setBrandId('');
  }, [brands, brandId]);

  const changeBrand = (v) => {
    const next = v ? Number(v) : '';
    setBrandId(next);
    try { if (next) localStorage.setItem(BRAND_KEY, String(next)); else localStorage.removeItem(BRAND_KEY); } catch { /* ignore */ }
  };

  const nav = useMemo(() => NAV.filter((n) => !n.adminOnly || isAdmin), [isAdmin]);
  const current = page === 'settings' && !isAdmin ? 'inbox' : page;
  const Page = PAGE_COMPONENTS[current];

  return (
    <div className="wst">
      <aside className="wst-rail" aria-label="WhatsApp sections">
        <div className="wst-brandmark">
          <span className="wst-brandmark-icon" aria-hidden="true">
            <HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={2} />
          </span>
          <span className="wst-brandmark-text">WhatsApp</span>
        </div>

        <label className="wst-store">
          <span className="wst-store-label">Store</span>
          <select value={brandId || ''} onChange={(e) => changeBrand(e.target.value)} aria-label="Show which store">
            <option value="">All brands</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>

        <nav className="wst-nav">
          {nav.map((n) => {
            const active = current === n.key || (n.also || []).includes(current);
            return (
              <button
                key={n.key}
                type="button"
                className={`wst-nav-item${active ? ' is-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => goTo(n.key)}
              >
                <HugeiconsIcon icon={n.icon} size={17} strokeWidth={2} aria-hidden="true" />
                <span className="wst-nav-label">{n.label}</span>
                {n.key === 'inbox' && unread > 0 && (
                  <span className="wst-nav-badge" aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className={`wst-main${current === 'inbox' ? ' wst-main--inbox' : ''}`}>
        {current === 'inbox' ? (
          <Page brandId={brandId} brands={brands} isAdmin={isAdmin} goTo={goTo} extra={extra} onUnreadChange={setUnread} />
        ) : (
          <div className="wst-page">
            <Page key={current} brandId={brandId} brands={brands} isAdmin={isAdmin} goTo={goTo} extra={extra} />
          </div>
        )}
      </main>
    </div>
  );
}
