import { useEffect, useRef, useCallback, useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const MAX_NOTIFICATIONS = 50;

// Generate a short beep using Web Audio API
function playSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'order') {
      // Two ascending tones for new order
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.setValueAtTime(780, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else {
      // Single soft tone for WhatsApp
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    }

    osc.onended = () => ctx.close();
  } catch (_) {}
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const esRef = useRef(null);
  const reconnectTimer = useRef(null);

  const addNotification = useCallback((type, data) => {
    const item = { id: Date.now(), type, data, read: false, time: new Date() };
    setNotifications(prev => [item, ...prev].slice(0, MAX_NOTIFICATIONS));
    setUnreadCount(c => c + 1);
    playSound(type);
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    if (esRef.current) {
      esRef.current.close();
    }

    const url = `${API_BASE}/api/notifications/stream`;
    // SSE doesn't support custom headers — pass token as query param
    const es = new EventSource(`${url}?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.addEventListener('new_order', (e) => {
      try { addNotification('order', JSON.parse(e.data)); } catch (_) {}
    });

    es.addEventListener('new_whatsapp', (e) => {
      try { addNotification('whatsapp', JSON.parse(e.data)); } catch (_) {}
    });

    es.onerror = () => {
      es.close();
      // Reconnect after 5s
      reconnectTimer.current = setTimeout(connect, 5000);
    };
  }, [addNotification]);

  useEffect(() => {
    connect();
    return () => {
      esRef.current?.close();
      clearTimeout(reconnectTimer.current);
    };
  }, [connect]);

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
