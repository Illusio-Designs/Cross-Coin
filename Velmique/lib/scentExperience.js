import { noteKey } from './api/products';

const phaseKey = (value) => noteKey(String(value ?? '').replace(/[_-]+/g, ' '));
export const isScentExperienceAttribute = (key) => ['the scent experience', 'scent experience'].includes(phaseKey(key));

const PHASES = [
  { key: 'Top', label: 'First Impression', time: '0–15 min', icon: 'leaf', aliases: ['opening', 'top'] },
  { key: 'Heart', label: 'Scent Character', time: '15 min–4 hr', icon: 'sparkles', aliases: ['heart', 'middle'] },
  { key: 'Base', label: 'Lingering Impression', time: '4 hr+', icon: 'hourglass', aliases: ['dry down', 'base'] },
];

const HALVA = {
  Top: {
    notes: ['Strawberry'],
    title: 'Fruity & Playful',
    description: 'A juicy burst of strawberry with a bright, fresh sweetness.',
  },
  Heart: {
    notes: ['Vanilla', 'Almond'],
    title: 'Creamy & Indulgent',
    description: 'Creamy vanilla and nutty almond add a rich, inviting sweetness.',
  },
  Base: {
    notes: ['Peru Balsam', 'Musk'],
    title: 'Warm & Lasting',
    description: 'Deep balsamic warmth layered with soft musk.',
    time: '4–8 hr',
  },
};

export function buildScentExperience({ slug, tiers, notes, attrImages }) {
  const groupKey = Object.keys(attrImages).find(isScentExperienceAttribute);
  const photos = Object.entries(attrImages[groupKey] || {}).filter(([, image]) => typeof image === 'string' && image.trim());
  const byName = new Map(notes.map((note) => [noteKey(note.name), note]));
  const used = new Set();
  const fragranceNotes = [];
  const phases = PHASES.flatMap(({ aliases, ...phase }) => {
    const copy = slug === 'halva' ? HALVA[phase.key] : null;
    const names = [phaseKey(phase.label), ...aliases];
    const uploaded = photos.find(([title]) => names.includes(phaseKey(title)))?.[1].trim();
    const tier = tiers.find(({ label }) => label === phase.key);
    const items = (tier?.items.length ? tier.items : (copy?.notes || []).map((name) => byName.get(noteKey(name))).filter(Boolean))
      .filter(({ name }) => {
        const key = noteKey(name);
        if (used.has(key)) return false;
        used.add(key);
        return true;
      });
    if (!items.length && !uploaded) return [];
    const matchesCopy = copy?.notes.every((name) => items.some((item) => noteKey(item.name) === noteKey(name)));
    fragranceNotes.push(...items);
    return [{
      ...phase,
      time: matchesCopy && copy.time ? copy.time : phase.time,
      title: matchesCopy ? copy.title : phase.label,
      description: matchesCopy ? copy.description : '',
      image: uploaded || items.find((item) => item.image)?.image || '',
    }];
  });
  fragranceNotes.push(...[...byName].filter(([key]) => !used.has(key)).map(([, note]) => note));
  return { phases, fragranceNotes };
}
