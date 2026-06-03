'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { X, Instagram, Facebook, Twitter } from 'lucide-react';
import { useUiStore } from '@/store/uiStore';
import { NAV_LINKS, JEWELLERY_CATEGORIES, ROUTES } from '@/lib/constants';

const FOOTER_LINKS = [
  { label: 'Contact', href: ROUTES.contact },
  { label: 'Track Order', href: ROUTES.trackOrder },
  { label: 'Wishlist', href: ROUTES.wishlist },
  { label: 'My Account', href: ROUTES.account },
];

const SOCIAL = [
  { Icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { Icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { Icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
];

export function MobileMenu() {
  const { mobileMenuOpen, closeMobileMenu } = useUiStore();

  // Lock body scroll + ESC to close
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKey = (e) => e.key === 'Escape' && closeMobileMenu();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  return (
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          {/* Gold-tinted blurred backdrop */}
          <motion.div
            key="vq-mm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={closeMobileMenu}
            className="fixed inset-0 backdrop-blur-md"
            style={{
              zIndex: 2147483646,
              backgroundColor: 'rgba(191, 139, 46, 0.18)',
            }}
            aria-hidden="true"
          />

          {/* Full-screen panel sliding in from the LEFT */}
          <motion.aside
            key="vq-mm-panel"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.32, ease: [0.22, 0.65, 0.3, 1] }}
            className="fixed inset-0 flex h-full w-full flex-col bg-ivory"
            style={{ zIndex: 2147483647 }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
          >
            {/* subtle gold sweep overlay */}
            <span className="vq-shine" aria-hidden />

            {/* Top bar — close + centered wordmark */}
            <div className="relative flex h-[68px] items-center justify-center border-b border-gold/25 px-5">
              <button
                onClick={closeMobileMenu}
                className="absolute left-4 flex h-10 w-10 items-center justify-center text-brand-black/70 hover:text-brand-black focus-visible:outline-none"
                aria-label="Close menu"
              >
                <X size={22} strokeWidth={1.4} />
              </button>
              <div className="flex items-center gap-2.5">
                <span className="vq-diamond" aria-hidden style={{ width: 6, height: 6 }} />
                <span
                  className="vq-wordmark text-[20px] font-medium uppercase"
                  style={{ letterSpacing: '0.32em' }}
                >
                  Velquira
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="relative flex-1 overflow-y-auto px-7 py-9">
              {/* Editorial eyebrow */}
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-gold">
                The Collection
              </p>

              {/* Categories — large serif, staggered */}
              <ul className="vq-stagger mt-5 flex flex-col gap-1">
                {JEWELLERY_CATEGORIES.map((cat, i) => (
                  <li key={cat.href} className="vq-fade-up">
                    <Link
                      href={cat.href}
                      onClick={closeMobileMenu}
                      className="group flex items-baseline gap-4 py-2"
                    >
                      <span className="font-display text-[10px] uppercase tracking-[0.3em] text-gold/70">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="font-display text-[30px] leading-tight text-brand-black transition-colors duration-300 group-hover:text-gold-deep">
                        {cat.label}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Thin gold rule */}
              <div className="my-8 h-px w-full bg-gradient-to-r from-transparent via-gold/40 to-transparent" />

              {/* Main nav links */}
              <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-gold">
                Explore
              </p>
              <ul className="mt-4 flex flex-col">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMobileMenu}
                      className="block py-2.5 text-[12px] uppercase tracking-[0.28em] text-brand-black/75 transition-colors duration-200 hover:text-gold-deep"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer — social + small links */}
            <div className="relative border-t border-gold/25 bg-cream/60 px-7 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {SOCIAL.map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="text-brand-black/65 transition-colors hover:text-gold-deep"
                    >
                      <Icon size={16} strokeWidth={1.4} />
                    </a>
                  ))}
                </div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-brand-black/50">
                  Fine Jewellery
                </p>
              </div>

              <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2">
                {FOOTER_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMobileMenu}
                      className="text-[10px] uppercase tracking-[0.25em] text-brand-black/65 transition-colors duration-200 hover:text-gold-deep"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}