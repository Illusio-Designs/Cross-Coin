
import { Inter, Playfair_Display, Dancing_Script } from 'next/font/google';
import '@/styles/globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
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

// See previous commit. Opting the route tree out of static prerender
// while we diagnose the runtime TDZ.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${dancingScript.variable} h-full antialiased`}>
      <body suppressHydrationWarning className="flex min-h-full w-full flex-col bg-off-white font-sans text-brand-black">
        {/* DIAGNOSTIC: layout stripped to bare minimum to isolate TDZ.
            All providers, nav, drawers, footer, hydrators temporarily
            removed. If this build renders the homepage cleanly, the
            cause is in one of the removed components. If it still
            crashes, the cause is in app/page.jsx itself. */}
        <ClientProviders>
          <main id="main" className="flex-1 pb-1">
            {children}
          </main>
          <ToastContainer />
        </ClientProviders>
      </body>
    </html>);

}