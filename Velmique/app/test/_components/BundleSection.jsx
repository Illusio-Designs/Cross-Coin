import Link from 'next/link';

export default function BundleSection({ tiers = [], images = [] }) {
  if (!tiers.length) return null;
  const offers = tiers.slice(0, 2);
  return (
    <section className="m-section m-bundles" aria-labelledby="m-bundle-title">
      <div className="m-wrap">
        <div className="m-shead">
          <span className="m-eyebrow">Your scents. Your signature.</span>
          <h2 id="m-bundle-title">Build Your <em>Bundle.</em></h2>
          <p>Pair your favourites, discover something new, and save together.</p>
        </div>
        <div className={`m-bundles__grid ${offers.length === 1 ? 'm-bundles__grid--single' : ''}`}>
          {offers.map((tier, index) => {
            const image = tier.image || images[index] || null;
            return (
              <Link href={`/test/pack?items=${tier.pairs}`} className={`m-bundle ${index === 1 ? 'm-bundle--light' : ''}`} key={tier.pairs}>
                {image && <img className="m-bundle__image" src={image} alt="" loading="lazy" />}
                <div className="m-bundle__shade" />
                <div className="m-bundle__content">
                  <span className="m-bundle__eyebrow">{tier.badge || 'Made for you'}</span>
                  <h3>{index === 0 ? <>Pick, pair &amp;<br /><em>make it yours.</em></> : <>Your favourites.<br /><em>Better together.</em></>}</h3>
                  <p>Choose any {tier.pairs} or more fragrances</p>
                  <strong className="m-bundle__saving">Save {tier.off}%</strong>
                  <span className="m-bundle__button">Build bundle <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 19 19 5M5 5h14v14" /></svg></span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
