import localFont from 'next/font/local';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import ToastHost from '@/components/ToastHost';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import LazyCartLayer from '@/components/cart/LazyCartLayer';
import FloatingWidgets from '@/components/layout/FloatingWidgets';
import Analytics from '@/components/layout/Analytics';
import VisitTracker from '@/components/common/VisitTracker';
import SentryInit from '@/components/SentryInit';
import ConsentSpeedInsights from '@/components/layout/ConsentSpeedInsights';

// Inter and Fraunces (variable, weights 100–900), basic Latin characters
// only — the same files Google serves for 'latin'. Google's fonts also define
// an "extended Latin" file each (Inter 85 KB, Fraunces 40 + 34 KB) whose
// range covers the rupee sign, so every page with a price downloaded them on
// the first screen; here ₹ (and other rare characters) come from the phone's
// own font instead.
const inter = localFont({
  src: './fonts/inter-latin-var.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-body',
  display: 'swap',
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
});
const fraunces = localFont({
  src: [
    { path: './fonts/fraunces-latin-var.woff2', weight: '100 900', style: 'normal' },
    { path: './fonts/fraunces-latin-italic-var.woff2', weight: '100 900', style: 'italic' },
  ],
  variable: '--font-display',
  display: 'swap',
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
});

export const metadata = {
  metadataBase: new URL('https://soxbaesocks.com'),
  title: {
    default: 'Soxbae — Premium socks for sport & city life',
    template: '%s | Soxbae',
  },
  description:
    'Soxbae premium socks: engineered knit, lasting cushioning and clean design for every step — for sport and the city.',
  openGraph: {
    siteName: 'Soxbae',
    type: 'website',
    title: 'Soxbae — Premium socks for sport & city life',
    description: 'Engineered knit, lasting cushioning and clean design in every step.',
  },
  // Deployment marker so we can verify EXACTLY which commit is live:
  // view page source and search for <meta name="x-build" …>.
  other: { 'x-build': (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7) },
};

// Mobile browser chrome (address bar / status bar) tinted to the Soxbae brand.
export const viewport = {
  themeColor: '#17181a',
  width: 'device-width',
  initialScale: 1,
};

// The store's tracking IDs (GA4, Meta pixel, Clarity), read on the server and
// cached 5 minutes, so the page arrives with them and tracking starts without
// waiting for another request. Null when the API can't be reached: the
// browser then fetches them itself.
async function trackingConfig() {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}/api/public/tracking-config`, {
      headers: { 'X-Brand-Name': process.env.NEXT_PUBLIC_BRAND_NAME || 'soxbae' },
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
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        {/* Product photos come from the API host: open that connection at once
            so the main photo starts downloading as soon as it is found. */}
        <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in').origin} />
        <link rel="dns-prefetch" href={new URL(process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in').origin} />
        {/* The running ticker in the header starts moving on the shopper's first
            touch, click or key (globals.css: html:not(.mx-go) .sx-ticker-track).
            A bar in motion from the first frame keeps the screen "changing"
            while the page loads, which page-speed tests count against it. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){var d=document.documentElement,e=['pointerdown','touchstart','keydown','wheel'],g=function(){d.classList.add('mx-go');e.forEach(function(k){removeEventListener(k,g)})};e.forEach(function(k){addEventListener(k,g,{passive:true})})})()" }} />
        {/* Pictures wait (hidden) until fully loaded; with JavaScript off, show them straight away. */}
        <noscript><style>{'.shimmer-img{opacity:1!important}.shimmer-img-skeleton{display:none!important}'}</style></noscript>
        {/* Run before paint so the browser never restores the previous scroll
            position (which could show the footer first) on a fresh load. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}" }} />
      </head>
      <body>
        {/* Pictures stay hidden until fully loaded + decoded; this shows them
            as soon as they are ready, even before React has started. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{document.addEventListener('load',function(e){var t=e.target;if(!t||t.tagName!=='IMG'||!t.classList.contains('shimmer-img'))return;var r=function(){if(t.naturalWidth>0)t.classList.add('is-loaded')};if(t.decode){t.decode().then(r,function(){})}else{r()}},true)}catch(_){}})();" }} />
        {/* Deploy resilience (no Vercel Pro): reload once if a CSS chunk fails to load. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var K='__cssReload';window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);}catch(_){}})();" }} />
        <SentryInit />
        <VisitTracker />
        <ConsentSpeedInsights />
        <AuthProvider>
          <CartProvider>
            <SmoothScroll>
              <Header />
              <main id="main">{children}</main>
              <Footer />
              <LazyCartLayer />
            </SmoothScroll>
            <FloatingWidgets />
            <ToastHost />
            <Analytics initial={tracking} />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
