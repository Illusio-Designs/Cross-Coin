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
              <main className="flex-1">
                <Component {...pageProps} />
              </main>
              <Footer />
            </div>
            <CartDrawer />
            <ToastViewport />
          </WishlistProvider>
        </CartProvider>
      </CurrencyProvider>
    </AuthProvider>
  )
}

export default MyApp
