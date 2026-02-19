import '../styles/globals.css'
import '../styles/components/Header.css'
import '../styles/components/Footer.css'
import '../styles/components/ProductCard.css'
import '../styles/pages/Home.css'
import '../styles/pages/Products.css'
import '../styles/pages/Auth.css'
import '../styles/pages/Account.css'
import { CurrencyProvider } from '../context/CurrencyContext'
import { AuthProvider } from '../context/AuthContext'

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <Component {...pageProps} />
      </CurrencyProvider>
    </AuthProvider>
  )
}

export default MyApp