
import { Inter, Playfair_Display, Dancing_Script } from 'next/font/google';
import '@/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { BackToTop } from '@/components/ui/BackToTop';
import { WhatsAppChat } from '@/components/ui/WhatsAppChat';
import { WishlistHydrator } from '@/components/ui/WishlistHydrator';
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
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${dancingScript.variable} h-full antialiased`}>
      <head>
        {/* Self-generated bootstrap snippet for MSG91 OTP — NOT user-
            authored content, so it intentionally bypasses DOMPurify.
            Don't sanitise this; it would mangle the JavaScript. */}
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
      <body suppressHydrationWarning className="flex min-h-full w-full flex-col bg-off-white font-sans text-brand-black">
        {/* First focusable element — lets keyboard / screen-reader users
            skip past the nav directly to the page content. Styled in
            globals.css to be hidden until focused. */}
        <a href="#main" className="skip-to-main">Skip to main content</a>
        <ClientProviders>
        <AuthProvider>
        <CartProvider>
        <WishlistHydrator />
        <AnnouncementBar />
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
        <ToastContainer />
        <Analytics />
        </CartProvider>
        </AuthProvider>
        </ClientProviders>
      </body>
    </html>);

}