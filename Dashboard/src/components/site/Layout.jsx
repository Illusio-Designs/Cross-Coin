import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useEffect } from 'react';
import ObzusLogo from '../common/ObzusLogo';
import { ArrowUpRight } from './icons';
import styles from '../../styles/site.module.css';

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

  // Mobile menu: the inline nav links + Login don't fit on a phone, so they
  // collapse behind a hamburger toggle below the lg breakpoint.
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  // Close the menu on route change so it never stays open after navigating.
  useEffect(() => {
    router.events?.on('routeChangeComplete', closeMenu);
    return () => router.events?.off('routeChangeComplete', closeMenu);
  }, [router]);
  // Lock body scroll and close on Escape while the mobile menu is open
  // (menuOpen is only ever true below the mobile breakpoint).
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [menuOpen]);

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
          <Link href="/" className={styles.navLogo} aria-label="Obzus home" onClick={closeMenu}><ObzusLogo height={22} title="Obzus" /></Link>

          <button
            type="button"
            className={styles.navToggle}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
            )}
          </button>

          <div className={`${styles.navMenu} ${menuOpen ? styles.navMenuOpen : ''}`}>
            <div className={styles.navLinks}>
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={closeMenu} className={`${styles.navLink} ${isActive(n.href) ? styles.navLinkActive : ''}`}>
                  {n.label}
                </Link>
              ))}
            </div>
            <Link className={styles.signin} href="/login" onClick={closeMenu}>Login <ArrowUpRight /></Link>
          </div>
        </nav>
        {menuOpen && <div className={styles.navScrim} onClick={closeMenu} aria-hidden="true" />}

        {children}

        <footer className={styles.footer}>
          <Link href="/" className={styles.footerLogo}><ObzusLogo height={16} title="Obzus" /></Link>
          <div className={styles.footerLinks}>
            <Link href="/about">About</Link>
            <Link href="/brands">Brands</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/login">Login</Link>
          </div>
          <span>© {new Date().getFullYear()} Obzus. All rights reserved.</span>
        </footer>
      </div>
    </>
  );
}
