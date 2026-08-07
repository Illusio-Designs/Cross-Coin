import React from 'react';

/**
 * Obzus toast content — monochrome card, soft colour icon chip, no accent bar /
 * no progress bar. Rendered inside react-toastify; themed via --ds tokens so it
 * follows the dashboard light/dark theme automatically. react-toastify passes
 * `closeToast` to custom content, which powers the × button.
 */
const TITLES = { success: 'Success', error: 'Error', info: 'Information', warning: 'Warning' };

const Icon = ({ type }) => {
  const p = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (type) {
    case 'success': return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5 11 15l4.5-5" /></svg>);
    case 'error':   return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 16h.01" /></svg>);
    case 'warning': return (<svg {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>);
    default:        return (<svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5" /><path d="M12 8h.01" /></svg>);
  }
};

export default function ToastMessage({ type = 'info', title, message, closeToast }) {
  return (
    <div className={`obz-toast obz-toast--${type}`}>
      <span className="obz-toast__chip"><Icon type={type} /></span>
      <div className="obz-toast__body">
        <div className="obz-toast__title">{title || TITLES[type]}</div>
        {message ? <div className="obz-toast__msg">{message}</div> : null}
      </div>
      <button type="button" className="obz-toast__x" onClick={closeToast} aria-label="Dismiss">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}
