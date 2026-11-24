import { noteKey } from './api/products';
import { scentExperienceCopy } from './scentExperienceCopy';

const phaseKey = (value) => noteKey(String(value ?? '').replace(/[_-]+/g, ' '));
export const isScentExperienceAttribute = (key) => ['the scent experience', 'scent experience'].includes(phaseKey(key));

const PHASES = [
  { key: 'Top', label: 'First Impression', time: '0–15 min', icon: 'leaf', aliases: ['opening', 'top'], caption: 'The opening notes introduce the fragrance.' },
  { key: 'Heart', label: 'Scent Character', time: '15 min–4 hr', icon: 'sparkles', aliases: ['heart', 'middle'], caption: 'The heart notes develop as the opening settles.' },
  { key: 'Base', label: 'Lingering Impression', time: '4 hr+', icon: 'hourglass', aliases: ['dry down', 'base'], caption: 'The base notes remain as the fragrance dries down.' },
];

const listNotes = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

function matchNote(name) {
  const key = noteKey(name);
  return key === 'venilla' ? 'vanilla' : key;
}

export function buildScentExperience({ slug, tiers, notes, attrImages }) {
  const groupKey = Object.keys(attrImages).find(isScentExperienceAttribute);
  const photos = Object.entries(attrImages[groupKey] || {}).filter(([, image]) => typeof image === 'string' && image.trim());
  const byName = new Map(notes.map((note) => [matchNote(note.name), note]));
  const fragranceNotes = new Map();
  const phases = PHASES.flatMap(({ aliases, caption, ...phase }) => {
    const copy = scentExperienceCopy[slug]?.[phase.key];
    const names = [phaseKey(phase.label), ...aliases];
    const uploaded = photos.find(([title]) => names.includes(phaseKey(title)))?.[1].trim();
    const tier = tiers.find(({ label }) => label === phase.key);
    const items = tier?.items.length ? tier.items : (copy?.notes || []).map((name) => byName.get(matchNote(name))).filter(Boolean);
    if (!items.length && !uploaded) return [];

    const keys = items.map(({ name }) => matchNote(name));
    const matchesCopy = copy && copy.notes.every((name) => keys.includes(matchNote(name)));
    for (const item of items) fragranceNotes.set(matchNote(item.name), item);
    const noteNames = keys.map((key, index) => key === 'vanilla' ? 'Vanilla' : items[index].name);
    return [{
      ...phase,
      time: (matchesCopy && copy.time) || phase.time,
      title: matchesCopy ? copy.title : phase.label,
      description: matchesCopy ? copy.description : noteNames.length ? `${caption} Featuring ${listNotes.format(noteNames)}.` : caption,
      image: uploaded || items.find((item) => item.image)?.image || '',
      artwork: Boolean(uploaded),
    }];
  });
  for (const [key, note] of byName) if (!fragranceNotes.has(key)) fragranceNotes.set(key, note);
  return { phases, fragranceNotes: [...fragranceNotes.values()] };
}
