import ProductPage from '../../page';

// The product page opened on one colour. Shoppers never type this address:
// the edge middleware rewrites /products/<slug> here when they came from a
// card of that colour (see middleware.js), and the address bar keeps
// /products/<slug>. Cached like the plain page; canonical/meta come from it.
export { generateMetadata } from '../../page';

export const revalidate = 60;

export async function generateStaticParams() {
  return [];
}

export default ProductPage;
