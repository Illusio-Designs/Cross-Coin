import React, { useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowLeft01Icon, ArrowRight01Icon, ArrowDown01Icon, Cancel01Icon, CustomerSupportIcon,
} from '@hugeicons/core-free-icons';
import { useAuth } from '../../context/AuthContext';
import ObzusLogo from '../common/ObzusLogo';
import useFocusTrap from '../ui/useFocusTrap';
import { menuForRoles, findInMenu, itemMatches } from './menu';
import useNavCounts from './useNavCounts';

const Icon = ({ icon, size = 18 }) => <HugeiconsIcon icon={icon} size={size} strokeWidth={1.8} aria-hidden="true" />;
const cx = (...a) => a.filter(Boolean).join(' ');
const HELP_URL = 'https://wa.me/917600046416?text=' + encodeURIComponent('Hi, I need help with CrossCoin Admin Panel.');

// Badge for an item from the nav counts: null when there's nothing waiting.
function badgeFor(item, counts) {
  if (!item.count) return null;
  const n = Number(counts[item.count]) || 0;
  if (n <= 0) return null;
  if (item.alert) {
    return { text: '!', alert: true, spoken: `${n} ${n === 1 ? 'job' : 'jobs'} failed in the last 24 hours` };
  }
  return { text: n > 99 ? '99+' : String(n), alert: false, spoken: `${n} ${item.countText}` };
}

/**
 * Dashboard menu. Desktop: full menu (248px) or an icon rail (72px) — the
 * choice is remembered by the page (index.jsx). Phones: a drawer opened from
 * ☰ in the header. Groups, roles and badges come from ./menu.js.
 */
export default function Sidebar({
  collapsed, isMobile, isMobileMenuOpen, onMobileMenuToggle, onToggleCollapse, onViewChange, currentView,
}) {
  const { roles } = useAuth();
  const roleKey = (roles || []).join(',');
  const menu = useMemo(() => menuForRoles(roles || []), [roleKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const counts = useNavCounts({ enabled: !!roleKey, refreshKey: currentView });
  const rail = !!collapsed && !isMobile;
  const drawerOpen = isMobile && isMobileMenuOpen;

  // Orders and Problems open the same view, so remember which one was
  // clicked; any navigation that isn't to that item's view forgets it.
  const [picked, setPicked] = useState(null);
  const pickedItem = picked ? menu.flatMap((g) => g.items).find((i) => i.key === picked) : null;
  const pickedLive = pickedItem && itemMatches(pickedItem, currentView);
  useEffect(() => { if (picked && !pickedLive) setPicked(null); }, [currentView]); // eslint-disable-line react-hooks/exhaustive-deps
  const place = findInMenu(currentView, menu);
  const activeKey = pickedLive ? picked : place?.item.key;
  const activeChildKey = activeKey === place?.item.key ? place?.child?.key : null;

  // Sub-lists (Reports, Shipping) open in the full menu; the one holding the
  // current page opens by itself.
  const [openKeys, setOpenKeys] = useState(() => new Set());
  useEffect(() => {
    const k = place?.child ? place.item.key : null;
    if (k) setOpenKeys((s) => (s.has(k) ? s : new Set(s).add(k)));
  }, [place?.item.key, place?.child?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const toggleOpen = (k) => setOpenKeys((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  // Icon rail: a name tooltip on hover/focus, and a small pop-out list for
  // items with sub-items.
  const [tip, setTip] = useState(null);       // { text, top }
  const [flyout, setFlyout] = useState(null); // { key, top }
  const flyRef = useRef(null);
  const btnRefs = useRef({});
  useEffect(() => { setTip(null); setFlyout(null); }, [rail, currentView]);
  const tipProps = (text) => (rail ? {
    onMouseEnter: (e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ text, top: r.top + r.height / 2 }); },
    onMouseLeave: () => setTip(null),
    onFocus: (e) => { const r = e.currentTarget.getBoundingClientRect(); setTip({ text, top: r.top + r.height / 2 }); },
    onBlur: () => setTip(null),
  } : {});

  useEffect(() => {
    if (!flyout) return undefined;
    flyRef.current?.querySelector('button')?.focus();
    const onDown = (e) => {
      if (flyRef.current?.contains(e.target) || btnRefs.current[flyout.key]?.contains(e.target)) return;
      setFlyout(null);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [flyout?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const closeFlyout = () => { const k = flyout?.key; setFlyout(null); if (k) btnRefs.current[k]?.focus(); };
  const onFlyKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeFlyout(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const els = [...flyRef.current.querySelectorAll('button')];
    const i = els.indexOf(document.activeElement);
    els[(i + (e.key === 'ArrowDown' ? 1 : -1) + els.length) % els.length]?.focus();
  };

  // Phone drawer: focus stays inside while open, Esc closes it.
  const asideRef = useRef(null);
  const closeRef = useRef(null);
  useFocusTrap(asideRef, drawerOpen, { onEscape: onMobileMenuToggle, initialFocus: closeRef });

  const go = (target, itemKey = null) => {
    if (target.hint) { try { sessionStorage.setItem('obz-orders-status', target.hint); } catch { /* storage blocked */ } }
    setPicked(itemKey);
    setTip(null);
    setFlyout(null);
    onViewChange(target.view);
  };

  const renderItem = (item) => {
    const active = activeKey === item.key;
    const badge = badgeFor(item, counts);
    const name = badge ? `${item.label}, ${badge.spoken}` : item.label;

    if (item.children) {
      const open = rail ? flyout?.key === item.key : openKeys.has(item.key);
      const subId = `sb-sub-${item.key}`;
      return (
        <li key={item.key} className="sb-li">
          <button
            type="button"
            ref={(el) => { btnRefs.current[item.key] = el; }}
            className={cx('sb-link', active && 'is-active')}
            aria-expanded={open}
            aria-controls={open ? subId : undefined}
            aria-label={rail ? item.label : undefined}
            onClick={(e) => {
              if (!rail) { toggleOpen(item.key); return; }
              const r = e.currentTarget.getBoundingClientRect();
              setTip(null);
              setFlyout(open ? null : { key: item.key, top: r.top });
            }}
            {...tipProps(item.label)}
          >
            <span className="sb-ico"><Icon icon={item.icon} /></span>
            {!rail && <span className="sb-label">{item.label}</span>}
            {!rail && <span className={cx('sb-chev', open && 'is-open')}><Icon icon={ArrowDown01Icon} size={15} /></span>}
          </button>
          {!rail && open && (
            <ul className="sb-sub" id={subId}>
              {item.children.map((c) => (
                <li key={c.key}>
                  <button
                    type="button"
                    className={cx('sb-sublink', activeChildKey === c.key && 'is-active')}
                    aria-current={activeChildKey === c.key ? 'page' : undefined}
                    onClick={() => go(c)}
                  >
                    {c.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {rail && open && (
            <div
              ref={flyRef}
              id={subId}
              className="sb-fly"
              style={{ top: flyout.top }}
              role="group"
              aria-label={item.label}
              onKeyDown={onFlyKey}
            >
              <div className="sb-fly-title" aria-hidden="true">{item.label}</div>
              {item.children.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={cx('sb-fly-link', activeChildKey === c.key && 'is-active')}
                  aria-current={activeChildKey === c.key ? 'page' : undefined}
                  onClick={() => go(c)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </li>
      );
    }

    return (
      <li key={item.key} className="sb-li">
        <button
          type="button"
          className={cx('sb-link', active && 'is-active')}
          aria-current={active ? 'page' : undefined}
          aria-label={rail || badge ? name : undefined}
          onClick={() => go(item, item.key)}
          {...tipProps(badge && !badge.alert ? `${item.label} · ${badge.text}` : item.label)}
        >
          <span className="sb-ico">
            <Icon icon={item.icon} />
            {rail && badge && <span className={cx('sb-dot', badge.alert && 'is-alert')} aria-hidden="true" />}
          </span>
          {!rail && <span className="sb-label">{item.label}</span>}
          {!rail && badge && <span className={cx('sb-count', badge.alert && 'is-alert')} aria-hidden="true">{badge.text}</span>}
        </button>
      </li>
    );
  };

  return (
    <>
      {drawerOpen && <div className="sb-overlay" onClick={onMobileMenuToggle} aria-hidden="true" />}

      <aside
        ref={asideRef}
        id="dashboard-menu"
        className={cx('sb', rail && 'sb--rail', drawerOpen && 'sb--open')}
        aria-label="Dashboard menu"
        inert={isMobile && !isMobileMenuOpen ? true : undefined}
      >
        <div className="sb-head">
          {rail ? (
            <span className="sb-mark" role="img" aria-label="Obzus admin">O</span>
          ) : (
            <span className="sb-brand">
              <ObzusLogo className="sb-wordmark" height={20} />
              <span className="sb-brand-sub">ADMIN</span>
            </span>
          )}
          {isMobile ? (
            <button ref={closeRef} type="button" className="sb-toggle" onClick={onMobileMenuToggle} aria-label="Close the menu">
              <Icon icon={Cancel01Icon} size={16} />
            </button>
          ) : (
            <button
              type="button"
              className="sb-toggle"
              onClick={onToggleCollapse}
              aria-label={rail ? 'Show the menu' : 'Shrink the menu to icons'}
              aria-expanded={!rail}
              aria-controls="sb-nav"
              title={rail ? 'Show the menu' : 'Shrink the menu to icons'}
            >
              <Icon icon={rail ? ArrowRight01Icon : ArrowLeft01Icon} size={16} />
            </button>
          )}
        </div>

        <nav className="sb-nav" id="sb-nav" aria-label="Pages">
          {menu.map((g, gi) => (
            <div key={g.key} className="sb-group">
              {rail
                ? gi > 0 && <hr className="sb-sep" aria-hidden="true" />
                : <div className="sb-group-title" id={`sb-g-${g.key}`}>{g.label}</div>}
              <ul
                className="sb-list"
                aria-labelledby={rail ? undefined : `sb-g-${g.key}`}
                aria-label={rail ? g.label : undefined}
              >
                {g.items.map(renderItem)}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sb-foot">
          <a
            className="sb-help"
            href={HELP_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={rail ? 'Need help? Chat with us on WhatsApp' : undefined}
            {...tipProps('Need help?')}
          >
            <Icon icon={CustomerSupportIcon} />
            {!rail && <span>Need help?</span>}
          </a>
        </div>

        {rail && tip && <div className="sb-tip" style={{ top: tip.top }} aria-hidden="true">{tip.text}</div>}
      </aside>
    </>
  );
}
