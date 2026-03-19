import React from 'react';

const sizeData = [
  { size: 'XS', chest: '32–34', waist: '26–28', hip: '34–36', length: '26' },
  { size: 'S',  chest: '34–36', waist: '28–30', hip: '36–38', length: '27' },
  { size: 'M',  chest: '36–38', waist: '30–32', hip: '38–40', length: '28' },
  { size: 'L',  chest: '38–40', waist: '32–34', hip: '40–42', length: '29' },
  { size: 'XL', chest: '40–42', waist: '34–36', hip: '42–44', length: '30' },
  { size: 'XXL',chest: '42–44', waist: '36–38', hip: '44–46', length: '31' },
];

const SizeChartModal = ({ onClose }) => (
  <div className="sc-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label="Size Chart">
    <div className="sc-modal" onClick={e => e.stopPropagation()}>
      <div className="sc-header">
        <h2 className="sc-title">Size Chart</h2>
        <button className="sc-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <p className="sc-note">All measurements are in inches. For best fit, measure over undergarments.</p>

      {/* How to measure */}
      <div className="sc-measure-row">
        {[
          { label: 'Chest', desc: 'Measure around the fullest part of your chest, keeping the tape horizontal.' },
          { label: 'Waist', desc: 'Measure around your natural waistline, just above the hip bone.' },
          { label: 'Hip',   desc: 'Measure around the fullest part of your hips and seat.' },
        ].map(m => (
          <div key={m.label} className="sc-measure-item">
            <span className="sc-measure-label">{m.label}</span>
            <span className="sc-measure-desc">{m.desc}</span>
          </div>
        ))}
      </div>

      {/* Size table */}
      <div className="sc-table-wrap">
        <table className="sc-table">
          <thead>
            <tr>
              <th>Size</th>
              <th>Chest (in)</th>
              <th>Waist (in)</th>
              <th>Hip (in)</th>
              <th>Length (in)</th>
            </tr>
          </thead>
          <tbody>
            {sizeData.map(row => (
              <tr key={row.size}>
                <td className="sc-size-cell">{row.size}</td>
                <td>{row.chest}</td>
                <td>{row.waist}</td>
                <td>{row.hip}</td>
                <td>{row.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="sc-tip">
        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        If you're between sizes, we recommend sizing up for a comfortable fit.
      </p>
    </div>
  </div>
);

export default SizeChartModal;
