import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductShowcase from '@/components/product/ProductShowcase';
import ProductReviews from '@/components/product/ProductReviews';
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

export default async function ProductPage({ params }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [all, reviews] = await Promise.all([getAllProducts(), getProductReviews(product.id)]);
  const related = all.filter((p) => p.categorySlug === product.categorySlug && p.slug !== product.slug).slice(0, 5);

  return (
    <div className="container" style={{ paddingTop: 24, paddingBottom: 20 }}>
      <nav className="crumbs">
        <Link href="/">Home</Link> <span>/</span> <Link href="/products">Shop</Link>{' '}
        <span>/</span> <Link href={`/collections/${product.categorySlug}`}>{product.category}</Link>{' '}
        <span>/</span> <b>{product.name}</b>
      </nav>

      {/* ── Gallery + buy panel + About/Specs (shared variation selection) ── */}
      <ProductShowcase product={product} />

      {/* ── Reviews (real stats + write-a-review) ── */}
      <ProductReviews
        productId={product.id}
        initialReviews={reviews}
        fallbackRating={product.rating}
        fallbackCount={product.reviews}
      />

      {related.length > 0 && (
        <section className="section" style={{ paddingBottom: 0 }}>
          <div className="section-head"><h2>You might also like</h2></div>
          <div className="product-grid">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
    </div>
  );
}
