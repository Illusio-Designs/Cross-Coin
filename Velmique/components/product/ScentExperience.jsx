'use client';

import { useId, useRef, useState } from 'react';
import BrandIcon from '@/components/ui/BrandIcon';
import NotePhoto from './NotePhoto';

export default function ScentExperience({ name, phases = [], fragranceNotes = [], accords = [], spec = [] }) {
  const id = useId();
  const [selected, setSelected] = useState(null);
  const cards = useRef(null);
  const active = selected || phases[0]?.key;
  const hasPhases = phases.length > 0;
  const hasNotes = fragranceNotes.length > 0;

  const selectPhase = (key, moveToCard = false) => {
    setSelected(key);
    const card = cards.current?.querySelector('#' + CSS.escape(`${id}-${key}`));
    if (!card) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (moveToCard && window.matchMedia('(max-width: 700px)').matches) {
      card.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'instant' : 'smooth' });
    }
    const image = card.querySelector('.v-scent__image img');
    if (!reduceMotion && image?.animate) {
      image.getAnimations().forEach((animation) => animation.cancel());
      image.animate([
        { transform: 'perspective(900px) rotateY(0deg)' },
        { transform: 'perspective(900px) rotateY(360deg)' },
      ], { duration: 550, easing: 'ease-in-out' });
    }
  };

  return (
    <div className="v-scent-story">
      {(hasPhases || hasNotes || accords.length > 0) && (
        <section className="v-scent" aria-labelledby={`${id}-heading`}>
          <h2 id={`${id}-heading`}>{hasPhases || !hasNotes ? 'The Scent Experience' : 'Fragrance Notes'}</h2>
          {hasPhases && <p className="v-scent__intro">Discover how {name} unfolds over time.</p>}
          {!hasPhases && accords.length > 0 && <p className="v-scent__intro">{accords.join(' · ')}</p>}
          {hasPhases && (
            <>
              <div className="v-scent__phases" role="group" aria-label="Fragrance phases">
                {phases.map(({ key, label, time, icon }) => (
                  <button type="button" key={key} aria-pressed={active === key} aria-controls={`${id}-${key}`}
                    onClick={() => selectPhase(key, true)}>
                    <BrandIcon name={icon} size={24} />
                    <span><b>{label}</b><small>({time})</small></span>
                  </button>
                ))}
              </div>
              <div className="v-scent__cards" ref={cards}>
                {phases.map(({ key, label, title, description, image }) => (
                  <article className="v-scent__card" id={`${id}-${key}`} key={key} data-active={active === key}>
                    {image && (
                      <button type="button" className="v-scent__image" aria-label={`Rotate ${label} image`}
                        onClick={() => selectPhase(key)}>
                        <NotePhoto image={image} alt="" width={600} />
                        <span aria-hidden="true">↻</span>
                      </button>
                    )}
                    <div className="v-scent__body">
                      <h3>{title}</h3>
                      {description && <p>{description}</p>}
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {hasNotes && (
            <div className="v-scent__gallery">
              {hasPhases && <h3 id={`${id}-notes`}>Fragrance Notes</h3>}
              <ul className="v-scent__notes" role="list" aria-labelledby={`${id}-${hasPhases ? 'notes' : 'heading'}`}>
                {fragranceNotes.map(({ name, image }) => (
                  <li key={name}>
                    <span className="v-scent__note-photo" aria-hidden="true">
                      <BrandIcon name="leaf" size={24} />
                      {image && <NotePhoto image={image} width={480} />}
                    </span>
                    <span className="v-scent__note-name">{name}</span>
                  </li>
                ))}
              </ul>
            </div>
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
