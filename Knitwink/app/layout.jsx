
import { Inter, Playfair_Display, Dancing_Script } from 'next/font/google';
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
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import ClientProviders from '@/components/layout/ClientProviders';
import SentryInit from '@/components/SentryInit';
import VisitTracker from '@/components/common/VisitTracker';
import { SpeedInsights } from '@vercel/speed-insights/next';
import Analytics from '@/components/layout/Analytics';
import { SITE_NAME } from '@/lib/constants';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap'
});

const dancingScript = Dancing_Script({
  subsets: ['latin'],
  variable: '--font-dancing',
  display: 'swap'
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


export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${dancingScript.variable} h-full antialiased`}>
      <head>
        {/* MSG91 OTP bootstrap — self-generated, intentionally bypasses
            DOMPurify. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var configuration = {
                  widgetId: "366342706343383735393039",
                  tokenAuth: "426738T7QwVqDd1uX69c7fc1dP1",
                  exposeMethods: true,
                  identifier: "",
                  captchaType: "invisible",
                  success: function(data) { window.__msg91OtpSuccess = data; },
                  failure: function(error) { window.__msg91OtpFailure = error; }
                };
                // Only login + checkout need this; never at first paint. Defer
                // the third-party script until the browser is idle so it doesn't
                // compete with the critical render on every page.
                function loadMsg91() {
                  if (window.__msg91Started) return;
                  window.__msg91Started = true;
                  var s = document.createElement('script');
                  s.type = 'text/javascript';
                  s.async = true;
                  s.src = 'https://verify.msg91.com/otp-provider.js';
                  s.onload = function() {
                    if (typeof initSendOTP === 'function') initSendOTP(configuration);
                  };
                  document.head.appendChild(s);
                }
                var ric = window.requestIdleCallback || function(cb){ return setTimeout(cb, 2500); };
                ric(loadMsg91);
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="flex min-h-full w-full flex-col bg-off-white font-sans text-brand-black">
        {/* Deploy resilience (no Vercel Pro): reload once if a CSS chunk fails to load. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var K='__cssReload';window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);}catch(_){}})();" }} />
        <SentryInit />
        <VisitTracker />
        <SpeedInsights />
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
              <main id="main" className="flex-1 pb-1">
                {children}
              </main>
              <Footer />
              <BackToTop />
              <WhatsAppChat />
              <ToastContainer />
              <Analytics />
              {/* Meta Pixel <noscript> fallback (JS-disabled visitors) */}
              <noscript>
                <img
                  height="1"
                  width="1"
                  style={{ display: 'none' }}
                  alt=""
                  src="https://www.facebook.com/tr?id=1029243193162708&ev=PageView&noscript=1"
                />
              </noscript>
            </CartProvider>
          </AuthProvider>
        </ClientProviders>
      </body>
    </html>);

}