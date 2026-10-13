import Link from 'next/link';
import { notFound } from 'next/navigation';
import ProductShowcase from '@/components/product/ProductShowcase';
import ProductReviews from '@/components/product/ProductReviews';
import ProductDetailBlocks from '@/components/product/ProductDetailBlocks';
import ReviewsSection from '@/components/home/ReviewsSection';
import ProductCard from '@/components/home/ProductCard';
import { getProductBySlug, getAllProducts, getProductReviewsWithTotal, getStoreReviews } from '@/lib/api';

// Incrementally static (ISR): cache each product page and revalidate it every
// 5 minutes, so PDPs serve fast from cache while staying reasonably fresh.
export const revalidate = 300;

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

  const [all, reviewsData, storeReviews] = await Promise.all([
    getAllProducts(),
    getProductReviewsWithTotal(product.id),
    getStoreReviews(300),
  ]);
  const reviews = reviewsData.reviews;
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

      {/* ── Ideal for, care and manufacturing ── */}
      <div className="pdd-wrap">
        <ProductDetailBlocks product={product} />
      </div>

      {/* ── Reviews (real stats + write-a-review) ── */}
      <ProductReviews
        productId={product.id}
        initialReviews={reviews}
        totalCount={reviewsData.total}
        fallbackRating={product.rating}
        fallbackCount={product.reviews}
      />

      {/* ── Brand-wide testimonials — same 3-row moving wall as the home page ── */}
      <ReviewsSection reviews={storeReviews.reviews} total={storeReviews.total} />

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
