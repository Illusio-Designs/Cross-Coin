import Head from 'next/head';
import ObzusLogo from '../components/ObzusLogo';
import styles from '../styles/company.module.css';

/**
 * Obzus — public parent-company website (informative).
 *
 * Obzus is the parent company that builds, owns and operates the storefront
 * brands below. This is a standalone marketing site, separate from the admin
 * dashboard. Brand cards link out to each live store.
 */
const BRANDS = [
  { name: 'CrossCoin', file: '/brands/crosscoin.webp', url: 'https://crosscoin.in',      note: 'Lifestyle & essentials' },
  { name: 'Gripzus',   file: '/brands/gripzus.jpeg',   url: 'https://gripzus.com',       note: 'Everyday performance' },
  { name: 'Morbix',    file: '/brands/morbix.png',     url: 'https://morbixsocks.com',   note: 'Socks & basics' },
  { name: 'Soxbae',    file: '/brands/soxbae.png',     url: 'https://soxbaesocks.com',   note: 'Happiness in feet' },
  { name: 'Knitwink',  file: '/brands/knitwink.webp',  url: 'https://knitwink.com',      note: 'Luxury in every step' },
  { name: 'Velmique',  file: '/brands/velmique.webp',  url: 'https://velmique.co.in',    note: 'Refined & modern' },
  { name: 'Velquira',  file: '/brands/velquira.png',   url: 'https://velquira.in',       note: 'Considered design' },
];

const CONTACT_EMAIL = 'illusiodesigns@gmail.com';

// The admin dashboard is a SEPARATE app on its own domain. Set
// NEXT_PUBLIC_ADMIN_URL (e.g. https://admin.obzus.com) on Vercel to surface the
// "Admin sign in" link; left blank, the public site simply omits it.
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || '';

const CAPABILITIES = [
  { title: 'Brand building', text: 'We create and grow distinct consumer brands, each with its own identity, audience and product line.', icon: 'spark' },
  { title: 'Commerce operations', text: 'Products, orders, inventory, payments and fulfilment — run end-to-end across every brand.', icon: 'box' },
  { title: 'Growth & performance', text: 'Campaigns, analytics and customer engagement, measured and optimised from one place.', icon: 'chart' },
  { title: 'One platform', text: 'A shared technology backbone powers all brands, so each store moves faster with less overhead.', icon: 'grid' },
];

/* ── Inline icons (monochrome, stroke) ── */
const Ico = ({ name }) => {
  const p = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  switch (name) {
    case 'spark': return (<svg {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" /></svg>);
    case 'box':   return (<svg {...p}><path d="M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8" /></svg>);
    case 'chart': return (<svg {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>);
    case 'grid':  return (<svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>);
    case 'check': return (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>);
    default: return null;
  }
};

const ArrowUpRight = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M7 17L17 7M9 7h8v8" />
  </svg>
);

const PILLARS = [
  { title: 'A house of brands', text: 'Multiple independent consumer brands under one parent company.' },
  { title: 'Owned & operated', text: 'Obzus builds and runs each brand directly — not a marketplace.' },
  { title: 'Shared platform', text: 'One commerce and operations stack powering every store.' },
];

export default function Home() {
  return (
    <>
      <Head>
        <title>Obzus — House of commerce brands</title>
        <meta name="description" content="Obzus is the parent company that builds, owns and operates a family of direct-to-consumer commerce brands, run from one platform." />
        <meta name="robots" content="index,follow" />
        <meta property="og:title" content="Obzus — House of commerce brands" />
        <meta property="og:description" content="The parent company behind a family of direct-to-consumer commerce brands." />
        <meta property="og:type" content="website" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className={styles.page}>
        {/* Nav */}
        <nav className={styles.nav}>
          <a href="#top" className={styles.navLogo} aria-label="Obzus home"><ObzusLogo height={22} title="Obzus" /></a>
          <div className={styles.navLinks}>
            <a className={styles.navLink} href="#about">About</a>
            <a className={styles.navLink} href="#what">What we do</a>
            <a className={styles.navLink} href="#brands">Brands</a>
            <a className={styles.navLink} href="#contact">Contact</a>
          </div>
          {ADMIN_URL
            ? <a className={styles.signin} href={ADMIN_URL}>Admin sign in <ArrowUpRight /></a>
            : <a className={styles.signin} href="#contact">Get in touch <ArrowUpRight /></a>}
        </nav>

        {/* Hero */}
        <header className={styles.hero} id="top">
          <span className={styles.eyebrow}>Parent Company</span>
          <div className={styles.heroMark}><ObzusLogo height={66} title="Obzus" /></div>
          <h1 className={styles.headline}>One house.<br /><em>Many brands.</em></h1>
          <p className={styles.sub}>
            Obzus builds, owns and operates a family of direct-to-consumer commerce
            brands — products, orders, customers and campaigns, all run from a single platform.
          </p>
          <div className={styles.heroCtas}>
            <a className={styles.btnPrimary} href="#brands">Explore our brands</a>
            <a className={styles.btnGhost} href="#about">About Obzus</a>
          </div>
          <div className={styles.metaRow}>
            <div className={styles.metaItem}><span className={styles.metaNum}>{BRANDS.length}</span><span className={styles.metaLabel}>Brands</span></div>
            <div className={styles.metaItem}><span className={styles.metaNum}>1</span><span className={styles.metaLabel}>Platform</span></div>
            <div className={styles.metaItem}><span className={styles.metaNum}>D2C</span><span className={styles.metaLabel}>Focus</span></div>
          </div>
        </header>

        {/* About */}
        <section className={`${styles.section} ${styles.sectionSoft}`} id="about">
          <div className={styles.inner}>
            <div className={styles.aboutGrid}>
              <div>
                <p className={styles.kicker}>About Obzus</p>
                <h2 className={styles.h2}>A single company behind a family of stores.</h2>
                <p className={styles.lead}>
                  Obzus is the parent brand that creates and manages a portfolio of
                  independent consumer brands. Each store stands on its own, while the
                  people, playbooks and technology behind them are shared — so every
                  brand launches faster and operates cleaner.
                </p>
              </div>
              <div className={styles.pillars}>
                {PILLARS.map((p) => (
                  <div className={styles.pillar} key={p.title}>
                    <span className={styles.pillarDot}><Ico name="check" /></span>
                    <span><b>{p.title}</b><span>{p.text}</span></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* What we do */}
        <section className={styles.section} id="what">
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

        {/* Brands */}
        <section className={`${styles.section} ${styles.sectionSoft}`} id="brands">
          <div className={styles.inner}>
            <div className={styles.brandsHead}>
              <div>
                <p className={styles.kicker}>Our brands</p>
                <h2 className={styles.h2}>The Obzus family</h2>
              </div>
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
          </div>
        </section>

        {/* Contact */}
        <section className={styles.section} id="contact">
          <div className={styles.inner}>
            <div className={styles.contactBox}>
              <div className={styles.contactInner}>
                <p className={styles.kicker} style={{ color: '#8a8a92' }}>Get in touch</p>
                <h2 className={styles.h2}>Partnerships, press &amp; general enquiries.</h2>
                <p className={styles.lead}>Working with a brand, exploring a partnership, or just want to say hello? We&apos;d love to hear from you.</p>
                <a className={styles.contactBtn} href={`mailto:${CONTACT_EMAIL}`}>Email us <ArrowUpRight /></a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <span className={styles.footerLogo}><ObzusLogo height={16} title="Obzus" /></span>
          <div className={styles.footerLinks}>
            <a href="#about">About</a>
            <a href="#brands">Brands</a>
            <a href="#contact">Contact</a>
            {ADMIN_URL && <a href={ADMIN_URL}>Admin</a>}
          </div>
          <span>© {new Date().getFullYear()} Obzus. All rights reserved.</span>
        </footer>
      </div>
    </>
  );
}
