import React from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';

const SizeChartModal = ({ onClose }) => {
  const trapRef = useFocusTrap(true, { onEscape: onClose });
  return (
    <div className="sc-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Size Chart">
      <div className="sc-modal" ref={trapRef} onClick={e => e.stopPropagation()}>
        <div className="sc-header">
          <h2 className="sc-title">Size Chart</h2>
          <button className="sc-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="sc-note">Cross Coin® socks are <strong>Free Size</strong> — designed to fit most adults comfortably.</p>

        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Foot Length</th>
                <th>Fits</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="sc-size-cell">Free Size</td>
                <td>22 – 28 cm</td>
                <td>Men &amp; Women</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="sc-tip">
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Our socks use high-stretch fabric — they fit snugly even on larger feet.
        </p>
      </div>
    </div>
  );
};

export default SizeChartModal;
