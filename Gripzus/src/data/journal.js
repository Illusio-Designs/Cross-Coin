/* Journal posts — shared by the journal list, the home BlogStrip and the
   detail page. Routed by `slug`. Swap for an API later. */

export const JOURNAL_POSTS = [
  {
    slug: 'how-a-sock-should-hold-the-foot',
    author: 'Devang Mehta',
    title: 'How a sock should hold the foot',
    excerpt: 'The arch band, the cuff, the heel pocket — the three places a pair earns its day.',
    date: '12 Oct 2026',
    category: 'Craft notes',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=1400&q=85&auto=format&fit=crop',
    body: [
      'A sock has exactly three jobs, and most socks only do one of them. It has to hold the arch, sit at the cuff without biting, and pocket the heel so the whole thing does not rotate around the foot through the day. Get those three right and the sock disappears — which is the highest compliment a sock can earn.',
      'The arch band is where we spend the most time. Too loose and the sock sags into the shoe; too tight and it leaves a mark and cuts circulation. We knit a low-stretch band — firm enough to wake the foot up, soft enough that you forget it is there by mid-morning.',
      'The cuff is a quieter problem. A ribbed cuff has to grip the calf without the elastic-welt feeling that ruins most socks by year one. We use a 1×1 rib with a long-staple cotton core, so it holds shape past wash fifty.',
      'And the heel pocket — the part nobody thinks about — is hand-linked so there is no seam ridge under the foot. It is slower to make and it is the first thing returning customers mention.',
    ],
  },
  {
    slug: 'the-merino-edit-field-tested',
    author: 'Anika Sharma',
    title: 'The Merino edit, field-tested',
    excerpt: 'Three weeks of testing the new merino-tencel blend through Himalayan trails and Mumbai monsoons.',
    date: '28 Sep 2026',
    category: 'Field test',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1577538928305-3807c3993047?w=1400&q=85&auto=format&fit=crop',
    body: [
      'We do not release a fibre until it has had a hard season. The merino-tencel blend spent three weeks split between a Himalayan trek and the tail end of the Mumbai monsoon — about as wide a temperature and humidity range as India offers.',
      'Merino regulates temperature naturally: warm when it is dry, cool when it is damp. The tencel adds a smoothness merino alone does not have, and helps the pair dry faster overnight on the trail.',
      'After three weeks the verdict was simple — the pair came back the same shape it left in, and never once felt sweaty. That is the whole brief.',
    ],
  },
  {
    slug: 'why-we-knit-in-small-batches',
    author: 'Devang Mehta',
    title: 'Why we knit in small batches',
    excerpt: 'Why we make 500 pairs at a time instead of 50,000 — and what that means for what you wear.',
    date: '14 Sep 2026',
    category: 'Atelier',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=1400&q=85&auto=format&fit=crop',
    body: [
      'A run of 500 pairs fits in one room. We can see all of it, inspect all of it, and fix a problem before it becomes 50,000 problems. That is the entire argument for small batches.',
      'It also means we can change a pair between runs. If the cuff on this run sat a millimetre too high, the next run is corrected. Big factories cannot do that — they are committed to a year of the same mistake.',
      'The trade-off is that pairs sell out. We think that is a fair price for getting every run a little better than the last.',
    ],
  },
  {
    slug: 'combed-twice-combed-mercerised',
    author: 'Ravi Iyer',
    title: 'Combed, twice combed, mercerised',
    excerpt: 'A short glossary for the cotton on your skin — why what the label says actually matters.',
    date: '02 Sep 2026',
    category: 'Materials',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1542219550-37153d387c27?w=1400&q=85&auto=format&fit=crop',
    body: [
      'Cotton labels are full of words that sound like marketing and are actually specifications. Here is the short version.',
      'Combed cotton has had its short fibres removed, so it pills less and feels smoother. Twice-combed goes through that process again — fewer stray fibres, a cleaner yarn, a longer life.',
      'Mercerised cotton has been treated under tension so the fibre takes dye more deeply and holds colour far longer. It is why a good dress sock still looks sharp after a year of washing.',
    ],
  },
  {
    slug: 'the-dress-sock-reimagined',
    author: 'Anika Sharma',
    title: 'The dress sock, reimagined',
    excerpt: 'Hidden seams, no ridges. A modern dress sock should disappear once it is on.',
    date: '19 Aug 2026',
    category: 'Design',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1589810635657-232948472d98?w=1400&q=85&auto=format&fit=crop',
    body: [
      'The dress sock is the hardest pair to get right because it has to be invisible. Any flaw — a seam, a sag, a slip — is amplified by a formal shoe.',
      'We hide the toe seam entirely with hand-linking, knit a firmer arch so the pair never pools at the ankle, and keep the cuff tall enough that no skin shows when you sit.',
      'It is a quiet kind of design. Done right, nobody notices the sock at all — and that is exactly the point.',
    ],
  },
];

export function getPost(slug) {
  return JOURNAL_POSTS.find((p) => p.slug === slug) || null;
}
