/**
 * Meta / Facebook Commerce catalog feed  →  /facebook-catalog.xml
 *
 * Meta Commerce Manager accepts the Google product-feed format (RSS 2.0 with
 * the g: namespace), so this serves the EXACT same feed as /google-merchant.xml
 * — just under a URL that reads correctly when you paste it into Meta:
 *   Commerce Manager → Catalog → Data sources → Add items → Scheduled feed →
 *   https://www.crosscoin.in/facebook-catalog.xml
 *
 * Single source of truth: it re-exports the Google feed route's server logic,
 * so the two URLs can never drift apart.
 */
export { getServerSideProps, default } from './google-merchant.xml.js';
