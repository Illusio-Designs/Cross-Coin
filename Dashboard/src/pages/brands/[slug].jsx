import Link from 'next/link';
import Layout from '../../components/site/Layout';
import BrandCard from '../../components/site/BrandCard';
import { Check, ArrowUpRight, ArrowLeft } from '../../components/site/icons';
import { BRANDS, getBrand } from '../../data/brands';
import styles from '../../styles/site.module.css';

export async function getStaticPaths() {
  return {
    paths: BRANDS.map((b) => ({ params: { slug: b.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const brand = getBrand(params.slug);
  if (!brand) return { notFound: true };
  const others = BRANDS.filter((b) => b.slug !== brand.slug).slice(0, 3);
  return { props: { brand, others } };
}

export default function BrandPage({ brand, others }) {
  return (
    <Layout
      title={brand.name}
      description={`${brand.name} — ${brand.blurb} Part of the Obzus family of brands.`}
    >
      <header className={styles.pageHero}>
        <Link href="/brands" className={styles.backLink}><ArrowLeft /> All brands</Link>
        <div className={styles.brandTop}>
          <div className={styles.brandLogoBox}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={brand.logo} alt={`${brand.name} logo`} />
          </div>
          <div>
            <span className={styles.brandChip}>{brand.category}</span>
            <h1 className={styles.brandName}>{brand.name}</h1>
            <p className={styles.brandTagline}>{brand.blurb}</p>
            <div className={styles.brandActions}>
              <a className={styles.btnPrimary} href={brand.url} target="_blank" rel="noopener noreferrer">
                Visit store <ArrowUpRight />
              </a>
              <Link className={styles.btnGhost} href="/contact">Get in touch</Link>
            </div>
          </div>
        </div>
      </header>

      {/* Description */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.aboutGrid}>
            <div>
              <p className={styles.kicker}>About {brand.name}</p>
              <div className={styles.prose}>
                {brand.about.map((para, i) => <p key={i}>{para}</p>)}
              </div>
            </div>
            <div>
              <p className={styles.kicker}>Highlights</p>
              <div className={styles.highlights}>
                {brand.highlights.map((h) => (
                  <div className={styles.hlItem} key={h}>
                    <span className={styles.hlDot}><Check size={14} /></span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other brands */}
      <section className={`${styles.section} ${styles.sectionSoft}`}>
        <div className={styles.inner}>
          <div className={styles.brandsHead}>
            <div>
              <p className={styles.kicker}>More from Obzus</p>
              <h2 className={styles.h2}>Explore other brands</h2>
            </div>
            <Link className={styles.brandsHint} href="/brands">View all brands →</Link>
          </div>
          <div className={styles.moreGrid}>
            {others.map((b) => <BrandCard key={b.slug} brand={b} />)}
          </div>
        </div>
      </section>
    </Layout>
  );
}
