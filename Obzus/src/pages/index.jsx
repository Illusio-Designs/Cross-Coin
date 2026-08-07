import Link from 'next/link';
import Layout from '../components/Layout';
import BrandCard from '../components/BrandCard';
import ObzusLogo from '../components/ObzusLogo';
import { Ico, ArrowRight } from '../components/icons';
import { BRANDS } from '../data/brands';
import styles from '../styles/site.module.css';

const CAPABILITIES = [
  { title: 'Brand building', text: 'We create and grow distinct consumer brands, each with its own identity and audience.', icon: 'spark' },
  { title: 'Commerce operations', text: 'Products, orders, inventory, payments and fulfilment — run end-to-end across every brand.', icon: 'box' },
  { title: 'Growth & performance', text: 'Campaigns, analytics and customer engagement, measured and optimised from one place.', icon: 'chart' },
  { title: 'One platform', text: 'A shared technology backbone powers all brands, so each store moves faster.', icon: 'grid' },
];

export default function Home() {
  const featured = BRANDS.slice(0, 4);
  return (
    <Layout description="Obzus is the parent company that builds, owns and operates a family of direct-to-consumer commerce brands, run from one platform.">
      {/* Hero */}
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Parent Company</span>
        <div className={styles.heroMark}><ObzusLogo height={66} title="Obzus" /></div>
        <h1 className={styles.headline}>One house.<br /><em>Many brands.</em></h1>
        <p className={styles.sub}>
          Obzus builds, owns and operates a family of direct-to-consumer commerce
          brands — products, orders, customers and campaigns, all run from a single platform.
        </p>
        <div className={styles.heroCtas}>
          <Link className={styles.btnPrimary} href="/brands">Explore our brands</Link>
          <Link className={styles.btnGhost} href="/about">About Obzus</Link>
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaItem}><span className={styles.metaNum}>{BRANDS.length}</span><span className={styles.metaLabel}>Brands</span></div>
          <div className={styles.metaItem}><span className={styles.metaNum}>1</span><span className={styles.metaLabel}>Platform</span></div>
          <div className={styles.metaItem}><span className={styles.metaNum}>D2C</span><span className={styles.metaLabel}>Focus</span></div>
        </div>
      </header>

      {/* What we do */}
      <section className={`${styles.section} ${styles.sectionSoft}`}>
        <div className={styles.inner}>
          <p className={styles.kicker}>What we do</p>
          <h2 className={styles.h2}>Everything a brand needs, in one place.</h2>
          <p className={styles.lead}>From the first product to the thousandth order, Obzus runs the full commerce lifecycle for each brand.</p>
          <div className={styles.capGrid}>
            {CAPABILITIES.map((c) => (
              <div className={styles.capCard} key={c.title}>
                <div className={styles.capIcon}><Ico name={c.icon} /></div>
                <h3 className={styles.capTitle}>{c.title}</h3>
                <p className={styles.capText}>{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured brands */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.brandsHead}>
            <div>
              <p className={styles.kicker}>Our brands</p>
              <h2 className={styles.h2}>The Obzus family</h2>
            </div>
            <Link className={styles.brandsHint} href="/brands">View all brands →</Link>
          </div>
          <div className={styles.grid}>
            {featured.map((b) => <BrandCard key={b.slug} brand={b} />)}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.ctaStrip}>
            <div className={styles.ctaInner}>
              <h2>Let&apos;s build something.</h2>
              <p>Partnerships, press or general enquiries — we&apos;d love to hear from you.</p>
              <Link className={styles.contactBtn} href="/contact">Get in touch <ArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
