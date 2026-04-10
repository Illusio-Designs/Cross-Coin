// Comprehensive color name → hex map (sourced from Crosscoin colorMap)
const colorMap: Record<string, string> = {
  red: '#FF0000', black: '#000000', blue: '#0000FF', white: '#FFFFFF',
  grey: '#808080', gray: '#808080', pink: '#FFC0CB', green: '#008000',
  yellow: '#FFFF00', orange: '#FFA500', purple: '#800080', brown: '#A52A2A',
  beige: '#F5F5DC', maroon: '#800000', olive: '#808000', teal: '#008080',
  cyan: '#00FFFF', magenta: '#FF00FF', navy: '#000080', gold: '#FFD700',
  silver: '#C0C0C0', bronze: '#CD7F32', lavender: '#DFC5FE', ivory: '#FFFFF0',
  peach: '#FFE5B4', coral: '#FF7F50', turquoise: '#40E0D0', aqua: '#00FFFF',
  cream: '#FFFDD0', khaki: '#F0E68C', plum: '#DDA0DD', wine: '#722F37',
  charcoal: '#36454F', sand: '#C2B280', stone: '#837060',
  'pastel pink': '#FFD1DC', 'pastel blue': '#AEC6CF', 'pastel green': '#77DD77',
  'pastel yellow': '#FFFACD', 'pastel purple': '#B39EB5', 'pastel orange': '#FFDAB9',
  'pastel red': '#FF6961', 'pastel teal': '#99FFCC', 'pastel lavender': '#E3E4FA',
  'metallic gold': '#D4AF37', 'metallic silver': '#BCC6CC', 'metallic bronze': '#B08D57',
  'metallic copper': '#B87333', 'neon green': '#39FF14', 'neon pink': '#FF6EC7',
  'neon blue': '#1B03A3', 'neon yellow': '#FFFF33', 'neon orange': '#FF6700',
  'neon purple': '#B026FF', 'baby pink': '#FFC1CC', 'navy blue': '#000080',
  'sky blue': '#87CEEB', 'royal blue': '#4169E1', 'medium blue': '#0000CD',
  'mint green': '#98FF98', 'lime green': '#CCEE00', 'mustard yellow': '#FFCE1B',
  'forest green': '#228B22', 'charcoal grey': '#36454F', 'off white': '#FAF9F6',
  'rose gold': '#B76E79', 'champagne': '#F7E7CE', 'teal blue': '#008080',
  'lemon yellow': '#FFF700', 'ocean teal': '#006994', 'steel grey': '#43464B',
  'charcoal black': '#222222', 'light grey': '#D3D3D3', 'dark grey': '#2E2E2E',
  'teal green': '#008080', 'steel blue': '#4682B4', 'classic black': '#0A0A0A',
  'ivory beige': '#F6E2B3', 'jet black': '#0A0A0A', 'cloud grey': '#BFC9CA',
  'ash grey': '#B2BEB5', 'graphite grey': '#474A51', 'midnight black': '#191970',
  'storm grey': '#71797E', 'deep navy': '#0B0C10', 'dark green': '#013220',
  'blush pink': '#F9C6C3', 'aqua teal': '#00BFAE', 'vanilla cream': '#F3E5AB',
  'biscoff': '#C68642', 'olive green': '#708238', 'crimson red': '#DC143C',
  'slate blue': '#6A5ACD', 'light heather blue': '#B0C4DE', 'ocean blue': '#006994',
  'ice blue': '#D6EAF8', 'dusty blue': '#7393B3', 'dark gray': '#404040',
}

export function getColorHex(name: string): string {
  const key = name.toLowerCase().trim()
  // If already a hex value, return as-is
  if (/^#[0-9a-f]{3,6}$/i.test(key)) return key
  return colorMap[key] ?? name
}

export default colorMap
