import '../styles/globals.css'
import '../styles/CartDrawer.css'
import '../styles/product-details.css'
import '../styles/review-badge.css'
import '../styles/cookie-banner.css'
import { AuthProvider } from '../context/AuthContext'
import { CurrencyProvider } from '../context/CurrencyContext'
import { CartProvider } from '../context/CartContext'
import { WishlistProvider } from '../context/WishlistContext'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import CartDrawer from '../components/cart/CartDrawer'
import ExitIntentModal from '../components/cart/ExitIntentModal'
import ToastViewport from '../components/ui/ToastViewport'
import WhatsAppChat from '../components/ui/WhatsAppChat'
import BackToTop from '../components/ui/BackToTop'
import Analytics from '../components/common/Analytics'
import VisitTracker from '../components/common/VisitTracker'
import SentryInit from '../components/SentryInit'
import ConsentSpeedInsights from '../components/common/ConsentSpeedInsights'
import CookieBanner from '../components/ui/CookieBanner'
import { useEffect } from 'react'

/* App shell — mirrors Crosscoin: every page is wrapped with the
   providers + a global Header / Footer / CartDrawer, so pages
   themselves only render their own content. */
function MyApp({ Component, pageProps }) {
  // Start every fresh page load at the top. The browser's default scroll
  // restoration re-applies the previous scroll position on reload, which in an
  // SPA can drop the user at the page bottom. Disable it and reset to top
  // (unless deep-linking to an in-page #anchor).
  useEffect(() => {
    try {
      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      if (!window.location.hash) window.scrollTo(0, 0);
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthProvider>
      <CurrencyProvider>
        <CartProvider>
          <WishlistProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              {/* Fixed header overlays content; default top clearance so normal
                  pages sit below it. Full-bleed heros opt out with a negative
                  top margin so they start behind the header. */}
              <main className="flex-1 pt-[116px] md:pt-[124px]">
                <Component {...pageProps} />
              </main>
              <Footer />
            </div>
            <CartDrawer />
            <ExitIntentModal />
            <ToastViewport />
            <WhatsAppChat />
            <BackToTop />
            <Analytics />
            <VisitTracker />
            <CookieBanner />
            <SentryInit />
            <ConsentSpeedInsights />
          </WishlistProvider>
        </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  )
}

export default MyApp
