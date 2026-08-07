import Layout from '../../components/site/Layout';
import BrandCard from '../../components/site/BrandCard';
import { BRANDS } from '../../data/brands';
import styles from '../../styles/site.module.css';

export default function BrandsIndex() {
  return (
    <Layout title="Our Brands" description="The Obzus family — a portfolio of direct-to-consumer commerce brands, each with its own identity.">
      <header className={styles.pageHero}>
        <p className={styles.eyebrow}>Our Brands</p>
        <h1 className={styles.pageTitle}>The Obzus family.</h1>
        <p className={styles.pageLead}>
          {BRANDS.length} independent consumer brands, each with its own identity and audience —
          all built and operated by Obzus. Choose a brand to learn more, or visit its store.
        </p>
      </header>

      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.grid}>
            {BRANDS.map((b) => <BrandCard key={b.slug} brand={b} />)}
          </div>
        </div>
      </section>
    </Layout>
  );
}
