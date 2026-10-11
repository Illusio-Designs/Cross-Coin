'use client';

import { useEffect, useRef } from 'react';
import { SIZE_GUIDE } from '@/lib/sizeGuide';

// Size chart dialog. Rows come from lib/sizeGuide.js; the parent only offers the
// link when there are rows, so this never renders an empty chart.
export default function SizeChartModal({ onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    const prev = document.activeElement;
    closeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); prev?.focus?.(); };
  }, [onClose]);

  return (
    <div className="sc-overlay" role="dialog" aria-modal="true" aria-label="Size chart"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sc-modal">
        <div className="sc-head">
          <h2>Size chart</h2>
          <button type="button" ref={closeRef} className="sc-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        {SIZE_GUIDE.note && <p className="sc-note">{SIZE_GUIDE.note}</p>}
        <div className="sc-wrap">
          <table className="sc-table">
            <thead><tr><th>Size</th><th>Fits</th><th>Foot length</th></tr></thead>
            <tbody>
              {SIZE_GUIDE.rows.map((r) => (
                <tr key={r.size}><td className="sc-size">{r.size}</td><td>{r.fits}</td><td>{r.foot}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        {SIZE_GUIDE.tip && <p className="sc-tip">{SIZE_GUIDE.tip}</p>}
      </div>
    </div>
  );
}
