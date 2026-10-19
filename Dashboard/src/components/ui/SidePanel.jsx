import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';
import clsx from '../Dashboard/primitives/_clsx';
import useFocusTrap from './useFocusTrap';

/**
 * SidePanel — details or a form that slides in from the right, over the
 * page. Focus stays inside while it's open, Esc or the backdrop closes it,
 * and focus goes back to what opened it. Full width on phones.
 *
 *   <SidePanel open={!!order} onClose={() => setOrder(null)}
 *              title={order?.number} description="Riya Shah · Surat"
 *              footer={<Button onClick={save}>Save</Button>}>
 *     …
 *   </SidePanel>
 */
export default function SidePanel({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 520,
  closeLabel = 'Close',
  closeOnBackdrop = true,
  initialFocus,
  className,
}) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(panelRef, open, { onEscape: onClose, initialFocus });

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="ui-panel-root">
      <div className="ui-panel-backdrop" onClick={closeOnBackdrop ? onClose : undefined} aria-hidden="true" />
      <section
        ref={panelRef}
        className={clsx('ui-panel', className)}
        style={{ '--ui-panel-w': typeof width === 'number' ? `${width}px` : width }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
      >
        <header className="ui-panel__head">
          <div className="ui-panel__titles">
            {title && <h2 id={titleId} className="ui-panel__title">{title}</h2>}
            {description && <p id={descId} className="ui-panel__desc">{description}</p>}
          </div>
          <button type="button" className="ui-panel__close" onClick={onClose} aria-label={closeLabel}>
            <HugeiconsIcon icon={Cancel01Icon} size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>
        <div className="ui-panel__body">{children}</div>
        {footer && <footer className="ui-panel__foot">{footer}</footer>}
      </section>
    </div>,
    document.body,
  );
}
