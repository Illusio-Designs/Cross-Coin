/**
 * Meta / Facebook Commerce catalog feed → /facebook-catalog.xml
 * Same feed as /google-merchant.xml (Meta accepts the Google product-feed
 * format), under a Meta-friendly URL. Single source: re-exports the Google route.
 */
export { getServerSideProps, default } from './google-merchant.xml.js';
