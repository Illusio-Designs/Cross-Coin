import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductShowcase from '@/components/product/ProductShowcase';
import Reviews from '@/components/reviews/Reviews';
import ProductCard from '@/components/home/ProductCard';
import { getProductBySlug, getAllProducts, getProductReviews } from '@/lib/api';

// Render on-demand with fresh data (never a stale/empty server cache), and so
// a surprising single product can never fail a static build.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  return p ? { title: p.name, description: p.description } : { title: 'Product' };
}

export default async function ProductPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = (await searchParams) || {};
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [all, reviews] = await Promise.all([getAllProducts(), getProductReviews(product.id)]);
  // One card per product (not every colour variation) in "You might also like".
  const seenRel = new Set();
  const related = all
    .filter((p) => p.categorySlug === product.categorySlug && p.slug !== product.slug)
    .filter((p) => { if (seenRel.has(p.slug)) return false; seenRel.add(p.slug); return true; })
    .slice(0, 5);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 20 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/products">Shop</Link>{' '}
        <span>/</span> <Link href={`/collections/${product.categorySlug}`}>{product.category}</Link>{' '}
        <span>/</span> <b>{product.name}</b>
      </nav>

      {/* ── Gallery + buy panel + About/Specs (shared variation selection) ── */}
      <ProductShowcase product={product} initialColor={sp.color} />

      {/* ── Reviews (same component as the home page + a Write-a-review button) ── */}
      <Reviews reviews={reviews} title="Customer reviews" productId={product.id} showWrite />

      {related.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="section-head"><h2>You might also like</h2></div>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.uid ?? p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
