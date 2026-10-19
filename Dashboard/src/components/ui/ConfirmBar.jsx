import { useEffect, useId, useRef } from 'react';
import clsx from '../Dashboard/primitives/_clsx';

/**
 * ConfirmBar — ask on the page before doing something that can't be undone
 * (never a browser pop-up). Shows the question with Keep / Confirm; focus
 * lands on the safe choice and Esc cancels.
 *
 *   {confirming && (
 *     <ConfirmBar
 *       message={<>Delete coupon <b>DIWALI30</b>? 41 customers used it.</>}
 *       confirmLabel="Delete" cancelLabel="Keep"
 *       busy={deleting} onConfirm={remove} onCancel={() => setConfirming(false)}
 *     />
 *   )}
 *
 * tone: 'danger' (default, red confirm) | 'primary'.
 */
export default function ConfirmBar({
  message,
  confirmLabel = 'Yes, go ahead',
  cancelLabel = 'Cancel',
  tone = 'danger',
  busy = false,
  onConfirm,
  onCancel,
  autoFocus = true,
  className,
}) {
  const id = useId();
  const cancelRef = useRef(null);
  useEffect(() => { if (autoFocus) cancelRef.current?.focus(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && !busy && onCancel) { e.stopPropagation(); onCancel(); }
  };

  return (
    <div className={clsx('ui-confirm', className)} role="alertdialog" aria-labelledby={id} onKeyDown={onKeyDown}>
      <span id={id} className="ui-confirm__msg">{message}</span>
      <span className="ui-confirm__actions">
        <button ref={cancelRef} type="button" className="ui-confirm__btn" onClick={onCancel} disabled={busy}>
          {cancelLabel}
        </button>
        <button
          type="button"
          className={clsx('ui-confirm__btn', tone === 'primary' ? 'ui-confirm__btn--primary' : 'ui-confirm__btn--danger')}
          onClick={onConfirm}
          disabled={busy}
          aria-busy={busy || undefined}
        >
          {busy && <span className="ui-spin" aria-hidden="true" />}
          {confirmLabel}
        </button>
      </span>
    </div>
  );
}
