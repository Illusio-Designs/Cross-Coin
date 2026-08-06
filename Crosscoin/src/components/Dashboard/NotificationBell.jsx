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
  order: <HugeiconsIcon icon={Package01Icon} size={16} strokeWidth={2} color="#6b6b73" />,
  whatsapp: <HugeiconsIcon icon={WhatsappIcon} size={16} strokeWidth={2} color="#6b6b73" />,
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

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={toggle}
        title="Notifications"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: '6px', borderRadius: 8, display: 'flex', alignItems: 'center',
          color: 'var(--text-secondary, #6b7280)', position: 'relative',
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
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid var(--border, #e5e7eb)',
            position: 'sticky', top: 0, background: 'var(--card-bg, #fff)',
          }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Notifications</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {pushSupported() && (
                pushOn ? (
                  <span style={{ fontSize: 11, color: '#0a0a0a', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={3} />
                    Alerts on
                  </span>
                ) : (
                  <button onClick={handleEnablePush} disabled={pushBusy} style={{
                    background: 'none', border: 'none', cursor: 'pointer', fontSize: 12,
                    color: '#0a0a0a', fontWeight: 600, padding: 0,
                  }}>
                    {pushBusy ? 'Enabling…' : 'Enable alerts'}
                  </button>
                )
              )}
            {notifications.length > 0 && (
              <button onClick={clearAll} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 12, color: '#6b7280',
              }}>Clear all</button>
            )}
            </div>
          </div>

          {/* List */}
          {notifications.length === 0 ? (
            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              No notifications yet
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className="notif-item" role="button" tabIndex={0}
                onClick={() => openNotification(n)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openNotification(n); } }}
                style={{
                  display: 'flex', gap: 10, padding: '10px 16px', cursor: 'pointer',
                  borderBottom: '1px solid var(--ds-color-border-soft, #f3f4f6)',
                  background: n.read ? 'transparent' : 'var(--ds-color-surface-soft, rgba(10,10,10,0.03))',
                }}>
                <div style={{ flexShrink: 0, marginTop: 2 }}>{ICONS[n.type]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text, #111827)' }}>
                    {n.type === 'order'
                      ? `New order #${n.data.orderNumber}`
                      : `New WhatsApp message`}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {n.type === 'order'
                      ? `₹${Number(n.data.amount).toFixed(2)} · ${n.data.paymentType?.toUpperCase()}`
                      : n.data.message}
                  </div>
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>{timeAgo(n.time)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
