import Link from 'next/link';
import Layout from '../components/site/Layout';
import BrandCard from '../components/site/BrandCard';
import ObzusLogo from '../components/common/ObzusLogo';
import { Ico, ArrowRight } from '../components/site/icons';
import { BRANDS } from '../data/brands';
import styles from '../styles/site.module.css';

// Obzus India Pvt. Ltd. — House of Brands.
const VALUES = [
  { title: 'Premium quality', text: 'Products built to a high standard — comfort and durability you can feel.', icon: 'shield' },
  { title: 'Trusted brands', text: 'A family of established consumer brands people know and come back to.', icon: 'tag' },
  { title: 'Customer focused', text: 'Every decision starts from the customer and the experience they get.', icon: 'users' },
  { title: 'Innovation driven', text: 'Always improving — new products, new categories, better ways to deliver.', icon: 'bulb' },
];

const CATEGORIES = [
  { name: 'Apparel', note: 'Socks · all types' },
  { name: 'Wellness', note: 'Motion-sickness bands' },
  { name: 'Fragrance', note: 'Perfume' },
  { name: 'Kids', note: 'Socks, toys & more' },
];

const MARKETS = ['Amazon', 'Flipkart', 'Meesho', 'AJIO', 'JioMart', 'Myntra', 'Shopsy', 'Blinkit', 'Zepto', 'Instamart'];

const CONTACT_EMAIL = 'Obzusindia@gmail.com';

export default function Home() {
  const featured = BRANDS.slice(0, 4);
  return (
    <Layout description="Obzus India Pvt. Ltd. — a house of consumer brands across apparel, wellness, fragrance and kids. Multiple brands, one vision.">
      {/* Hero */}
      <header className={styles.hero}>
        <span className={styles.eyebrow}>Obzus India Pvt. Ltd. · House of Brands</span>
        <div className={styles.heroMark}><ObzusLogo height={66} title="Obzus" /></div>
        <h1 className={styles.headline}>Multiple brands.<br /><em>One vision.</em></h1>
        <p className={styles.sub}>
          Quality that moves you. Obzus builds and runs a family of consumer brands across
          apparel, wellness, fragrance and kids — available on every major marketplace and
          our own stores.
        </p>
        <div className={styles.heroCtas}>
          <Link className={styles.btnPrimary} href="/brands">Explore our brands</Link>
          <Link className={styles.btnGhost} href="/about">About Obzus</Link>
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaItem}><span className={styles.metaNum}>{BRANDS.length}+</span><span className={styles.metaLabel}>Brands</span></div>
          <div className={styles.metaItem}><span className={styles.metaNum}>4</span><span className={styles.metaLabel}>Categories</span></div>
          <div className={styles.metaItem}><span className={styles.metaNum}>10+</span><span className={styles.metaLabel}>Marketplaces</span></div>
        </div>
      </header>

      {/* Values */}
      <section className={`${styles.section} ${styles.sectionSoft}`}>
        <div className={styles.inner}>
          <p className={styles.kicker}>Why Obzus</p>
          <h2 className={styles.h2}>Comfort. Quality. Innovation.</h2>
          <p className={styles.lead}>The principles behind every brand we build and every product we ship.</p>
          <div className={styles.capGrid}>
            {VALUES.map((v) => (
              <div className={styles.capCard} key={v.title}>
                <div className={styles.capIcon}><Ico name={v.icon} /></div>
                <h3 className={styles.capTitle}>{v.title}</h3>
                <p className={styles.capText}>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <p className={styles.kicker}>What we make</p>
          <h2 className={styles.h2}>Four categories, growing.</h2>
          <p className={styles.lead}>From everyday essentials to new lines like antique jewellery and women&apos;s clothing (coming soon).</p>
          <div className={styles.pills}>
            {CATEGORIES.map((c) => (
              <span className={styles.pill} key={c.name}>
                <span className={styles.pillDot} />{c.name} <small>· {c.note}</small>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Featured brands */}
      <section className={`${styles.section} ${styles.sectionSoft}`}>
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

      {/* Marketplaces */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <p className={styles.kicker}>Available on</p>
          <h2 className={styles.h2}>Wherever you shop.</h2>
          <p className={styles.lead}>Our brands are on all the leading platforms — plus our own websites.</p>
          <div className={styles.markets}>
            {MARKETS.map((m) => <span className={styles.market} key={m}>{m}</span>)}
            <span className={styles.market}><b>+ Our websites</b></span>
          </div>
        </div>
      </section>

      {/* CTA / contact */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.ctaStrip}>
            <div className={styles.ctaInner}>
              <h2>Let&apos;s work together.</h2>
              <p>Partnerships, wholesale, press or general enquiries — reach the Obzus team.</p>
              <Link className={styles.contactBtn} href="/contact">Get in touch <ArrowRight /></Link>
              <p style={{ color: '#8a8a92', fontSize: 13, marginTop: 16 }}>
                {CONTACT_EMAIL} · +91 97128 91700 · India
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
