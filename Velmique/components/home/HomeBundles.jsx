import Link from 'next/link';
import styles from './HomeBundles.module.css';

export default function HomeBundles({ tiers = [], images = [] }) {
  if (!tiers.length) return null;
  return (
    <section className={styles.section} aria-labelledby="home-bundles-title">
      <h2 id="home-bundles-title">Build Your Bundle</h2>
      <p>Pair your favourites and save together.</p>
      <div className={styles.grid}>
        {tiers.slice(0, 2).map((tier, index) => (
          <Link className={styles.card} href={`/test/pack?items=${tier.pairs}`} key={tier.id || tier.pairs}>
            {(tier.image || images[index]) && <img src={tier.image || images[index]} alt="" loading="lazy" />}
            <div className={styles.content}>
              <span>{tier.badge || 'Made for you'}</span>
              <h3>Choose any {tier.pairs} or more fragrances</h3>
              <strong>Save {tier.off}%</strong>
              <b>Build bundle ↗</b>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
