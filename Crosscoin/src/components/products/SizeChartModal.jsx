import React from 'react';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { SIZE_GUIDE } from '../../lib/sizeGuide';

// Size chart dialog. Rows come from lib/sizeGuide.js (shared socks standard);
// the PDP only offers the link when there are rows, so this never renders empty.
const SizeChartModal = ({ onClose }) => {
  const trapRef = useFocusTrap(true, { onEscape: onClose });
  return (
    <div className="sc-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Size Chart">
      <div className="sc-modal" ref={trapRef} onClick={e => e.stopPropagation()}>
        <div className="sc-header">
          <h2 className="sc-title">Size Chart</h2>
          <button className="sc-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {SIZE_GUIDE.note && <p className="sc-note">{SIZE_GUIDE.note}</p>}

        <div className="sc-table-wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Fits</th>
                <th>Foot Length</th>
              </tr>
            </thead>
            <tbody>
              {SIZE_GUIDE.rows.map((r) => (
                <tr key={r.size}>
                  <td className="sc-size-cell">{r.size}</td>
                  <td>{r.fits}</td>
                  <td>{r.foot}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {SIZE_GUIDE.tip && (
          <p className="sc-tip">
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            {SIZE_GUIDE.tip}
          </p>
        )}
      </div>
    </div>
  );
};

export default SizeChartModal;
