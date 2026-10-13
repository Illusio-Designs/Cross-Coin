import Icon from '@/components/Icon';

// "How it helps" — the real, responsibly-framed benefits of toe-alignment socks.
// Framed as wellness/comfort ("designed to / helps / can"), NOT medical promises,
// with a podiatrist caveat. Morbix sells only the toe-alignment sock, so this
// replaces the generic "technology" grid with how the product actually helps.
const BENEFITS = [
  { icon: 'Move',     title: 'Designed to realign your toes', text: 'Soft knit zones ease your toes back toward their natural splay after hours cramped in narrow shoes.' },
  { icon: 'Leaf',     title: 'Eases cramped-toe tension',     text: 'Welcome relief for toes squeezed by tight footwear — a favourite for easing bunion and hammertoe discomfort.' },
  { icon: 'Activity', title: 'Steadier balance & posture',    text: 'A wider toe spread gives a wider base of support, which can help balance, gait and posture.' },
  { icon: 'Heart',    title: 'Supports circulation',          text: 'Gently separating and stretching the toes helps blood move freely through the forefoot.' },
  { icon: 'Dumbbell', title: 'Wakes up foot muscles',         text: 'Encourages the small muscles of the foot and lower leg to work in their natural, splayed position.' },
  { icon: 'Wind',     title: 'All-day comfort knit',          text: 'Breathable, cushioned cotton-blend knit made for easy recovery and relaxation at home.' },
];

export default function Technologies() {
  return (
    <section className="section container">
      <div className="section-head section-head-center">
        <div>
          <span className="section-eyebrow">Wellness</span>
          <h2>How toe-alignment socks help</h2>
          <p className="section-sub">Hours in narrow shoes crowd your toes together. Morbix gently works them back the other way — a little at a time.</p>
        </div>
      </div>
      <div className="tech-grid">
        {BENEFITS.map((b) => (
          <div className="tech" key={b.title}>
            <span className="ic"><Icon name={b.icon} size={22} /></span>
            <b>{b.title}</b>
            <span>{b.text}</span>
          </div>
        ))}
      </div>
      <div className="howit-note">
        <p><b>New to alignment socks?</b> Ease in with 10–15 minutes while you relax or right after a workout, then build up gradually as your feet adjust.</p>
        <span className="howit-caveat">A comfort-wellness product, not a medical device — see a podiatrist for persistent foot pain.</span>
      </div>
    </section>
  );
}
