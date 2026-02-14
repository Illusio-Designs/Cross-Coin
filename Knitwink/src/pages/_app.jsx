import '../styles/globals.css';
import '../styles/components/Header.css';
import '../styles/components/Footer.css';
import '../styles/components/ProductCard.css';
import '../styles/pages/Home.css';
import '../styles/pages/About.css';
import '../styles/pages/Contact.css';
import { CurrencyProvider } from '../context/CurrencyContext';

export default function App({ Component, pageProps }) {
  return (
    <CurrencyProvider>
      <Component {...pageProps} />
    </CurrencyProvider>
  );
}
