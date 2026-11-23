'use client';

import { useState } from 'react';
import NotePhoto from './NotePhoto';

const PHASES = [
  { key: 'Top', label: 'Opening', time: '0–15 min' },
  { key: 'Heart', label: 'Heart', time: '15 min–4 hr' },
  { key: 'Base', label: 'Dry Down', time: '4 hr+' },
];

export default function ScentExperience({ name, tiers = [], notes = [], accords = [], spec = [] }) {
  const [active, setActive] = useState('Top');
  const phases = PHASES.flatMap((phase) => {
    const tier = tiers.find(({ label }) => label === phase.key);
    return tier ? [{ ...phase, items: tier.items }] : [];
  });
  const phase = phases.find(({ key }) => key === active) || phases[0];
  const picture = (phase?.items || notes).find(({ image }) => image);
  const groupedNames = new Set(tiers.flatMap(({ items }) => items.map(({ name }) => name.toLowerCase())));
  const ungrouped = notes.filter(({ name }) => !groupedNames.has(name.toLowerCase()));

  return (
    <div className="v-scent-story">
      <section className="v-detail-section">
        <h2>The Scent Experience</h2>
        <p className="v-detail-caption">
          {phase ? `Discover how ${name} unfolds over time.` : `Discover the character of ${name}.`}
        </p>
        {phase && (
          <div className="v-phase-tabs" aria-label="Fragrance development">
            {phases.map(({ key, label, time }) => (
              <button type="button" aria-pressed={phase.key === key} key={key} onClick={() => setActive(key)}>
                {label}<small>({time})</small>
              </button>
            ))}
          </div>
        )}
        <div className="v-phase-content" aria-live="polite">
          {picture && <NotePhoto image={picture.image} alt={picture.name} width={500} />}
          <div>
            <h3>{phase ? phase.items.map((note) => note.name).join(' · ') : accords.slice(0, 3).join(' · ') || name}</h3>
            <p>{phase ? `${phase.label} notes` : 'Explore the fragrance notes below.'}</p>
          </div>
        </div>
      </section>

      {(tiers.length > 0 || notes.length > 0) && (
        <section className="v-detail-section">
          <h2>Fragrance Notes</h2>
          <div className="v-note-cards">
            {tiers.map(({ label, items }) => (
              <div className="v-note-card v-note-card--tier" key={label}>
                <b>{label} Notes</b>
                <ul className="v-note-items">
                  {items.map((note) => (
                    <li key={note.name}>
                      <NotePhoto image={note.image} width={128} />
                      <span>{note.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {ungrouped.map((note) => (
              <div className="v-note-card" key={`note-${note.name}`}>
                <NotePhoto image={note.image} width={128} />
                <b>{note.name}</b>
              </div>
            ))}
          </div>
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
