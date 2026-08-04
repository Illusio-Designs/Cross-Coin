import '../styles/globals.css'
import '../styles/CartDrawer.css'
import { AuthProvider } from '../context/AuthContext'
import { CurrencyProvider } from '../context/CurrencyContext'
import { CartProvider } from '../context/CartContext'
import { WishlistProvider } from '../context/WishlistContext'
import Header from '../components/layout/Header'
import Footer from '../components/layout/Footer'
import CartDrawer from '../components/cart/CartDrawer'
import ToastViewport from '../components/ui/ToastViewport'
import WhatsAppChat from '../components/ui/WhatsAppChat'
import BackToTop from '../components/ui/BackToTop'
import Analytics from '../components/common/Analytics'
import SentryInit from '../components/SentryInit'
import { SpeedInsights } from '@vercel/speed-insights/next'

/* App shell — mirrors Crosscoin: every page is wrapped with the
   providers + a global Header / Footer / CartDrawer, so pages
   themselves only render their own content. */
function MyApp({ Component, pageProps }) {
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
              <main className="flex-1 pt-[76px] md:pt-[84px]">
                <Component {...pageProps} />
              </main>
              <Footer />
            </div>
            <CartDrawer />
            <ToastViewport />
            <WhatsAppChat />
            <BackToTop />
            <Analytics />
            <SentryInit />
            <SpeedInsights />
          </WishlistProvider>
        </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  )
}

export default MyApp
