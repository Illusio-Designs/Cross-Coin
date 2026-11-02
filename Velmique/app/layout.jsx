import { Suspense } from 'react';
import './globals.css';
import './mint.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { StoreProvider } from '@/lib/store';
import { AuthProvider } from '@/context/AuthContext';
import ClientProviders from '@/components/layout/ClientProviders';
import SentryInit from '@/components/SentryInit';
import ConsentSpeedInsights from '@/components/layout/ConsentSpeedInsights';
import Analytics from '@/components/layout/Analytics';
import CartDrawer from '@/components/cart/CartDrawer';
import ExitIntentModal from '@/components/cart/ExitIntentModal';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ScrollProgress from '@/components/ui/ScrollProgress';
import WhatsAppChat from '@/components/ui/WhatsAppChat';
import VisitTracker from '@/components/common/VisitTracker';
import SmoothScroll from '@/components/SmoothScroll';
import MintShell from './_components/MintShell';
import { SITE_URL } from '@/lib/site';

/* Fonts (Playfair Display + Inter) are self-hosted (app/globals.css
   @font-face, files in public/fonts) under their real family names. We
   deliberately avoid next/font here: its hashed CSS-variable approach was
   collapsing to the body sans on the deployed site when the variable failed
   to resolve. Plain family names can never collapse. */
const DESCRIPTION = 'VELMIQUE — refined, handcrafted Indian fragrances. Discover our Maison de Parfum: eau de parfum crafted from rare ingredients, made in India.';

export const metadata = {
  // Absolute base for canonical/OG URLs (matches sitemap.js / robots.js host).
  metadataBase: new URL(SITE_URL),
  title: 'Velmique — Maison de Parfum',
  description: DESCRIPTION,
  keywords: 'luxury perfume, niche fragrance, velmique, eau de parfum, indian perfume, oud, luxury scent',
  applicationName: 'Velmique',
  openGraph: {
    type: 'website',
    siteName: 'Velmique',
    title: 'Velmique — Maison de Parfum',
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_IN',
    images: [{ url: '/logo.webp' }],
  },
  twitter: { card: 'summary_large_image', title: 'Velmique — Maison de Parfum', description: DESCRIPTION },
};

// Allow pinch-zoom so shoppers can inspect product photos on mobile. Locking the
// viewport (userScalable:false) blocked zoom and is an accessibility regression.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0d0f',
  colorScheme: 'dark',
};

// The store's tracking IDs (GA4, Meta pixel, Clarity, GTM), read on the
// server and cached 5 minutes, so the page arrives with them and tracking
// starts without waiting for another request. Null when the API can't be
// reached: the browser then fetches them itself.
async function trackingConfig() {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}/api/public/tracking-config`, {
      headers: { 'X-Brand-Name': process.env.NEXT_PUBLIC_BRAND_NAME || 'velmique' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(3000),
    });
    const d = await r.json();
    return d?.success ? d : null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }) {
  const tracking = await trackingConfig();
  return (
    // data-maison switches the shared design tokens in globals.css to the onyx &
    // gold palette, so shared components (cart drawer, toasts…) match the shell.
    <html lang="en" data-maison="" suppressHydrationWarning>
      <head>
        {/* Moving strips start on the shopper's first touch, click, key or
            wheel (mint.css: html:not(.mx-go)). Motion from the first frame
            keeps the screen "changing" while the page loads, which page-speed
            tests count against it. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){var d=document.documentElement,e=['pointerdown','touchstart','keydown','wheel'],g=function(){d.classList.add('mx-go');e.forEach(function(k){removeEventListener(k,g)})};e.forEach(function(k){addEventListener(k,g,{passive:true})})})()" }} />
        {/* Run before paint so the browser never restores the previous scroll
            position (which could show the footer first) on a fresh load. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}" }} />
        {/* The two faces on the first screen, fetched at once (same files as
            the @font-face rules in globals.css). */}
        <link rel="preload" href="/fonts/inter-latin-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/playfair-display-latin-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        {/* Without JS the no-half-draw images (SkImg) could never reveal. */}
        <noscript><style>{'.sk-frame>img{opacity:1!important}.sk-img{animation:none!important;background-image:none!important}'}</style></noscript>
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="dns-prefetch" href="https://api.crosscoin.in" />
      </head>
      <body>
        {/* Pictures stay hidden until fully loaded + decoded; this shows them
            as soon as they are ready, even before React has started. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{document.addEventListener('load',function(e){var t=e.target;if(!t||t.tagName!=='IMG')return;var f=t.parentNode;if(!f||!f.classList||!f.classList.contains('sk-frame')||!f.classList.contains('sk-img'))return;var r=function(){if(t.naturalWidth>0){f.classList.remove('sk-img');f.classList.add('is-ready')}};if(t.decode){t.decode().then(r,function(){})}else{r()}},true)}catch(_){}})();" }} />
        {/* Deploy resilience (no Vercel Pro): reload once if a CSS chunk fails to load. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var K='__cssReload';window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);}catch(_){}})();" }} />
        <SentryInit />
        <ConsentSpeedInsights />
        <a href="#main" className="skip-to-main">Skip to main content</a>
        <ClientProviders>
          <AuthProvider>
            <StoreProvider>
              <ScrollProgress />
              <div className="m-root">
                <SmoothScroll><MintShell>{children}</MintShell></SmoothScroll>
              </div>
              <ExitIntentModal />
              <ScrollToTop />
              <WhatsAppChat />
              {/* The bag + full checkout (coupons, fees, COD/prepaid, WhatsApp
                  abandoned-cart capture and the ?recover=1 recovery link). */}
              <CartDrawer />
              {/* Analytics calls useSearchParams() for route-change tracking;
                  it must live inside a Suspense boundary or Next 14 bails
                  static prerendering on every page. */}
              <Suspense fallback={null}>
                <Analytics initial={tracking} />
              </Suspense>
              <VisitTracker />
              <ToastContainer
                position="top-right"
                autoClose={2500}
                hideProgressBar
                newestOnTop
                closeOnClick
                pauseOnFocusLoss={false}
                pauseOnHover={false}
                draggable={false}
                theme="dark"
                limit={3}
                toastClassName="velmique-toast"
              />
            </StoreProvider>
          </AuthProvider>
        </ClientProviders>
      </body>
    </html>
  );
}
