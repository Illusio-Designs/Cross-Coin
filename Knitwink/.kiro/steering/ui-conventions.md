---
inclusion: always
---

# UI Conventions — Allbirds Design System

## Philosophy
Clean white canvas. Maximum breathing room. Product photography as the hero.
Sustainability as a design element, not an afterthought.
**When in doubt — add whitespace, remove elements.**

---

## Color Tokens (styles/globals.css)
```css
:root {
  --color-white:       #ffffff;
  --color-off-white:   #f7f5f0;   /* page bg tint */
  --color-black:       #1a1a1a;   /* headings, strong text */
  --color-gray-100:    #f2f0eb;
  --color-gray-200:    #e5e2da;   /* dividers */
  --color-gray-400:    #bebab0;   /* disabled */
  --color-gray-600:    #7a776e;   /* secondary text */
  --color-gray-800:    #3d3b36;   /* body text */
  --color-sage:        #7b9e87;   /* primary CTA */
  --color-sage-dark:   #5c7a68;   /* sage hover */
  --color-sage-light:  #a8c4b0;
  --color-earth:       #c4956a;   /* warm accent */
  --color-error:       #c0392b;
  --color-success:     #27ae60;
}
```

---

## Typography
| Use | Size | Weight | Notes |
|---|---|---|---|
| Hero headline | 56–80px | 400 | `font-display`, `tracking-tight` |
| Section heading | 32–40px | 500 | `font-sans` |
| Product name (card) | 14px | 400 | `text-gray-800` |
| Price | 14px | 500 | `text-brand-black` |
| Body | 16px | 400 | `leading-relaxed text-gray-800` |
| Label / badge | 11px | 500 | `uppercase tracking-widest` |
| Button text | 14px | 500 | `uppercase tracking-wider` |
| Nav link | 14px | 400 | `uppercase tracking-wider` |

- Never `font-weight: 700` — too heavy
- Never `#000000` — always `--color-black` (#1a1a1a)

---

## Buttons — always `rounded-full`
```
Primary   → bg-sage text-white px-8 py-3.5 text-sm font-medium uppercase tracking-wider rounded-full hover:bg-sage-dark
Secondary → border border-brand-black text-brand-black px-8 py-3.5 same sizing rounded-full hover:bg-gray-100
Ghost     → text-brand-black text-sm underline underline-offset-4 hover:text-sage
```
Focus ring on all: `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage`

---

## Product Card
```
┌────────────────────────┐
│     PRODUCT IMAGE      │  aspect-ratio 4/5 mobile, 3/4 desktop
│     hover → image 2    │  framer-motion opacity crossfade 200ms
│  [Badge top-left]      │  11px uppercase pill
└────────────────────────┘
● ● ● ○                     color swatches 16px circles, active has 2px ring
Product Name                14px weight-400 text-gray-800 truncate
4 colors                    12px text-gray-600
₹8,999                      14px weight-500 text-brand-black
```
- White background, no border, no shadow
- Hover: image crossfade + `translate-y-[-2px]` lift

---

## Spacing & Layout
```
Page max-width:  1440px centered
Horizontal pad:  px-6 → md:px-10 → lg:px-16
Product grid:    grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6
Section rhythm:  py-16 md:py-24 lg:py-32
PDP layout:      grid-cols-1 lg:grid-cols-2 (gallery left, info right)
```

---

## Navbar
```
AnnouncementBar  h-10 bg-off-white text-xs centered border-b border-gray-200
Navbar           h-16 bg-white border-b border-gray-200 sticky top-0 z-50
MegaMenu         full-width bg-white py-10 shadow-lg, opens on hover desktop
MobileMenu       full-height slide from left bg-white
```

---

## PDP Info Column
```
Collection name   12px uppercase text-gray-600
Product name      28px font-display weight-400
Price             18px weight-500
Color selector    label + 24px swatch circles, active = 2px sage ring
Size selector     pill buttons — inactive: border outline / active: black fill
[Add to Cart]     primary button full width
[Carbon Badge]    leaf icon + "X.Xkg CO₂e" — bg-gray-100 11px uppercase pill
Short description 16px text-gray-800 leading-relaxed
Feature icons     4 icons row — icon 24px + 11px label below
```

---

## Feature Breakdown Section (below PDP fold)
```
grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8
Each item: [lucide icon 32px text-sage] [title 14px weight-500] [desc 14px text-gray-600]
Border-t border-gray-200 pt-12 mt-12 above section
```

---

## Sticky ATC Bar
- Appears when main ATC button scrolls out of view (IntersectionObserver)
- `fixed bottom-0 left-0 right-0 z-50 h-16 bg-white border-t border-gray-200`
- Layout: `[Product name + color] ··· [Size pill] [Add to Cart]`
- Entrance: `framer-motion` slide up from y:64 → y:0, 200ms ease-out

---

## Cart Drawer
- `w-full max-w-md` slide from right
- Backdrop: `fixed inset-0 bg-black/40` click to close
- `framer-motion` x: 100% → 0, 250ms ease-out
- Focus trapped, Escape closes, `aria-modal="true"`

---

## Animation Rules
- Hover transitions: 150ms ease-out
- Drawer/modal enter: 200–250ms ease-out
- Page fade: 300ms ease-out
- No scroll-triggered text animations
- No parallax
- No auto-playing carousels

---

## Accessibility
- All interactive: `focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage`
- Color swatches: `role="radio"` `aria-label="Color name"` `aria-checked`
- Size buttons: `aria-pressed`
- All product images: descriptive `alt` — never `alt=""`

---

## Never Do
- ❌ Gradients
- ❌ Box shadows on cards
- ❌ Auto-playing carousels
- ❌ Pop-ups / exit-intent modals
- ❌ Fake urgency ("Only 3 left!")
- ❌ Dark mode
- ❌ Raw `<img>` — always `next/image`
- ❌ Inline `style={{}}` objects
- ❌ Hardcoded colors outside CSS variables
- ❌ Any backend / API logic in this repo
