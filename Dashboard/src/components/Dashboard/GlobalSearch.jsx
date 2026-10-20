// "Search everything" — the Dashboard command palette (Ctrl/Cmd+K).
//
// Staff type an order number, phone, AWB, customer name/email or return
// number and get grouped results (Customers · Orders · WhatsApp · Returns).
// Rules from the owner:
//   - search fires automatically once 5 characters are typed (300 ms debounce)
//   - Enter searches immediately, even with fewer characters
//   - ↑/↓ move the highlight, Enter opens it, Esc closes
// Opening a result navigates the same way the home cards do
// (history.pushState + popstate) after leaving a sessionStorage hint that the
// target page reads on mount.
import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon } from '@hugeicons/core-free-icons';
import { useAuth } from '../../context/AuthContext';
import { searchService } from '../../services/searchService';
import { SkeletonList } from '../ui/Skeleton';
import { getViewFromPath } from '../../utils/dashboardRouting';

const AUTO_MIN = 5;      // characters before search fires on its own
const ENTER_MIN = 2;     // shortest query Enter will send (backend ignores < 2)
const DEBOUNCE_MS = 300;

const GROUPS = [
  { key: 'customers', label: 'Customers' },
  { key: 'orders', label: 'Orders' },
  { key: 'chats', label: 'WhatsApp' },
  { key: 'returns', label: 'Returns' },
];

const EMPTY = { customers: [], orders: [], chats: [], returns: [] };

const STAGE_TONE = {
  to_confirm: 'warn', pending: 'warn', to_ship: 'info', in_transit: 'info',
  problems: 'danger', delivered: 'success', returns: 'accent', cancelled_rto: 'neutral',
};
const RETURN_TONE = {
  requested: 'warn', under_review: 'warn', approved: 'info', pickup_scheduled: 'info',
  picked_up: 'info', received: 'accent', refunded: 'success', rejected: 'danger',
};

const inr = (n) => (n === null || n === undefined || Number.isNaN(Number(n))
  ? null
  : `₹${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const shortDate = (d) => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};
const initials = (name, fallback = '?') => {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
};
const join = (...xs) => xs.filter(Boolean).join(' · ');

// Same pattern as goToView in Card.jsx. If we're already on the target view
// the page component wouldn't remount (and so wouldn't read the hint), so
// bounce through the home view first — replaceState keeps history clean.
function goToView(view) {
  const url = view === 'main' ? '/dashboard' : `/dashboard/${view}`;
  if (getViewFromPath() === view) {
    window.history.replaceState({}, '', '/dashboard');
    window.dispatchEvent(new PopStateEvent('popstate'));
    setTimeout(() => {
      window.history.replaceState({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, 30);
    return;
  }
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
const stash = (key, value) => { try { sessionStorage.setItem(key, value); } catch { /* storage blocked */ } };

function openResult(item) {
  switch (item.type) {
    case 'orders':
      stash('obz-orders-search', item.data.order_number);
      return goToView('orders');
    case 'chats':
      stash('obz-wa-open', String(item.data.conversation_id));
      return goToView('whatsapp-chat');
    case 'returns':
      stash('obz-orders-status', 'returns');
      return goToView('orders');
    case 'customers':
      stash('obz-customer', JSON.stringify({ kind: item.data.kind, id: item.data.id }));
      return goToView('customer');
    default:
      return undefined;
  }
}

// One row's display fields per group.
function describe(type, d) {
  if (type === 'customers') {
    const orders = Number(d.orders) || 0;
    return {
      badge: initials(d.name, '#'),
      title: d.name || d.phone || d.email || `Customer #${d.id}`,
      detail: join(d.phone, d.email, d.kind === 'guest' ? 'Guest' : null, orders ? `Spent ${inr(d.total_spent)}` : null),
      pill: orders === 1 ? '1 order' : `${orders} orders`,
      tone: orders ? 'info' : 'neutral',
    };
  }
  if (type === 'orders') {
    const prepaid = d.payment_type && !/^cod$/i.test(d.payment_type);
    return {
      badge: '#',
      title: d.order_number,
      detail: join(d.customer_name, inr(d.final_amount), d.payment_type ? (prepaid ? 'Prepaid' : 'COD') : null,
        d.brand, d.awb ? `AWB ${d.awb}` : null, shortDate(d.created_at)),
      pill: d.stageLabel || d.status,
      tone: STAGE_TONE[d.stage] || 'neutral',
    };
  }
  if (type === 'chats') {
    const unread = Number(d.unread) || 0;
    return {
      badge: initials(d.name, 'WA'),
      title: d.name || d.phone,
      detail: join(d.name ? d.phone : null, d.last_message || 'No messages yet'),
      pill: unread ? `${unread} unread` : (d.status === 'resolved' ? 'Resolved' : 'Open'),
      tone: unread ? 'success' : 'neutral',
    };
  }
  // returns
  return {
    badge: 'R',
    title: d.return_number,
    detail: join(d.order_number ? `Order ${d.order_number}` : null, inr(d.amount), shortDate(d.created_at)),
    pill: d.statusLabel || d.status,
    tone: RETURN_TONE[d.status] || 'neutral',
  };
}

function itemKey(type, d) {
  if (type === 'customers') return `${d.kind}-${d.id}`;
  if (type === 'chats') return String(d.conversation_id);
  return String(d.id);
}

export default function GlobalSearch() {
  const { canAccessView, roles } = useAuth();
  const rolesKey = (roles || []).join(',');
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const ids = { title: `gs-title-${uid}`, input: `gs-input-${uid}`, list: `gs-list-${uid}`, hint: `gs-hint-${uid}` };

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [groups, setGroups] = useState(EMPTY);
  const [searchedQ, setSearchedQ] = useState(''); // the query `groups` answers
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(0);
  const [isMac, setIsMac] = useState(false);

  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const listRef = useRef(null);
  const returnFocusRef = useRef(null);
  const reqRef = useRef(0);
  const lastSentRef = useRef(''); // last query sent, so Enter + debounce don't double-fire

  // Groups this staff member may open (the API also filters server-side).
  const allowed = useMemo(() => ({
    customers: rolesKey.split(',').some((r) => r === 'admin' || r === 'order_manager'),
    orders: canAccessView ? canAccessView('orders') : false,
    chats: canAccessView ? canAccessView('whatsapp-chat') : false,
    returns: canAccessView ? canAccessView('orders') : false,
  }), [canAccessView, rolesKey]);
  const visibleGroups = useMemo(() => GROUPS.filter((g) => allowed[g.key]), [allowed]);

  useEffect(() => {
    if (typeof navigator !== 'undefined') setIsMac(/Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent || ''));
  }, []);

  const openDialog = useCallback(() => {
    returnFocusRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    setOpen(true);
  }, []);
  const closeDialog = useCallback(() => {
    setOpen(false);
    reqRef.current += 1; // drop any in-flight response
    lastSentRef.current = '';
    setLoading(false);
    const el = returnFocusRef.current;
    setTimeout(() => { if (el && typeof el.focus === 'function' && document.contains(el)) el.focus(); }, 0);
  }, []);

  // Ctrl/Cmd+K anywhere in the dashboard (only that combo is intercepted).
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && String(e.key).toLowerCase() === 'k') {
        e.preventDefault();
        if (open) inputRef.current?.focus();
        else openDialog();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, openDialog]);

  // On open: focus the input (select previous text) and lock page scroll.
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select(); }, 0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { clearTimeout(t); document.body.style.overflow = prev; };
  }, [open]);

  const runSearch = useCallback(async (raw) => {
    const q = raw.trim();
    if (q.length < ENTER_MIN) return;
    lastSentRef.current = q;
    const id = ++reqRef.current;
    setLoading(true);
    setError('');
    try {
      const res = await searchService.searchEverything(q);
      if (id !== reqRef.current) return;
      setGroups({ ...EMPTY, ...(res?.groups || {}) });
      setSearchedQ(q);
      setActive(0);
    } catch (e) {
      if (id !== reqRef.current) return;
      setError(e?.response?.data?.message || e?.message || 'Search failed');
      setGroups(EMPTY);
      setSearchedQ(q);
    } finally {
      if (id === reqRef.current) setLoading(false);
    }
  }, []);

  // Auto-search once AUTO_MIN characters are typed (debounced).
  useEffect(() => {
    if (!open) return undefined;
    const q = query.trim();
    if (q.length < AUTO_MIN) {
      reqRef.current += 1;
      lastSentRef.current = '';
      setLoading(false);
      // Keep results from an Enter-search for this exact text; clear otherwise.
      if (q !== searchedQ) { setGroups(EMPTY); setSearchedQ(''); setError(''); }
      return undefined;
    }
    if (q === searchedQ) return undefined;
    const t = setTimeout(() => { if (lastSentRef.current !== q) runSearch(q); }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flatten the visible results for keyboard navigation.
  const flat = useMemo(() => {
    const out = [];
    for (const g of visibleGroups) {
      if (filter !== 'all' && filter !== g.key) continue;
      (groups[g.key] || []).forEach((d) => out.push({ type: g.key, data: d, key: `${g.key}-${itemKey(g.key, d)}` }));
    }
    return out;
  }, [groups, filter, visibleGroups]);

  useEffect(() => { if (active >= flat.length) setActive(0); }, [flat.length, active]);

  // Keep the highlighted row in view.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-idx="${active}"]`);
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }, [active, open]);

  const choose = (item) => {
    if (!item) return;
    closeDialog();
    openResult(item);
  };

  const onInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flat.length) setActive((i) => (i + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length) setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const q = query.trim();
      if (q && q === searchedQ && !loading && flat[active]) choose(flat[active]);
      else runSearch(q);
    }
  };

  // Esc closes; Tab stays inside the dialog.
  const onDialogKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeDialog();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const nodes = [...dialogRef.current.querySelectorAll('input, button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  const q = query.trim();
  const counts = Object.fromEntries(GROUPS.map((g) => [g.key, (groups[g.key] || []).length]));
  const total = visibleGroups.reduce((s, g) => s + counts[g.key], 0);
  // Keep the last results on screen while a refined query is loading.
  const hasResults = !!searchedQ;

  let status = '';
  // First search: skeleton rows below (they carry the "Searching…" label).
  // A refined search keeps the old results + the small spinner in the input.
  const firstSearch = loading && !hasResults;
  if (loading) status = hasResults ? 'Searching…' : '';
  else if (error) status = error;
  else if (q.length > 0 && q.length < AUTO_MIN && !hasResults) status = `Type at least ${AUTO_MIN} characters, or press Enter`;
  else if (hasResults && searchedQ === q && total === 0) status = `No matches for “${searchedQ}”`;

  let idx = -1;
  const dialog = open ? (
    <div className="gs-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeDialog(); }}>
      <div
        ref={dialogRef}
        className="gs-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={ids.title}
        onKeyDown={onDialogKeyDown}
      >
        <h2 id={ids.title} className="ds-sr-only">Search everything</h2>
        <div className="gs-inputrow">
          <span className="gs-inputicon" aria-hidden="true"><HugeiconsIcon icon={Search01Icon} size={18} strokeWidth={2} /></span>
          <label htmlFor={ids.input} className="ds-sr-only">Search orders, phone numbers, AWB, customers, chats and returns</label>
          <input
            id={ids.input}
            ref={inputRef}
            className="gs-input"
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Order no., phone, AWB, name, email or return no."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded={flat.length > 0}
            aria-controls={ids.list}
            aria-autocomplete="list"
            aria-describedby={ids.hint}
            aria-activedescendant={flat.length ? `${ids.list}-opt-${active}` : undefined}
          />
          {loading && hasResults && <span className="gs-spinner" aria-hidden="true" />}
          <button type="button" className="gs-esc" onClick={closeDialog} aria-label="Close search">Esc</button>
        </div>

        {visibleGroups.length > 1 && (
          <div className="gs-chips" role="toolbar" aria-label="Filter results">
            <button type="button" className={`gs-chip${filter === 'all' ? ' is-on' : ''}`} aria-pressed={filter === 'all'} onClick={() => { setFilter('all'); setActive(0); }}>
              All <span className="gs-count">{hasResults ? total : 0}</span>
            </button>
            {visibleGroups.map((g) => (
              <button key={g.key} type="button" className={`gs-chip${filter === g.key ? ' is-on' : ''}`} aria-pressed={filter === g.key}
                onClick={() => { setFilter(g.key); setActive(0); }}>
                {g.label} <span className="gs-count">{hasResults ? counts[g.key] : 0}</span>
              </button>
            ))}
          </div>
        )}

        <div className="gs-body">
          <p id={ids.hint} className={`gs-status${error ? ' is-error' : ''}`} role="status" aria-live="polite">{status}</p>
          {firstSearch && <SkeletonList rows={4} avatar label="Searching…" />}
          <div id={ids.list} ref={listRef} className="gs-list" role="listbox" aria-label="Search results">
            {hasResults && visibleGroups.map((g) => {
              if (filter !== 'all' && filter !== g.key) return null;
              const rows = groups[g.key] || [];
              if (!rows.length) return null;
              const headId = `${ids.list}-h-${g.key}`;
              return (
                <div key={g.key} className="gs-group" role="group" aria-labelledby={headId}>
                  <div id={headId} className="gs-group-h">{g.label}</div>
                  {rows.map((d) => {
                    idx += 1;
                    const i = idx;
                    const v = describe(g.key, d);
                    return (
                      <div
                        key={itemKey(g.key, d)}
                        id={`${ids.list}-opt-${i}`}
                        data-idx={i}
                        role="option"
                        aria-selected={i === active}
                        className={`gs-row gs-row--${g.key}${i === active ? ' is-active' : ''}`}
                        onMouseMove={() => { if (active !== i) setActive(i); }}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => choose(flat[i])}
                      >
                        <span className={`gs-badge gs-badge--${g.key}`} aria-hidden="true">{v.badge}</span>
                        <span className="gs-main">
                          <span className="gs-title">{v.title}</span>
                          <span className="gs-detail">{v.detail}</span>
                        </span>
                        {v.pill && <span className={`gs-pill tone-${v.tone}`}>{v.pill}</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="gs-foot" aria-hidden="true">
          <span><kbd>↑</kbd> <kbd>↓</kbd> to move</span>
          <span><kbd>Enter</kbd> to open</span>
          <span><kbd>Esc</kbd> to close</span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        className="gs-trigger"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        aria-label="Search everything"
        title={`Search everything (${isMac ? '⌘K' : 'Ctrl+K'})`}
      >
        <span className="gs-trigger-icon" aria-hidden="true"><HugeiconsIcon icon={Search01Icon} size={17} strokeWidth={2} /></span>
        <span className="gs-trigger-text" aria-hidden="true">Search orders, phone, AWB…</span>
        <kbd className="gs-trigger-kbd" aria-hidden="true">{isMac ? '⌘ K' : 'Ctrl K'}</kbd>
      </button>
      {dialog && typeof document !== 'undefined' ? createPortal(dialog, document.body) : null}
    </>
  );
}
