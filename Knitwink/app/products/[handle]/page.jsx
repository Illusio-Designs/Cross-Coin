

import { getProduct } from '@/lib/api/products';
import { ProductPageClient } from '@/components/product/ProductPageClient';
import { FeatureBreakdown } from '@/components/product/FeatureBreakdown';
import { CrossSell } from '@/components/product/CrossSell';
import { ReviewsSection } from '@/components/product/ReviewsSection';





// Fallback product for when API is unavailable
const FALLBACK_PRODUCT = {
  id: 'wool-runner-demo',
  handle: 'wool-runner',
  name: 'Wool Runner',
  collectionName: "Men's",
  price: 13500,
  compareAtPrice: 15000,
  images: [
  { url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80', alt: 'Wool Runner — Natural Grey' },
  { url: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=900&q=80', alt: 'Wool Runner — side view' },
  { url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=900&q=80', alt: 'Wool Runner — sole detail' },
  { url: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=900&q=80', alt: 'Wool Runner — on foot' }],

  variants: [
  { id: 'v1', size: 'UK 6', color: 'Natural Grey', stock: 5, sku: 'WR-NG-6' },
  { id: 'v2', size: 'UK 7', color: 'Natural Grey', stock: 3, sku: 'WR-NG-7' },
  { id: 'v3', size: 'UK 8', color: 'Natural Grey', stock: 0, sku: 'WR-NG-8' },
  { id: 'v4', size: 'UK 9', color: 'Natural Grey', stock: 8, sku: 'WR-NG-9' },
  { id: 'v5', size: 'UK 10', color: 'Natural Grey', stock: 2, sku: 'WR-NG-10' },
  { id: 'v6', size: 'UK 11', color: 'Natural Grey', stock: 4, sku: 'WR-NG-11' },
  { id: 'v7', size: 'UK 6', color: 'Blizzard', stock: 6, sku: 'WR-BL-6' },
  { id: 'v8', size: 'UK 7', color: 'Blizzard', stock: 1, sku: 'WR-BL-7' },
  { id: 'v9', size: 'UK 8', color: 'Blizzard', stock: 4, sku: 'WR-BL-8' }],

  colors: [
  { name: 'Natural Grey', hex: '#bebab0', imageIndex: 0 },
  { name: 'Blizzard', hex: '#f7f5f0', imageIndex: 1 },
  { name: 'Sage', hex: '#7b9e87', imageIndex: 2 }],

  features: [
  { icon: 'leaf', title: 'ZQ Merino Wool', description: 'Sourced from farms with the highest animal welfare standards.' },
  { icon: 'wind', title: 'Temperature Regulating', description: 'Naturally adapts to keep you comfortable in any weather.' },
  { icon: 'droplets', title: 'Moisture-Wicking', description: 'Draws moisture away from your skin to keep feet dry.' },
  { icon: 'recycle', title: 'Carbon Neutral', description: 'We measure, reduce, and offset every product\'s footprint.' },
  { icon: 'shield', title: 'Machine Washable', description: 'Easy care — just toss them in the wash on a gentle cycle.' },
  { icon: 'zap', title: 'SweetFoam® Sole', description: 'Made from sugarcane, the world\'s first carbon-negative EVA.' }],

  description: 'The Wool Runner is our original shoe — the one that started it all. Made with ZQ-certified merino wool, it\'s naturally temperature-regulating, moisture-wicking, and odor-resistant. Pair it with our SweetFoam® midsole made from sugarcane and you\'ve got a shoe that\'s as good for the planet as it is for your feet.',
  carbonFootprint: 9.9,
  badge: 'Bestseller',
  materials: ['Merino Wool', 'SweetFoam®', 'Recycled Nylon']
};

export async function generateMetadata({ params }) {
  const { handle } = await params;
  try {
    const product = await getProduct(handle);
    return {
      title: product.name,
      description: product.description,
      openGraph: {
        title: product.name,
        description: product.description,
        images: product.images[0] ? [{ url: product.images[0].url }] : []
      }
    };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }) {
  const { handle } = await params;

  let product = FALLBACK_PRODUCT;
  try {
    product = await getProduct(handle);
  } catch {


    // API unavailable — use fallback
  }return (
    <>
      {/* Gallery + Info */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-5 py-10 lg:px-8">
        <ProductPageClient product={product} />
      </section>

      {/* Description — full width below gallery+info */}
      {product.description &&
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-5 py-10 lg:px-8">
          <div className="mx-auto max-w-site">
            <h2 className="mb-4 text-xl font-semibold text-brand-black">Product Description</h2>
            <p className="text-base leading-relaxed text-gray-600">{product.description}</p>
          </div>
        </section>
      }

      {/* Built different */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white">
        <FeatureBreakdown features={product.features} />
      </section>

      {/* Reviews — infinite slider */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white">
        <ReviewsSection />
      </section>

      {/* Cross-sell */}
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white">
        <CrossSell currentHandle={product.handle} />
      </section>
    </>);

}