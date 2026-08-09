import { useState, useRef, useEffect } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Notification01Icon, Package01Icon, WhatsappIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useNotifications } from '../../hooks/useNotifications';
import { enablePush, pushSupported, pushPermission } from '../../utils/pushNotifications';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

const ICONS = {
  order: <HugeiconsIcon icon={Package01Icon} size={18} strokeWidth={2} />,
  whatsapp: <HugeiconsIcon icon={WhatsappIcon} size={18} strokeWidth={2} />,
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Web Push: "on" once granted + subscribed. Re-subscribes silently on load so
  // an already-opted-in browser stays registered after a redeploy.
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  useEffect(() => {
    if (pushSupported() && pushPermission() === 'granted') {
      enablePush().then(r => setPushOn(!!r.ok)).catch(() => {});
    }
  }, []);
  const handleEnablePush = async () => {
    setPushBusy(true);
    try {
      const r = await enablePush();
      if (r.ok) setPushOn(true);
      else if (r.reason === 'denied') alert('Notifications are blocked. Enable them for this site in your browser settings.');
      else if (r.reason === 'disabled') alert('Push is not configured on the server yet (VAPID keys missing).');
      else if (r.reason === 'unsupported') alert('This browser does not support push notifications.');
      else alert('Could not enable notifications. Please try again.');
    } finally { setPushBusy(false); }
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    setOpen(p => {
      if (!p) markAllRead();
      return !p;
    });
  };

  // Dashboard pages switch via the URL path (see utils/dashboardRouting +
  // the shell's popstate listener). Pushing the path and firing a popstate
  // lets the shell swap the view without any prop threading.
  const goTo = (view) => {
    const url = view === 'main' ? '/dashboard' : `/dashboard/${view}`;
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
    setOpen(false);
  };
  const openNotification = (n) => goTo(n.type === 'order' ? 'orders' : 'whatsapp');

  // On iPhone/iPad, web-push only works once the site is added to the Home
  // Screen as a standalone app. When it isn't, show a hint instead of an
  // "Enable alerts" button that would just fail.
  const iosNeedsInstall = typeof window !== 'undefined'
    && /iphone|ipad|ipod/i.test(window.navigator.userAgent || '')
    && !(window.navigator.standalone === true
      || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches))
    && !pushSupported();

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={toggle}
        title="Notifications"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px', borderRadius: 8, display: 'flex', alignItems: 'center',
          color: 'var(--ds-color-text-muted)', position: 'relative',
        }}
      >
        <HugeiconsIcon icon={Notification01Icon} size={20} strokeWidth={2} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            background: '#0a0a0a', color: '#fff',
            borderRadius: '50%', fontSize: 10, fontWeight: 700,
            minWidth: 16, height: 16, display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '0 3px', lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-head">
            <div className="notif-h-title">
              Notifications
              {unreadCount > 0 && <span className="notif-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
            </div>
            <div className="notif-h-actions">
              {pushSupported() && (
                pushOn ? (
                  <span className="notif-alerts"><HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} /> Alerts on</span>
                ) : (
                  <button className="notif-enable" onClick={handleEnablePush} disabled={pushBusy}>
                    {pushBusy ? 'Enabling…' : 'Enable alerts'}
                  </button>
                )
              )}
              {notifications.length > 0 && (
                <button className="notif-clear" onClick={clearAll}>Clear all</button>
              )}
            </div>
          </div>

          {iosNeedsInstall && (
            <div style={{
              margin: '0 0 8px', padding: '9px 11px', borderRadius: 10,
              background: 'var(--ds-color-surface-soft)', border: '1px solid var(--ds-color-border)',
              color: 'var(--ds-color-text-muted)', fontSize: 12, lineHeight: 1.45,
            }}>
              📲 To get order alerts on iPhone: tap <b style={{ color: 'var(--ds-color-text)' }}>Share → Add to Home Screen</b>, then open the app from that icon and enable alerts here.
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="notif-empty">No notifications yet</div>
          ) : (
            <div className="notif-list">
              {notifications.map(n => (
                <button key={n.id} type="button"
                  className={`notif-card notif-card--${n.type}${n.read ? ' is-read' : ''}`}
                  onClick={() => openNotification(n)}>
                  <span className="notif-chip">{ICONS[n.type]}</span>
                  <span className="notif-c-body">
                    <span className="notif-c-top">
                      <span className="notif-c-title">
                        {n.type === 'order' ? `New order · #${n.data.orderNumber}` : 'New WhatsApp message'}
                      </span>
                      {!n.read && <span className="notif-live" aria-hidden="true" />}
                    </span>
                    <span className="notif-c-desc">
                      {n.type === 'order'
                        ? <><span className="notif-amt">₹{Number(n.data.amount).toFixed(2)}</span> · {n.data.paymentType?.toUpperCase()}</>
                        : n.data.message}
                    </span>
                    <span className="notif-c-time">{timeAgo(n.time)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
