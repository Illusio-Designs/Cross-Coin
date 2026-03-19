import { useState, useEffect } from 'react';

// Randomise within a range, stable per session
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

export default function FomoBar({ stock = null }) {
  const [viewers, setViewers] = useState(() => rand(8, 24));
  const [soldToday, setSoldToday] = useState(() => rand(5, 30));
  const [pulse, setPulse] = useState(false);

  // Slowly fluctuate viewer count
  useEffect(() => {
    const id = setInterval(() => {
      setViewers(v => {
        const next = v + (Math.random() > 0.5 ? 1 : -1);
        return Math.max(5, Math.min(40, next));
      });
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    }, 7000);
    return () => clearInterval(id);
  }, []);

  const lowStock = stock !== null && stock <= 5;

  return (
    <div className="fomo-bar">
      {/* Viewers */}
      <div className="fomo-item">
        <span className={`fomo-dot${pulse ? ' pulse' : ''}`} />
        <span className="fomo-text">
          <strong>{viewers}</strong> people viewing this right now
        </span>
      </div>

      {/* Sold today */}
      <div className="fomo-item">
        <span className="fomo-icon">🔥</span>
        <span className="fomo-text">
          <strong>{soldToday}</strong> sold in the last 24 hours
        </span>
      </div>

      {/* Stock warning — only shown when stock is low */}
      {lowStock && (
        <div className="fomo-item fomo-stock">
          <span className="fomo-icon">⚡</span>
          <span className="fomo-text">
            Only <strong>{stock}</strong> left in stock — order soon!
          </span>
        </div>
      )}
    </div>
  );
}
