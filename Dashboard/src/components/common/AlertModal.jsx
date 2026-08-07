import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

/**
 * Alert / Confirm / Prompt dialogs.
 *
 * These now wrap the accessible ui/Modal (focus trap, Escape, role="dialog",
 * aria-modal, focus return, body-scroll lock, portal) and ui/Button (danger
 * variant, loading spinner, aria-busy, disable-while-busy). The external API is
 * unchanged — pass a truthy `message` to open — so existing call sites keep
 * working; they additionally get a red destructive confirm and, if their
 * onConfirm returns a promise, a loading state that keeps the dialog up until
 * the action resolves (and blocks double-clicks).
 */

const msgStyle = { margin: 0, fontSize: 14, lineHeight: 1.6, color: 'var(--ds-color-text)' };

export default function AlertModal({ message, onClose, title = 'Notice', confirmLabel = 'OK' }) {
  return (
    <Modal
      isOpen={!!message}
      onClose={onClose}
      title={title}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={false}
      footer={<Button variant="primary" onClick={onClose}>{confirmLabel}</Button>}
    >
      <p style={msgStyle}>{message}</p>
    </Modal>
  );
}

export function ConfirmModal({
  message, onConfirm, onCancel,
  title = 'Please confirm', confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  tone = 'danger',
}) {
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!message) setBusy(false); }, [message]);

  const handleConfirm = async () => {
    if (busy) return;
    try { setBusy(true); await onConfirm?.(); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      isOpen={!!message}
      onClose={busy ? undefined : onCancel}
      title={title}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={handleConfirm} loading={busy}>{confirmLabel}</Button>
        </>
      }
    >
      <p style={msgStyle}>{message}</p>
    </Modal>
  );
}

export function PromptModal({
  message, placeholder, onConfirm, onCancel,
  title = 'Please confirm', confirmLabel = 'Confirm', cancelLabel = 'Cancel',
}) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (!message) { setValue(''); setBusy(false); } }, [message]);

  const submit = async () => {
    const v = value.trim();
    if (!v || busy) return;
    try { setBusy(true); await onConfirm?.(v); }
    finally { setBusy(false); }
  };

  return (
    <Modal
      isOpen={!!message}
      onClose={busy ? undefined : onCancel}
      title={title}
      size="sm"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape={!busy}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button variant="primary" onClick={submit} loading={busy} disabled={!value.trim()}>{confirmLabel}</Button>
        </>
      }
    >
      <p style={{ ...msgStyle, marginBottom: 12 }}>{message}</p>
      <input
        type="text"
        placeholder={placeholder || ''}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
        style={{
          width: '100%', padding: '9px 12px', fontSize: 14,
          border: '1px solid var(--ds-color-border)', borderRadius: 8,
          background: 'var(--ds-color-surface)', color: 'var(--ds-color-text)', outline: 'none',
        }}
      />
    </Modal>
  );
}
