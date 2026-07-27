/* Static, presentational site content for the Velquira storefront.
 *
 * This is NOT product/catalog data — it is fixed marketing copy that is part
 * of the page design (hero trust badges, the craftsmanship feature grid). All
 * commerce data (products, reviews, blogs, categories) comes live from the
 * backend via lib/api.js.
 */

export const heroFeatures = [
  { icon: 'Truck', title: 'Free insured shipping', sub: 'fully insured, tracked' },
  { icon: 'ShieldCheck', title: 'Hallmarked gold', sub: '916 BIS certified' },
  { icon: 'Heart', title: 'Lifetime care', sub: 'free cleaning & polish' },
];

export const technologies = [
  { icon: 'ShieldCheck', name: 'HALLMARKED GOLD', text: '916 BIS-certified purity you can trust' },
  { icon: 'Sparkles', name: 'HANDCRAFTED', text: 'Finished by master artisans in Morbi' },
  { icon: 'Gauge', name: 'CERTIFIED STONES', text: 'Conflict-free, lab-certified gemstones' },
  { icon: 'Heart', name: 'LIFETIME CARE', text: 'Complimentary cleaning & polishing' },
  { icon: 'RefreshCw', name: 'EASY EXCHANGE', text: '15-day exchange on unworn pieces' },
  { icon: 'Leaf', name: 'RESPONSIBLE', text: 'Recycled gold, ethically sourced' },
];
