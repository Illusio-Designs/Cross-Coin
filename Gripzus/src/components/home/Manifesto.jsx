import Link from 'next/link';

/* Manifesto — a full-bleed statement band in the deep-ink colour, set in
   oversized display type. The one loud, unmissable editorial beat on the home
   page: a considered pause between the shop rows. */

export default function Manifesto() {
  return (
    <section className="gz-manifesto">
      <div className="wrap">
        <p className="gz-manifesto-eyebrow">The Gripzus standard</p>
        <h2 className="gz-manifesto-title">
          A sock should be allowed to be a <span>considered</span> object.
        </h2>
        <div className="gz-manifesto-foot">
          <p className="gz-manifesto-note">
            Five hundred pairs a run. Hand-linked at the toe. Knit from yarns we
            have known by name for years — then knit again, slowly, only when they sell out.
          </p>
          <Link href="/about" className="gz-manifesto-link">
            Read the making <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
