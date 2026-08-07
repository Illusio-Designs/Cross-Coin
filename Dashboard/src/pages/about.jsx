import Link from 'next/link';
import Layout from '../components/site/Layout';
import { Ico, Check, ArrowRight } from '../components/site/icons';
import { BRANDS } from '../data/brands';
import styles from '../styles/site.module.css';

const PILLARS = [
  { title: 'A house of brands', text: 'Multiple independent consumer brands under one parent company.' },
  { title: 'Owned & operated', text: 'Obzus builds and runs each brand directly — not a marketplace.' },
  { title: 'Shared platform', text: 'One commerce and operations stack powering every store.' },
];

const CAPABILITIES = [
  { title: 'Brand building', text: 'Creating and growing distinct consumer brands, each with its own identity, audience and product line.', icon: 'spark' },
  { title: 'Commerce operations', text: 'Products, orders, inventory, payments and fulfilment — run end-to-end across every brand.', icon: 'box' },
  { title: 'Growth & performance', text: 'Campaigns, analytics and customer engagement, measured and optimised centrally.', icon: 'chart' },
  { title: 'One platform', text: 'A shared technology backbone so each store launches faster with less overhead.', icon: 'grid' },
];

export default function About() {
  return (
    <Layout title="About" description="Obzus is the parent company that creates and manages a portfolio of independent direct-to-consumer commerce brands.">
      <header className={styles.pageHero}>
        <p className={styles.eyebrow}>About Obzus</p>
        <h1 className={styles.pageTitle}>A single company behind a family of stores.</h1>
        <p className={styles.pageLead}>
          Obzus creates and manages a portfolio of independent consumer brands. Each store stands
          on its own, while the people, playbooks and technology behind them are shared — so every
          brand launches faster and operates cleaner.
        </p>
      </header>

      {/* Story + pillars */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.aboutGrid}>
            <div className={styles.prose}>
              <p>Obzus began with a simple idea: great consumer brands share the same operational needs, even when their products and audiences are completely different.</p>
              <p>So instead of rebuilding the same commerce engine for every store, we built one — and put it to work across a growing family of brands. That means each brand gets the focus it deserves on identity and product, while orders, inventory, payments, fulfilment and analytics run on a single, proven platform.</p>
              <p>The result is a house of brands that moves quickly, stays consistent, and keeps the customer experience high across every store we run.</p>
            </div>
            <div className={styles.pillars}>
              {PILLARS.map((p) => (
                <div className={styles.pillar} key={p.title}>
                  <span className={styles.pillarDot}><Check /></span>
                  <span><b>{p.title}</b><span>{p.text}</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What we do */}
      <section className={`${styles.section} ${styles.sectionSoft}`}>
        <div className={styles.inner}>
          <p className={styles.kicker}>What we do</p>
          <h2 className={styles.h2}>The full commerce lifecycle.</h2>
          <p className={styles.lead}>From the first product to the thousandth order, Obzus runs everything a modern brand needs.</p>
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

      {/* CTA */}
      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.ctaStrip}>
            <div className={styles.ctaInner}>
              <h2>Explore the {BRANDS.length} brands.</h2>
              <p>Each store has its own identity — see the full Obzus family.</p>
              <Link className={styles.contactBtn} href="/brands">View our brands <ArrowRight /></Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}
