
import { Inter, Playfair_Display, Dancing_Script } from 'next/font/google';
import '@/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

/* CartDrawer is dynamically imported on the client only. Static
   import into the layout chunk reproducibly triggered a TDZ
   ("Cannot access 'eg'/'ed' before initialization") in the
   minified client bundle — caused by CartDrawer's heavy import
   chain (react-hook-form, zod resolver, react-query, multiple
   api helpers) all landing in the layout's chunk and forming a
   circular dependency that Turbopack couldn't safely hoist.
   Dynamic import puts CartDrawer in its own chunk, loaded only
   on the client at first render, which breaks the cycle. */
const CartDrawer = dynamic(
  () => import('@/components/cart/CartDrawer').then((m) => ({ default: m.CartDrawer })),
  { ssr: false }
);
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import ClientProviders from '@/components/layout/ClientProviders';
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

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${dancingScript.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="flex min-h-full w-full flex-col bg-off-white font-sans text-brand-black">
        {/* Back to the known-clean configuration. Only the proven-clean
            layout components are mounted. CartDrawer + Half B components
            (AnnouncementBar/BackToTop/WhatsAppChat/WishlistHydrator/
            Analytics) are still off — they'll come back one at a time
            as we identify which one carries the cycle. */}
        <ClientProviders>
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <Breadcrumb />
              <MobileMenu />
              <CartDrawer />
              <main id="main" className="flex-1 pb-1">
                {children}
              </main>
              <Footer />
              <ToastContainer />
            </CartProvider>
          </AuthProvider>
        </ClientProviders>
      </body>
    </html>);

}