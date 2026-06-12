
import { Inter, Playfair_Display, Dancing_Script } from 'next/font/google';
import '@/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { MobileMenu } from '@/components/layout/MobileMenu';
import { Breadcrumb } from '@/components/layout/Breadcrumb';
import CartDrawerMount from '@/components/cart/CartDrawerMount';
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

// Route segment config — forces dynamic rendering of every route
// under this layout. CartDrawerMount above handles the inner
// next/dynamic with ssr:false (which can only live inside a Client
// Component).
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${dancingScript.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="flex min-h-full w-full flex-col bg-off-white font-sans text-brand-black">
        <ClientProviders>
          <AuthProvider>
            <CartProvider>
              <Navbar />
              <Breadcrumb />
              <MobileMenu />
              <CartDrawerMount />
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