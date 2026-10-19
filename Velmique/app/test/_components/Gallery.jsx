'use client';

import { useState } from 'react';

export default function Gallery({ images = [], name = '' }) {
  const list = images.length ? images : [''];
  const [active, setActive] = useState(0);
  const main = list[Math.min(active, list.length - 1)];

  return (
    <div className="m-gallery">
      <div className="m-gthumbs">
        {list.slice(0, 7).map((src, i) => (
          <button
            key={i}
            type="button"
            className={`m-gthumb ${i === active ? 'on' : ''}`}
            aria-label={`View image ${i + 1}`}
            onClick={() => setActive(i)}
          >
            {src ? <img src={src} alt={`${name} ${i + 1}`} loading="lazy" /> : null}
          </button>
        ))}
      </div>
      <div className="m-gmain">
        {main ? <img src={main} alt={name} /> : null}
      </div>
    </div>
  );
}
