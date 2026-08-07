import Head from 'next/head';
import ObzusLogo from '../components/common/ObzusLogo';
import styles from '../styles/pages/company.module.css';

/**
 * Obzus — public parent-company landing page.
 *
 * Obzus is the house that owns the storefront brands below. This page is public
 * (no auth); the admin dashboard lives at /dashboard and is reached via the
 * "Admin sign in" button. Brand cards link out to each live storefront.
 */
const BRANDS = [
  { name: 'CrossCoin', file: '/brands/crosscoin.webp', url: 'https://crosscoin.in' },
  { name: 'Gripzus',   file: '/brands/gripzus.jpeg',   url: 'https://gripzus.com' },
  { name: 'Morbix',    file: '/brands/morbix.png',     url: 'https://morbixsocks.com' },
  { name: 'Soxbae',    file: '/brands/soxbae.png',     url: 'https://soxbaesocks.com' },
  { name: 'Knitwink',  file: '/brands/knitwink.webp',  url: 'https://knitwink.com' },
  { name: 'Velmique',  file: '/brands/velmique.webp',  url: 'https://velmique.co.in' },
  { name: 'Velquira',  file: '/brands/velquira.png',   url: 'https://velquira.in' },
];

const ArrowUpRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);

export default function Company() {
  return (
    <>
      <Head>
        <title>Obzus — House of commerce brands</title>
        <meta name="description" content="Obzus is the parent company behind a family of direct-to-consumer commerce brands, run from one platform." />
        <meta name="robots" content="index,follow" />
      </Head>

      <div className={styles.page}>
        {/* Nav */}
        <nav className={styles.nav}>
          <span className={styles.navLogo}><ObzusLogo height={22} title="Obzus" /></span>
          <a className={styles.signin} href="/auth/adminlogin">
            Admin sign in <ArrowUpRight />
          </a>
        </nav>

        {/* Hero */}
        <header className={styles.hero}>
          <span className={styles.eyebrow}>Parent Company</span>
          <div className={styles.heroMark}><ObzusLogo height={64} title="Obzus" /></div>
          <h1 className={styles.headline}>
            One house.<br /><em>Many brands.</em>
          </h1>
          <p className={styles.sub}>
            Obzus builds and operates a family of direct-to-consumer commerce brands —
            products, orders, customers and campaigns, all run from a single platform.
          </p>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <span className={styles.metaNum}>{BRANDS.length}</span>
              <span className={styles.metaLabel}>Brands</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaNum}>1</span>
              <span className={styles.metaLabel}>Platform</span>
            </div>
          </div>
        </header>

        {/* Brands */}
        <section className={styles.brands}>
          <div className={styles.brandsHead}>
            <h2 className={styles.brandsTitle}>Our brands</h2>
            <span className={styles.brandsHint}>Tap a brand to visit its store</span>
          </div>
          <div className={styles.grid}>
            {BRANDS.map((b) => (
              <a key={b.name} className={styles.card} href={b.url} target="_blank" rel="noopener noreferrer">
                <span className={styles.logoWrap}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.file} alt={`${b.name} logo`} loading="lazy" />
                </span>
                <span className={styles.cardFoot}>Visit {b.name} <ArrowUpRight /></span>
              </a>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <span className={styles.footerLogo}><ObzusLogo height={16} title="Obzus" /></span>
          <span>© {new Date().getFullYear()} Obzus. All rights reserved.</span>
        </footer>
      </div>
    </>
  );
}
