import { useEffect, useRef, useCallback, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
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

// Browsers block audio that isn't started by a user gesture, so a sound fired
// by the background poll is silently swallowed until the page has been
// interacted with. "Unlock" the audio on the first click/key/touch: play it
// muted once (allowed inside a gesture), which permits later programmatic plays.
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try {
    const a = getOrderAudio();
    if (a) {
      const prevVol = a.volume;
      a.muted = true;
      const p = a.play();
      const finish = () => { a.pause(); a.currentTime = 0; a.muted = false; a.volume = prevVol; };
      if (p && p.then) p.then(finish).catch(() => { a.muted = false; });
      else finish();
    }
    // Also warm a (suspended) AudioContext so the synth fallback can play too.
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) { const c = new Ctx(); if (c.state === 'suspended') c.resume(); setTimeout(() => { try { c.close(); } catch (_) {} }, 300); }
  } catch (_) { /* ignore */ }
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
  const seenIds = useRef({ orders: new Set(), whatsapp: new Set() });

  const addNotification = useCallback((type, data) => {
    const item = { id: `${type}-${data.id || Date.now()}`, type, data, read: false, time: new Date() };
    setNotifications(prev => [item, ...prev].slice(0, MAX_NOTIFICATIONS));
    setUnreadCount(c => c + 1);
    playSound(type);
  }, []);

  useEffect(() => {
    let alive = true;
    let controller = null;
    let backoffTimer = null;
    const sinceRef = { current: new Date().toISOString() };

    const process = (data) => {
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
      // New WhatsApp messages — only inbound (customer messages). Dedup by the
      // inbound message's createdAt so outbound replies never re-trigger.
      for (const conv of (data.whatsapp || [])) {
        const inboundMsg = conv.Messages?.[0];
        if (!inboundMsg) continue;
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
    };

    // Delivery has two modes so a BACKGROUND tab still gets alerts instead of
    // depending only on Web Push (which may not land):
    //   • VISIBLE tab → long-poll: the server HOLDS the request up to ~25s and
    //     returns the instant an event fires → near-instant delivery.
    //   • HIDDEN tab  → a quick check (wait=0, nothing held on the server) every
    //     ~60s, so a missed push still surfaces within a minute instead of only
    //     when the tab is refocused. Nothing is held in the background, so idle
    //     background tabs still cost 0 Passenger workers.
    let running = false;
    const schedule = (ms) => { clearTimeout(backoffTimer); backoffTimer = setTimeout(loop, ms); };
    const loop = async () => {
      if (!alive) { running = false; return; }
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) { running = false; schedule(5000); return; } // wait for login

      running = true;
      const hidden = typeof document !== 'undefined' && document.hidden;
      controller = new AbortController();
      try {
        const url = `${API_BASE}/api/notifications/poll?since=${encodeURIComponent(sinceRef.current)}${hidden ? '&wait=0' : ''}`;
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, signal: controller.signal });
        running = false;
        if (res.status === 401) return; // stop on auth failure (page reload restarts)
        if (res.ok) {
          const data = await res.json();
          if (data.serverTime) sinceRef.current = data.serverTime;
          process(data);
        }
        // Visible: reconnect immediately (re-hold). Hidden: check again in ~60s.
        schedule(document.hidden ? 60000 : 0);
      } catch (e) {
        running = false;
        if (!alive) return;
        if (e.name === 'AbortError') { schedule(document.hidden ? 60000 : 0); return; }
        schedule(document.hidden ? 60000 : 5000); // network error — back off
      }
    };

    // One-time seed: the bell is otherwise empty until a live event arrives while
    // the page is open (and resets on every reload) — which reads as "notifications
    // don't show". Pull the last 24h of activity once (wait=0 → immediate, no hold)
    // and add it as READ + SILENT: it appears in the list, but plays no sound and
    // never inflates the unread badge. The live loop below still fires sound +
    // unread for genuinely new events (deduped via seenIds).
    const seed = async () => {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
      if (!token) return;
      try {
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const res = await fetch(
          `${API_BASE}/api/notifications/poll?since=${encodeURIComponent(since)}&wait=0`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!alive || !res.ok) return;
        const data = await res.json();
        const items = [];
        for (const order of (data.orders || [])) {
          if (seenIds.current.orders.has(order.id)) continue;
          seenIds.current.orders.add(order.id);
          items.push({
            id: `order-${order.id}`, type: 'order', read: true,
            time: order.createdAt ? new Date(order.createdAt) : new Date(),
            data: { id: order.id, orderNumber: order.order_number, amount: order.final_amount, paymentType: order.payment_type },
          });
        }
        for (const conv of (data.whatsapp || [])) {
          const inboundMsg = conv.Messages?.[0];
          const key = `${conv.id}-${inboundMsg?.createdAt || conv.last_message_at}`;
          if (seenIds.current.whatsapp.has(key)) continue;
          seenIds.current.whatsapp.add(key);
          items.push({
            id: `whatsapp-${conv.id}`, type: 'whatsapp', read: true,
            time: conv.last_message_at ? new Date(conv.last_message_at) : new Date(),
            data: { id: conv.id, phone: conv.customer_phone, message: conv.last_message },
          });
        }
        if (alive && items.length) {
          items.sort((a, b) => new Date(b.time) - new Date(a.time));
          setNotifications(prev => [...items, ...prev].slice(0, MAX_NOTIFICATIONS));
        }
      } catch (_) { /* seeding is best-effort */ }
    };
    seed();

    schedule(2000);

    // On any visibility change, abort the in-flight request and re-run in the
    // right mode straight away: hold when visible (instant), quick+60s when
    // hidden. The `since` timestamp means the resume poll returns everything
    // missed while the tab was in the background, so nothing is lost.
    const onVisible = () => {
      if (!alive) return;
      if (controller) { try { controller.abort(); } catch (_) {} }
      if (!running) schedule(document.hidden ? 60000 : 0);
    };
    document.addEventListener('visibilitychange', onVisible);

    // Unlock audio on the first interaction so the new-order sound can play.
    const onFirstGesture = () => { unlockAudio(); };
    const evts = ['pointerdown', 'keydown', 'touchstart'];
    evts.forEach((e) => window.addEventListener(e, onFirstGesture, { once: true, passive: true }));

    return () => {
      alive = false;
      clearTimeout(backoffTimer);
      if (controller) { try { controller.abort(); } catch (_) {} }
      document.removeEventListener('visibilitychange', onVisible);
      evts.forEach((e) => window.removeEventListener(e, onFirstGesture));
    };
  }, [addNotification]);

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
