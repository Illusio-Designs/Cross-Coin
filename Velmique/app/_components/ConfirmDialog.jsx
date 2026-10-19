'use client';

import { useEffect, useRef, useState } from 'react';

/* On-brand replacement for window.confirm / prompt. Pass a `dialog`
   descriptor { title, message, confirmLabel, cancelLabel?, withReason?,
   danger?, onConfirm(reason) } to open; null to close. */
export default function ConfirmDialog({ dialog, onClose }) {
  const [reason, setReason] = useState('');
  const confirmRef = useRef(null);

  useEffect(() => { setReason(''); }, [dialog]);

  useEffect(() => {
    if (!dialog) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    confirmRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [dialog, onClose]);

  if (!dialog) return null;
  return (
    <div className="m-modal" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-modal__card m-modal__card--sm" role="alertdialog" aria-modal="true" aria-labelledby="m-confirm-h" aria-describedby="m-confirm-p">
        <h2 id="m-confirm-h" className="m-modal__h">{dialog.title}</h2>
        <p id="m-confirm-p" className="m-modal__p">{dialog.message}</p>
        {dialog.withReason ? (
          <textarea className="m-textarea" style={{ minHeight: 84, marginBottom: 16 }} value={reason}
            onChange={(e) => setReason(e.target.value)} placeholder="Tell us why (optional)…" aria-label="Reason" />
        ) : null}
        <div className="m-modal__actions">
          <button type="button" className="m-btn m-btn--ghost" onClick={onClose}>{dialog.cancelLabel || 'Keep'}</button>
          <button type="button" ref={confirmRef} className={`m-btn ${dialog.danger ? 'm-btn--danger' : 'm-btn--fill'}`}
            onClick={() => { const fn = dialog.onConfirm; onClose(); fn?.(reason); }}>
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
