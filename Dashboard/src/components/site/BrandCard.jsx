import Link from 'next/link';
import { ArrowRight } from './icons';
import styles from '../../styles/site.module.css';

/** Brand card → links to the internal brand detail page (/brands/[slug]). */
export default function BrandCard({ brand }) {
  return (
    <Link href={`/brands/${brand.slug}`} className={styles.card}>
      <span className={styles.logoWrap}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt={`${brand.name} logo`} loading="lazy" />
      </span>
      <span className={styles.cardBody}>
        <span className={styles.cardName}>{brand.name}</span>
        <span className={styles.cardBlurb}>{brand.blurb}</span>
      </span>
      <span className={styles.cardFoot}>Learn more <ArrowRight /></span>
    </Link>
  );
}
