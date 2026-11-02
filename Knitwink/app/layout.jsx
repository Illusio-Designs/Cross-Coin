
import localFont from 'next/font/local';
import '@/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { BackToTop } from '@/components/ui/BackToTop';
import { WhatsAppChat } from '@/components/ui/WhatsAppChat';
import { WishlistHydrator } from '@/components/ui/WishlistHydrator';
import CartDrawerMount from '@/components/cart/CartDrawerMount';
import ExitIntentModal from '@/components/cart/ExitIntentModal';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import ClientProviders from '@/components/layout/ClientProviders';
import SentryInit from '@/components/SentryInit';
import VisitTracker from '@/components/common/VisitTracker';
import ConsentSpeedInsights from '@/components/layout/ConsentSpeedInsights';
import Analytics from '@/components/layout/Analytics';
import SmoothScroll from '@/components/SmoothScroll';
import { SITE_NAME } from '@/lib/constants';

// Inter, Playfair Display and Dancing Script (variable), basic Latin
// characters only — the same files Google serves for 'latin' (app/fonts).
// Google's versions also define an "extended Latin" file each (Inter 85 KB,
// Playfair 21 KB, Dancing Script 23 KB) whose range covers the rupee sign,
// so every page with a price downloaded them on the first screen; here ₹
// comes from the phone's own font instead.
const inter = localFont({
  src: './fonts/inter-latin-var.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-inter',
  display: 'swap',
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
});

const playfair = localFont({
  src: './fonts/playfair-latin-var.woff2',
  weight: '400 900',
  style: 'normal',
  variable: '--font-playfair',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
});

const dancingScript = localFont({
  src: './fonts/dancing-latin-var.woff2',
  weight: '400 700',
  style: 'normal',
  variable: '--font-dancing',
  display: 'swap',
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD' }],
});

export const metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`
  },
  description: 'Natural materials. Thoughtful design. A better footprint.',
  icons: {
    icon: '/Knitwinkfavicon.jpeg',
    shortcut: '/Knitwinkfavicon.jpeg',
    apple: '/Knitwinkfavicon.jpeg'
  },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website'
  },
  verification: {
    google: 'hob77L8ruZk751C4viqFjIqqG2G3o8XDJNj1cmYANgA'
  }
};


// The store's tracking IDs (GA4, Meta pixel, Clarity, GTM), read on the
// server and cached 5 minutes, so the page arrives with them and tracking
// starts without waiting for another request. Null when the API can't be
// reached: the browser then fetches them itself.
async function trackingConfig() {
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in'}/api/public/tracking-config`, {
      headers: { 'X-Brand-Name': process.env.NEXT_PUBLIC_BRAND_NAME || 'knitwink' },
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
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${dancingScript.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Moving strips start on the shopper's first touch, click, key or
            wheel (globals.css: html:not(.mx-go)). Motion from the first frame
            keeps the screen "changing" while the page loads, which page-speed
            tests count against it. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){var d=document.documentElement,e=['pointerdown','touchstart','keydown','wheel'],g=function(){d.classList.add('mx-go');e.forEach(function(k){removeEventListener(k,g)})};e.forEach(function(k){addEventListener(k,g,{passive:true})})})()" }} />
        {/* Pictures wait (hidden) until fully loaded; with JavaScript off, show them straight away. */}
        <noscript><style>{'.kw-img{filter:none!important}'}</style></noscript>
        {/* Run before paint so the browser never restores the previous scroll
            position (which could show the footer first) on a fresh load. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}" }} />
      </head>
      <body suppressHydrationWarning className="flex min-h-full w-full flex-col bg-off-white font-sans text-brand-black">
        {/* Deploy resilience (no Vercel Pro): reload once if a CSS chunk fails to load. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var K='__cssReload';window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);}catch(_){}})();" }} />
        {/* Content images (ShimmerImg, data-sk-img) stay hidden until fully
            loaded + decoded; this reveals them even before React hydrates. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{document.addEventListener('load',function(e){var t=e.target;if(!t||t.tagName!=='IMG'||!t.hasAttribute('data-sk-img'))return;var r=function(){t.classList.add('is-loaded')};if(t.decode){t.decode().then(r,r)}else{r()}},true)}catch(_){}})();" }} />
        <SentryInit />
        <VisitTracker />
        <ConsentSpeedInsights />
        <a href="#main" className="skip-to-main">Skip to main content</a>
        <ClientProviders>
          <AuthProvider>
            <CartProvider>
              <WishlistHydrator />
              <AnnouncementBar />
              <Navbar />
              <Breadcrumb />
              <MobileMenu />
              <CartDrawerMount />
              <ExitIntentModal />
              <main id="main" className="flex-1 pb-1">
                <SmoothScroll>{children}</SmoothScroll>
              </main>
              <Footer />
              <BackToTop />
              <WhatsAppChat />
              <ToastContainer />
              <Analytics initial={tracking} />
            </CartProvider>
          </AuthProvider>
        </ClientProviders>
      </body>
    </html>);

}