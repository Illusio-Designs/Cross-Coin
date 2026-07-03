
import { Suspense } from 'react';
import { Inter, Playfair_Display, Dancing_Script, Cormorant_Garamond } from 'next/font/google';
import '@/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { BackToTop } from '@/components/ui/BackToTop';
import { WhatsAppChat } from '@/components/ui/WhatsAppChat';
import { WishlistHydrator } from '@/components/ui/WishlistHydrator';
import { GrainOverlay } from '@/components/ui/GrainOverlay';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import ClientProviders from '@/components/layout/ClientProviders';
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

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap'
});

export const metadata = {
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`
  },
  description: 'Fine jewellery handcrafted in our atelier — hallmarked 18k gold and certified diamonds, made to become heirlooms.',
  icons: {
    icon: '/velquira-logo.svg',
    shortcut: '/velquira-logo.svg',
    apple: '/Velquirafavicon.jpeg'
  },
  openGraph: {
    siteName: SITE_NAME,
    type: 'website'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${dancingScript.variable} ${cormorant.variable} h-full scroll-smooth antialiased`}>
      <head>
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
                var s = document.createElement('script');
                s.type = 'text/javascript';
                s.src = 'https://verify.msg91.com/otp-provider.js';
                s.onload = function() {
                  if (typeof initSendOTP === 'function') initSendOTP(configuration);
                };
                document.head.appendChild(s);
              })();
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning className="flex min-h-full w-full flex-col bg-ivory font-sans text-brand-black">
        <GrainOverlay />
        <a href="#main" className="skip-to-main">Skip to main content</a>
        <ClientProviders>
          <AuthProvider>
          <CartProvider>
          <WishlistHydrator />
          <Navbar />
          <Breadcrumb />
          <MobileMenu />
          <CartDrawer />
          <main id="main" className="flex-1 pb-1">
            {children}
          </main>
          <Footer />
          <BackToTop />
          <WhatsAppChat />
          <Suspense fallback={null}>
            <Analytics />
          </Suspense>
          <ToastContainer />
          </CartProvider>
          </AuthProvider>
        </ClientProviders>
      </body>
    </html>);

}