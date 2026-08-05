import { useEffect, useState } from 'react';
import { subscribeToasts, dismissToast } from '../../utils/toast';

/* Gripzus is a strict black & white system, so a toast's type is
   conveyed by icon shape — not colour. Errors invert (black panel)
   so they still clearly stand apart. */
function ToastIcon({ type }) {
  const p = {
    width: 13,
    height: 13,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 3,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
  if (type === 'success') {
    return <svg {...p}><polyline points="20 6 9 17 4 12" /></svg>;
  }
  if (type === 'error') {
    return <svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
  }
  if (type === 'warning') {
    return <svg {...p}><line x1="12" y1="7" x2="12" y2="13" /><line x1="12" y1="17" x2="12" y2="17" /></svg>;
  }
  // info
  return <svg {...p}><line x1="12" y1="11" x2="12" y2="16" /><line x1="12" y1="8" x2="12" y2="8" /></svg>;
}

export default function ToastViewport() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="gz-toast-viewport" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`gz-toast ${t.type === 'error' ? 'gz-toast--error' : ''}`}
        >
          <span className="gz-toast-icon">
            <ToastIcon type={t.type} />
          </span>
          <p className="gz-toast-msg">{t.message}</p>
          <button
            type="button"
            aria-label="Dismiss notification"
            className="gz-toast-close"
            onClick={() => dismissToast(t.id)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}

      <style jsx>{`
        .gz-toast-viewport {
          position: fixed;
          top: 1.25rem;
          right: 1.25rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.625rem;
          max-width: min(360px, calc(100vw - 2rem));
          pointer-events: none;
        }
        .gz-toast {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.75rem 0.875rem;
          background: #ffffff;
          color: #111111;
          border: 1px solid #e2e2e2;
          border-left: 3px solid #111111;
          border-radius: 0;
          box-shadow: 0 12px 40px -16px rgba(0, 0, 0, 0.22);
          font-family: 'Inter', system-ui, sans-serif;
          animation: gz-toast-in 0.26s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .gz-toast--error {
          background: #111111;
          color: #ffffff;
          border-color: #111111;
          border-left-color: #ffffff;
        }
        .gz-toast-icon {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.25rem;
          height: 1.25rem;
          border-radius: 0;
          background: #111111;
          color: #ffffff;
        }
        .gz-toast--error .gz-toast-icon {
          background: #ffffff;
          color: #111111;
        }
        .gz-toast-msg {
          flex: 1;
          margin: 0;
          font-size: 0.8125rem;
          font-weight: 500;
          line-height: 1.45;
        }
        .gz-toast-close {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 1.25rem;
          height: 1.25rem;
          padding: 0;
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
          opacity: 0.45;
          transition: opacity 0.15s ease;
        }
        .gz-toast-close:hover {
          opacity: 1;
        }
        @keyframes gz-toast-in {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @media (max-width: 480px) {
          .gz-toast-viewport {
            top: auto;
            bottom: 1rem;
            left: 1rem;
            right: 1rem;
            max-width: none;
          }
        }
      `}</style>
    </div>
  );
}
