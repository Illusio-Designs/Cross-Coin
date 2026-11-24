'use client';

import { useId, useState } from 'react';
import BrandIcon from '@/components/ui/BrandIcon';
import NotePhoto from './NotePhoto';

export default function ScentExperience({ name, phases = [], accords = [], spec = [] }) {
  const id = useId();
  const [selected, setSelected] = useState(null);
  const activePhase = phases.find(({ key }) => key === selected) || phases[0];

  const handleTabKeyDown = (event, index) => {
    const count = phases.length;
    const nextIndex = {
      ArrowLeft: (index + count - 1) % count,
      ArrowRight: (index + 1) % count,
      Home: 0,
      End: count - 1,
    }[event.key];
    if (typeof nextIndex !== 'number') return;
    event.preventDefault();
    event.currentTarget.parentElement.children[nextIndex].focus();
    setSelected(phases[nextIndex].key);
  };

  const rotateImage = (event) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const image = event.currentTarget.querySelector('img');
    if (!image?.animate) return;
    image.getAnimations().forEach((animation) => animation.cancel());
    image.animate([
      { transform: 'perspective(900px) rotateY(0deg)' },
      { transform: 'perspective(900px) rotateY(360deg)' },
    ], { duration: 550, easing: 'ease-in-out' });
  };

  return (
    <div className="v-scent-story">
      {(activePhase || accords.length > 0) && (
        <section className="v-scent" aria-labelledby={`${id}-heading`}>
          <h2 id={`${id}-heading`}>The Scent Experience</h2>
          {activePhase && <p className="v-scent__intro">Discover how {name} unfolds over time.</p>}
          {!activePhase && accords.length > 0 && <p className="v-scent__intro">{accords.join(' · ')}</p>}
          {activePhase && (
            <>
              <div className="v-scent__phases" role="tablist" aria-label="Fragrance phases">
                {phases.map(({ key, label, time, icon }, index) => (
                  <button type="button" key={key} role="tab" id={`${id}-tab-${key}`}
                    aria-selected={activePhase.key === key} aria-controls={`${id}-phase`}
                    tabIndex={activePhase.key === key ? 0 : -1}
                    onClick={() => setSelected(key)} onKeyDown={(event) => handleTabKeyDown(event, index)}>
                    <BrandIcon name={icon} size={24} />
                    <span><b>{label}</b><small>({time})</small></span>
                  </button>
                ))}
              </div>
              <div className="v-scent__card" role="tabpanel" id={`${id}-phase`}
                aria-labelledby={`${id}-tab-${activePhase.key}`} tabIndex={0}>
                {activePhase.image && (
                  <button type="button" className="v-scent__image" aria-label={`Rotate ${activePhase.label} image`}
                    onClick={rotateImage}>
                    <NotePhoto key={activePhase.key} image={activePhase.image} width={600} />
                    <span><BrandIcon name="rotate" size={18} /></span>
                  </button>
                )}
                <div className="v-scent__body">
                  <h3>{activePhase.title}</h3>
                  {activePhase.description && <p>{activePhase.description}</p>}
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {spec.length > 0 && (
        <div className="v-detail-specs">
          {spec.map(([key, value]) => <div key={key}><b>{key}</b><span>{value}</span></div>)}
        </div>
      )}
    </div>
  );
}
