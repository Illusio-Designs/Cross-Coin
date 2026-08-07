import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ObzusLogo from './ObzusLogo';
import { ArrowUpRight } from './icons';
import styles from '../styles/site.module.css';

// The admin dashboard is a SEPARATE app on its own domain. Set
// NEXT_PUBLIC_ADMIN_URL (e.g. https://admin.obzus.com) on Vercel to surface the
// "Admin sign in" link; left blank, the public site shows "Contact" instead.
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || '';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/brands', label: 'Brands' },
  { href: '/contact', label: 'Contact' },
];

const SITE_NAME = 'Obzus';

export default function Layout({ children, title, description, activePath }) {
  const router = useRouter();
  const current = activePath || router.pathname;
  const isActive = (href) => (href === '/' ? current === '/' : current.startsWith(href));
  const fullTitle = title ? `${title} — ${SITE_NAME}` : `${SITE_NAME} — House of commerce brands`;

  return (
    <>
      <Head>
        <title>{fullTitle}</title>
        <meta name="description" content={description || 'Obzus is the parent company that builds, owns and operates a family of direct-to-consumer commerce brands.'} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="robots" content="index,follow" />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description || 'The parent company behind a family of direct-to-consumer commerce brands.'} />
        <meta property="og:type" content="website" />
      </Head>

      <div className={styles.page}>
        <nav className={styles.nav}>
          <Link href="/" className={styles.navLogo} aria-label="Obzus home"><ObzusLogo height={22} title="Obzus" /></Link>
          <div className={styles.navLinks}>
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`${styles.navLink} ${isActive(n.href) ? styles.navLinkActive : ''}`}>
                {n.label}
              </Link>
            ))}
          </div>
          {ADMIN_URL
            ? <a className={styles.signin} href={ADMIN_URL}>Admin sign in <ArrowUpRight /></a>
            : <Link className={styles.signin} href="/contact">Get in touch <ArrowUpRight /></Link>}
        </nav>

        {children}

        <footer className={styles.footer}>
          <Link href="/" className={styles.footerLogo}><ObzusLogo height={16} title="Obzus" /></Link>
          <div className={styles.footerLinks}>
            <Link href="/about">About</Link>
            <Link href="/brands">Brands</Link>
            <Link href="/contact">Contact</Link>
            {ADMIN_URL && <a href={ADMIN_URL}>Admin</a>}
          </div>
          <span>© {new Date().getFullYear()} Obzus. All rights reserved.</span>
        </footer>
      </div>
    </>
  );
}
