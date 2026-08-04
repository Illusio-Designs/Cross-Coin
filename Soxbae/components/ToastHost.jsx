'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { subscribeToasts } from '@/lib/toast';

const ICONS = {
  success: 'ShieldCheck',
  error: 'X',
  info: 'Sparkles',
  cart: 'ShoppingBag',
  wishlist: 'Heart',
};

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const dismiss = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));
    return subscribeToasts((t) => {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => dismiss(t.id), t.duration);
    });
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <div className="toast-host" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-ic"><Icon name={ICONS[t.type] || 'Sparkles'} size={16} /></span>
          <span className="toast-msg">{t.message}</span>
          <button className="toast-close" onClick={() => remove(t.id)} aria-label="Dismiss"><Icon name="X" size={13} /></button>
        </div>
      ))}
    </div>
  );
}
