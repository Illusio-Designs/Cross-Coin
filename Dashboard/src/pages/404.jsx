import Link from 'next/link';
import Layout from '../components/site/Layout';
import styles from '../styles/site.module.css';

export default function NotFound() {
  return (
    <Layout title="Page not found" description="The page you're looking for doesn't exist.">
      <section className={styles.section} style={{ textAlign: 'center', padding: '96px 24px' }}>
        <div className={styles.inner}>
          <p className={styles.eyebrow}>Error 404</p>
          <h1 className={styles.pageTitle} style={{ marginBottom: 16 }}>Page not found</h1>
          <p className={styles.pageLead} style={{ margin: '0 auto 32px' }}>
            This page took a wrong turn. Let&apos;s get you back on track.
          </p>
          <div className={styles.heroCtas}>
            <Link className={styles.btnPrimary} href="/">Go home</Link>
            <Link className={styles.btnGhost} href="/brands">Explore brands</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
