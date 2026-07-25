import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import Analytics from '@/components/layout/Analytics';

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  metadataBase: new URL('https://www.morbixsocks.com'),
  title: {
    default: 'Morbix — Premium socks for sport & city life',
    template: '%s | Morbix',
  },
  description:
    'Morbix premium socks: engineered knit, lasting cushioning and clean design for every step — for sport and the city.',
  openGraph: {
    siteName: 'Morbix',
    type: 'website',
    title: 'Morbix — Premium socks for sport & city life',
    description: 'Engineered knit, lasting cushioning and clean design in every step.',
  },
  icons: { icon: '/icon.svg' },
  // Deployment marker so we can verify EXACTLY which commit is live:
  // view page source and search for <meta name="x-build" …>.
  other: { 'x-build': (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7) },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* MSG91 OTP widget bootstrap — the SAME shared widget the other brands
            use. Exposes window.sendOtp / window.verifyOtp for phone-OTP login.
            Loaded on idle so it never blocks first paint. */}
        <Script id="msg91-otp" strategy="afterInteractive">
          {`(function(){
            var configuration = {
              widgetId: "366342706343383735393039",
              tokenAuth: "426738T7QwVqDd1uX69c7fc1dP1",
              exposeMethods: true,
              identifier: "",
              captchaType: "invisible",
              success: function(data){ window.__msg91OtpSuccess = data; },
              failure: function(error){ window.__msg91OtpFailure = error; }
            };
            function loadMsg91(){
              if (window.__msg91Started) return;
              window.__msg91Started = true;
              var s = document.createElement('script');
              s.type = 'text/javascript'; s.async = true;
              s.src = 'https://verify.msg91.com/otp-provider.js';
              s.onload = function(){ if (typeof initSendOTP === 'function') initSendOTP(configuration); };
              document.head.appendChild(s);
            }
            var ric = window.requestIdleCallback || function(cb){ return setTimeout(cb, 2000); };
            ric(loadMsg91);
          })();`}
        </Script>
        <AuthProvider>
          <CartProvider>
            <SmoothScroll>
              <Header />
              <main id="main">{children}</main>
              <Footer />
              <CartDrawer />
            </SmoothScroll>
            <Analytics />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
