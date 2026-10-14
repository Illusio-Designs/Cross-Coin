/* Vibrant, square attribute-tag palette for Velmique product chips.
   Tags are derived from the product's existing variation attributes (gender,
   longevity, projection, …) — not a separate field. Each attribute KEY maps to
   a vibrant colour so the chips stay colourful while reusing real attribute
   data. Colours are fixed on both light/dark themes (intrinsic category hues). */
export const TAG_COLORS = {
  blue:   { bg: '#BBD9F7', fg: '#123C66' },
  coral:  { bg: '#F0604E', fg: '#3A0C04' },
  amber:  { bg: '#F6B93B', fg: '#4A3410' },
  green:  { bg: '#BFE6C8', fg: '#1C4A2B' },
  purple: { bg: '#D9CBF2', fg: '#3C2A63' },
  pink:   { bg: '#F7CFE0', fg: '#6E2246' },
  teal:   { bg: '#BFE6E2', fg: '#194E48' },
  gold:   { bg: '#E7D5A8', fg: '#5A4714' },
};

// Known fragrance-descriptor attributes → a fixed vibrant colour, matching the
// reference (gender=blue, longevity=coral, projection=amber).
export const ATTR_KEY_COLORS = {
  gender:        'blue',
  longevity:     'coral',
  lasting:       'coral',
  projection:    'amber',
  sillage:       'green',
  concentration: 'purple',
  intensity:     'coral',
  occasion:      'teal',
  season:        'pink',
  family:        'gold',
  character:     'gold',
};

// Functional selector attributes that pick a variant — never shown as chips.
export const TAG_BLOCK_KEYS = new Set([
  'size', 'color', 'colour', 'material', 'pack', 'volume', 'weight', 'ml', 'quantity',
]);

const PALETTE = ['blue', 'coral', 'amber', 'green', 'purple', 'pink', 'teal', 'gold'];

// Colour for an attribute key: the fixed mapping when known, else a stable
// hash-picked palette colour so new descriptor attributes still look vibrant.
export function colorForAttrKey(key) {
  const k = String(key || '').toLowerCase();
  if (ATTR_KEY_COLORS[k]) return ATTR_KEY_COLORS[k];
  let h = 0;
  for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function tagStyle(color) {
  const c = TAG_COLORS[color] || TAG_COLORS.blue;
  return { backgroundColor: c.bg, color: c.fg };
}
