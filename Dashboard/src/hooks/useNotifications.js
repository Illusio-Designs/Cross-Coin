import { useEffect, useRef, useCallback, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const MAX_NOTIFICATIONS = 50;

// ── Sound ───────────────────────────────────────────────────────────────────
// Browsers keep a page silent until it has been clicked, and Safari (and Chrome
// on macOS) don't count a MUTED play as permission — so the old "play muted on
// first click" trick reported sound as on while real plays were still refused.
//
// Now one Web Audio engine is used for the whole session. It is started inside
// a real click/key/tap (plus a 1-sample silent buffer, which Safari needs), and
// once it is running it can play at any time without another gesture. The
// new-order sound (the Shopify "ka-ching", /public/sounds) is decoded once and
// played through it. `audioUnlocked` means "the engine is really running".
const ORDER_SOUND_URL = '/sounds/new-order.mp3';
// Every step logs to the browser console with a "[sound]" prefix, so a silent
// dashboard can be diagnosed from DevTools → Console.
const SOUND_BUILD = 'sound-engine v3';
const slog = (...a) => { try { console.info('[sound]', ...a); } catch (_) {} };
const swarn = (...a) => { try { console.warn('[sound]', ...a); } catch (_) {} };
if (typeof window !== 'undefined') slog(`${SOUND_BUILD} loaded`, { userAgent: navigator.userAgent });

let audioCtx = null;
let orderBuffer = null;
let bufferLoading = null;
let audioUnlocked = false;
const soundListeners = new Set();

function setUnlocked(v) {
  if (audioUnlocked === v) return;
  audioUnlocked = v;
  slog(v ? 'sound is ON' : 'sound is OFF (browser is blocking it)');
  soundListeners.forEach((fn) => { try { fn(v); } catch (_) {} });
}
function getCtx() {
  if (audioCtx || typeof window === 'undefined') return audioCtx;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  try {
    const ctx = new Ctx();
    audioCtx = ctx;
    ctx.onstatechange = () => {
      slog('engine state →', ctx.state);
      if (ctx === audioCtx) setUnlocked(ctx.state === 'running');
    };
    slog('engine created', { state: ctx.state, sampleRate: ctx.sampleRate });
  } catch (e) { audioCtx = null; swarn('could not create the audio engine', e); }
  return audioCtx;
}
const engineRunning = () => !!audioCtx && audioCtx.state === 'running';

function loadOrderSound() {
  if (orderBuffer) return Promise.resolve(orderBuffer);
  if (bufferLoading) return bufferLoading;
  const ctx = getCtx();
  if (!ctx) return Promise.resolve(null);
  slog('loading', ORDER_SOUND_URL);
  bufferLoading = fetch(ORDER_SOUND_URL)
    .then((r) => {
      slog('sound file response', r.status, r.headers.get('content-type'));
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.arrayBuffer();
    })
    // Older Safari only supports the callback form of decodeAudioData.
    .then((ab) => new Promise((resolve, reject) => {
      const p = ctx.decodeAudioData(ab, resolve, reject);
      if (p && p.then) p.then(resolve, reject);
    }))
    .then((buf) => { orderBuffer = buf; slog('sound decoded', { seconds: buf.duration.toFixed(2) }); return buf; })
    .catch((e) => { bufferLoading = null; swarn('could not load/decode the sound file', e); return null; });
  return bufferLoading;
}

// MUST be called synchronously inside a click / key / tap handler.
function unlockAudio() {
  // Some Safari versions never let an engine created before any click start,
  // even when resumed inside a click — so if it isn't running yet, start a
  // fresh one right here inside the gesture (the decoded sound is reused).
  if (audioCtx && audioCtx.state !== 'running') {
    slog('engine not running at click (' + audioCtx.state + ') → creating a new one inside the click');
    const old = audioCtx;
    audioCtx = null;
    try { old.onstatechange = null; old.close(); } catch (_) {}
  }
  const ctx = getCtx();
  if (!ctx) { swarn('no Web Audio support in this browser'); return; }
  try {
    // Safari only unlocks a context when something starts inside the gesture.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start(0);
  } catch (e) { swarn('silent unlock buffer failed', e); }
  if (ctx.state !== 'running') {
    ctx.resume()
      .then(() => { slog('engine resumed →', ctx.state); setUnlocked(engineRunning()); })
      .catch((e) => swarn('engine resume refused', e));
  } else {
    setUnlocked(true);
  }
  loadOrderSound();
}

function playOrderBuffer() {
  if (!engineRunning() || !orderBuffer) {
    slog('order sound not ready', { engine: audioCtx ? audioCtx.state : 'none', decoded: !!orderBuffer });
    return false;
  }
  try {
    const src = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    gain.gain.value = 0.85;
    src.buffer = orderBuffer;
    src.connect(gain);
    gain.connect(audioCtx.destination);
    src.start(0);
    slog('▶ playing order sound', { engine: audioCtx.state, at: audioCtx.currentTime.toFixed(2) });
    return true;
  } catch (e) { swarn('playing the order sound failed', e); return false; }
}

// Bell tones, through the same engine — the WhatsApp sound, and the order
// sound's stand-in while the mp3 is still loading.
function playSynth(type) {
  if (!engineRunning()) return false;
  try {
    const ctx = audioCtx;
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
    slog('▶ playing bell tones', type);
    return true;
  } catch (e) { swarn('bell tones failed', e); return false; }
}

// Last resort when the engine isn't running yet: a plain <audio> play, which
// some browsers allow for sites you use often. If it's refused, the bell shows
// "Turn on sound".
let fallbackAudio = null;
function playHtmlAudio() {
  if (typeof Audio === 'undefined') return;
  if (!fallbackAudio) { fallbackAudio = new Audio(ORDER_SOUND_URL); fallbackAudio.volume = 0.85; }
  try {
    fallbackAudio.currentTime = 0;
    const p = fallbackAudio.play();
    // It played → this browser allows sound here (as it did before the engine
    // existed), so don't show "Turn on sound"; refused → show it.
    if (p && p.then) {
      p.then(() => { slog('▶ <audio> fallback played'); setUnlocked(true); },
        (e) => { swarn('<audio> fallback refused by the browser', e && e.name); setUnlocked(false); });
    }
  } catch (e) { swarn('<audio> fallback failed', e); setUnlocked(false); }
}

function playSound(type) {
  slog('new alert → play', type, { engine: audioCtx ? audioCtx.state : 'none', decoded: !!orderBuffer });
  if (engineRunning()) {
    if (type === 'order' && playOrderBuffer()) return;
    playSynth(type);
    return;
  }
  if (type === 'order') playHtmlAudio();
  else setUnlocked(false);
}

// While the tab is in the background: show "(2) New order" in the tab title and,
// when the browser allows notifications, a desktop pop-up. It uses the same tag
// as the Web Push alert for that order, so the two never show twice.
let hiddenCount = 0;
let baseTitle = null;
function flagHidden(type, data) {
  if (typeof document === 'undefined' || !document.hidden) return;
  if (baseTitle === null) baseTitle = document.title;
  hiddenCount += 1;
  document.title = `(${hiddenCount}) ${type === 'order' ? 'New order' : 'New WhatsApp'} · ${baseTitle}`;
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const isOrder = type === 'order';
      const amount = data.amount != null ? ` · ₹${Math.round(Number(data.amount) || 0).toLocaleString('en-IN')}` : '';
      const n = new Notification(isOrder ? `New order ${data.orderNumber || ''}`.trim() : 'New WhatsApp message', {
        body: isOrder ? `${String(data.paymentType || '').toUpperCase()}${amount}`.replace(/^ · /, '') : (data.message || data.phone || ''),
        tag: isOrder ? `order-${data.orderNumber}` : `wa-${data.id}`,
        icon: '/favicon.ico',
      });
      n.onclick = () => { try { window.focus(); n.close(); } catch (_) {} };
    }
  } catch (_) { /* pop-ups are best-effort */ }
}
function clearHiddenFlag() {
  if (baseTitle !== null) { document.title = baseTitle; baseTitle = null; }
  hiddenCount = 0;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  // Whether the browser lets the dashboard play sound right now.
  const [soundOn, setSoundOn] = useState(audioUnlocked);
  const [unreadCount, setUnreadCount] = useState(0);
  // True until the one-time 24h seed below has answered (the bell shows
  // skeleton rows instead of "No notifications yet" meanwhile).
  const [seeding, setSeeding] = useState(true);
  const seenIds = useRef({ orders: new Set(), whatsapp: new Set() });

  const addNotification = useCallback((type, data) => {
    const item = { id: `${type}-${data.id || Date.now()}`, type, data, read: false, time: new Date() };
    setNotifications(prev => [item, ...prev].slice(0, MAX_NOTIFICATIONS));
    setUnreadCount(c => c + 1);
    playSound(type);
    flagHidden(type, data);
  }, []);

  // "Turn on sound" / "Test": runs inside the click, so the engine starts
  // right here, then plays the order sound once (the bell tones stand in if
  // the mp3 is still loading) so staff hear exactly what an order sounds like.
  const enableSound = useCallback(() => {
    slog('Turn on sound / Test pressed');
    unlockAudio();
    const ctx = getCtx();
    const play = () => {
      slog('test: engine', ctx ? ctx.state : 'none', '| decoded', !!orderBuffer);
      if (!playOrderBuffer() && !playSynth('order')) { slog('test: engine not running → trying <audio>'); playHtmlAudio(); }
    };
    if (!ctx) { playHtmlAudio(); return; }
    (ctx.state === 'running' ? Promise.resolve() : ctx.resume())
      .then(() => (orderBuffer ? null : loadOrderSound()))
      .then(play)
      .catch((e) => { swarn('test: could not start the engine', e); setUnlocked(false); playHtmlAudio(); });
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
      if (!token) { setSeeding(false); return; }
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
      finally { if (alive) setSeeding(false); }
    };
    seed();

    schedule(2000);

    // On any visibility change, abort the in-flight request and re-run in the
    // right mode straight away: hold when visible (instant), quick+60s when
    // hidden. The `since` timestamp means the resume poll returns everything
    // missed while the tab was in the background, so nothing is lost.
    const onVisible = () => {
      if (!alive) return;
      if (!document.hidden) clearHiddenFlag();
      if (controller) { try { controller.abort(); } catch (_) {} }
      if (!running) schedule(document.hidden ? 60000 : 0);
    };
    document.addEventListener('visibilitychange', onVisible);

    // Create the engine and fetch the order sound straight away. Where the
    // browser already allows sound (as it did before this engine), the engine
    // starts running by itself and "Turn on sound" never appears.
    if (getCtx()) {
      setUnlocked(engineRunning());
      loadOrderSound();
    }

    // Start the sound engine on any click / key / tap until it's running; the
    // bell shows "Turn on sound" while it isn't.
    const evts = ['pointerdown', 'keydown', 'touchend'];
    const onGesture = () => {
      unlockAudio();
      if (engineRunning()) evts.forEach((e) => window.removeEventListener(e, onGesture));
    };
    evts.forEach((e) => window.addEventListener(e, onGesture, { passive: true }));
    const onSound = (v) => { if (alive) setSoundOn(v); };
    soundListeners.add(onSound);
    setSoundOn(audioUnlocked); // pick up the engine's state from just above

    return () => {
      alive = false;
      clearTimeout(backoffTimer);
      if (controller) { try { controller.abort(); } catch (_) {} }
      document.removeEventListener('visibilitychange', onVisible);
      evts.forEach((e) => window.removeEventListener(e, onGesture));
      soundListeners.delete(onSound);
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

  return { notifications, unreadCount, markAllRead, clearAll, seeding, soundOn, enableSound };
}
