/* Marquee — a slow editorial ticker of the brand's making-notes, set in the
   display face between hairline rules. A quiet premium device: it reads as a
   considered detail, not decoration. Pauses on hover; still for reduced-motion. */

const PHRASES = [
  'Hand-linked toes',
  'Small-batch knit',
  'Made in Morbi',
  'Low-stretch arch',
  'Known yarns only',
  'Finished by hand',
];

export default function Marquee() {
  // Duplicate the run so the loop is seamless.
  const run = [...PHRASES, ...PHRASES];
  return (
    <section className="gz-marquee" aria-hidden="true">
      <div className="gz-marquee-track">
        {run.map((p, i) => (
          <span className="gz-marquee-item" key={i}>
            {p}
            <span className="gz-marquee-star">✳</span>
          </span>
        ))}
      </div>
    </section>
  );
}
