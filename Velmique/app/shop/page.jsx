import ShopGrid from '../_components/ShopGrid';
import { seoMeta } from '@/lib/site';

export const revalidate = 300;

// Dashboard SEO ('products') over the page's own copy. A note filter
// (?note=Oud) is a view of /shop, so it canonicalises to /shop.
export async function generateMetadata() {
  return seoMeta('products', {
    title: 'Shop All Fragrances — Velmique Maison de Parfum',
    description: 'Explore the full VELMIQUE fragrance collection — handcrafted eau de parfum for every you.',
    path: '/shop',
  });
}

export default function MaisonShop({ searchParams }) {
  const note = (searchParams?.note || '').toString().slice(0, 60);
  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">The collection</span>
        <h1>{note ? <>Scents with <em style={{ color: 'var(--m-accent-deep)' }}>{note}</em>.</> : 'Signature Scents.'}</h1>
        <p>{note ? `Every VELMIQUE fragrance carrying a ${note} note.` : 'Distinctly crafted, unmistakably you — explore every VELMIQUE fragrance.'}</p>
      </section>
      <ShopGrid note={note} />
    </>
  );
}
