/* Vibrant, square attribute-tag palette for Velmique product chips.
   Keys match the admin Dashboard's colour select; each maps to a solid
   background + readable dark text. Fixed on both light/dark themes (these
   are intrinsic category colours, like semantic badges). */
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

export function tagStyle(color) {
  const c = TAG_COLORS[color] || TAG_COLORS.blue;
  return { backgroundColor: c.bg, color: c.fg };
}
