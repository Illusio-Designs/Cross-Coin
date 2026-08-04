import { useEffect, useRef, useCallback, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const POLL_INTERVAL = 8000; // 8 seconds
const MAX_NOTIFICATIONS = 50;

// The real Shopify "ka-ching" sale sound (served from /public/sounds). Preloaded
// once and reused so it fires instantly on a new order.
let orderAudio = null;
function getOrderAudio() {
  if (typeof Audio === 'undefined') return null;
  if (!orderAudio) {
    orderAudio = new Audio('/sounds/new-order.mp3');
    orderAudio.preload = 'auto';
    orderAudio.volume = 0.85;
  }
  return orderAudio;
}

// Synth fallback — used only if the mp3 can't play (blocked/unloaded), so a new
// order is never silent.
function playSynth(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    const bell = (freq, start, dur, peak) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + start);
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(peak, now + start + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.03);
    };
    if (type === 'order') {
      bell(1046.50, 0.00, 0.55, 0.45);
      bell(1567.98, 0.10, 0.65, 0.45);
      bell(2093.00, 0.10, 0.45, 0.20);
    } else {
      bell(880, 0.00, 0.30, 0.30);
      bell(1318.51, 0.06, 0.32, 0.22);
    }
    setTimeout(() => { try { ctx.close(); } catch (_) {} }, 1000);
  } catch (_) {}
}

function playSound(type) {
  if (type === 'order') {
    const a = getOrderAudio();
    if (a) {
      try {
        a.currentTime = 0;
        const p = a.play();
        if (p && p.catch) p.catch(() => playSynth('order'));
        return;
      } catch (_) { /* fall through to synth */ }
    }
    playSynth('order');
    return;
  }
  playSynth(type);
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastPollTime = useRef(new Date().toISOString());
  const timerRef = useRef(null);
  const seenIds = useRef({ orders: new Set(), whatsapp: new Set() });

  const addNotification = useCallback((type, data) => {
    const item = { id: `${type}-${data.id || Date.now()}`, type, data, read: false, time: new Date() };
    setNotifications(prev => [item, ...prev].slice(0, MAX_NOTIFICATIONS));
    setUnreadCount(c => c + 1);
    playSound(type);
  }, []);

  const poll = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const since = lastPollTime.current;
      lastPollTime.current = new Date().toISOString();

      const res = await fetch(
        `${API_BASE}/api/notifications/poll?since=${encodeURIComponent(since)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.status === 401) {
        clearInterval(timerRef.current);
        return;
      }
      if (!res.ok) return;
      const data = await res.json();

      // New orders
      for (const order of (data.orders || [])) {
        if (!seenIds.current.orders.has(order.id)) {
          seenIds.current.orders.add(order.id);
          addNotification('order', {
            id: order.id,
            orderNumber: order.order_number,
            amount: order.final_amount,
            paymentType: order.payment_type,
          });
        }
      }

      // New WhatsApp messages — only inbound (customer messages)
      for (const conv of (data.whatsapp || [])) {
        // The poll endpoint already filters for inbound messages via the Messages include.
        // Use the inbound message's createdAt as the dedup key so outbound replies
        // on the same conversation never re-trigger a notification.
        const inboundMsg = conv.Messages?.[0];
        if (!inboundMsg) continue; // skip if no inbound message (shouldn't happen)
        const key = `${conv.id}-${inboundMsg.createdAt || conv.last_message_at}`;
        if (!seenIds.current.whatsapp.has(key)) {
          seenIds.current.whatsapp.add(key);
          addNotification('whatsapp', {
            id: conv.id,
            phone: conv.customer_phone,
            message: conv.last_message,
          });
        }
      }
    } catch (_) {}
  }, [addNotification]);

  useEffect(() => {
    // Initial poll after 2s, then every POLL_INTERVAL
    const initial = setTimeout(() => {
      poll();
      timerRef.current = setInterval(poll, POLL_INTERVAL);
    }, 2000);

    return () => {
      clearTimeout(initial);
      clearInterval(timerRef.current);
    };
  }, [poll]);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, markAllRead, clearAll };
}
