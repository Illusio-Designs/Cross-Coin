import '../styles/globals.css'
import '../styles/components/Header.css'
import '../styles/components/Footer.css'
import '../styles/components/ProductCard.css'
import '../styles/pages/Home.css'
import { CurrencyProvider } from '../context/CurrencyContext'

function MyApp({ Component, pageProps }) {
  return (
    <CurrencyProvider>
      <Component {...pageProps} />
    </CurrencyProvider>
  )
}

export default MyApp