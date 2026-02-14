import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import { useCurrency } from '../../context/CurrencyContext';

// Sample product data
const sampleProducts = {
  'classic-crew-socks': {
    id: 1,
    name: 'Classic Crew Socks',
    category: 'Everyday Comfort',
    price: 24,
    description: 'Experience unparalleled comfort with our classic crew socks. Made from premium cotton blend with reinforced heel and toe for lasting durability.',
    images: [
      'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1580902394724-b08ff9ba7e8a?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=1000&fit=crop'
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Black', 'White', 'Gray', 'Navy'],
    badge: 'Bestseller',
    slug: 'classic-crew-socks',
    features: [
      'Premium cotton blend',
      'Reinforced heel and toe',
      'Moisture-wicking technology',
      'Arch support',
      'Machine washable'
    ]
  },
  'merino-wool-blend': {
    id: 2,
    name: 'Merino Wool Blend',
    category: 'Premium Collection',
    price: 35,
    salePrice: 28,
    description: 'Luxurious merino wool blend socks offering superior warmth and breathability. Perfect for all-day comfort.',
    images: [
      'https://images.unsplash.com/photo-1580902394724-b08ff9ba7e8a?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1580902394724-b08ff9ba7e8a?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&h=1000&fit=crop'
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Charcoal', 'Navy', 'Brown', 'Black'],
    badge: 'Sale',
    slug: 'merino-wool-blend',
    features: [
      'Merino wool blend',
      'Temperature regulating',
      'Odor resistant',
      'Cushioned sole',
      'Seamless toe'
    ]
  },
  'athletic-performance': {
    id: 3,
    name: 'Athletic Performance',
    category: 'Sports Collection',
    price: 28,
    description: 'High-performance athletic socks designed for maximum comfort during intense activities. Features advanced moisture management.',
    images: [
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=1000&fit=crop'
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['White', 'Black', 'Gray'],
    badge: 'New',
    slug: 'athletic-performance',
    features: [
      'Moisture-wicking fabric',
      'Compression support',
      'Ventilation zones',
      'Anti-blister design',
      'Quick-dry technology'
    ]
  },
  'luxury-cashmere': {
    id: 4,
    name: 'Luxury Cashmere',
    category: 'Premium Collection',
    price: 45,
    description: 'Indulge in ultimate luxury with our cashmere socks. Incredibly soft and warm, perfect for lounging or special occasions.',
    images: [
      'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=800&h=1000&fit=crop'
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: ['Beige', 'Gray', 'Black', 'Cream'],
    slug: 'luxury-cashmere',
    features: [
      '100% cashmere',
      'Ultra-soft texture',
      'Naturally insulating',
      'Lightweight',
      'Hand wash recommended'
    ]
  }
};

// Related products
const relatedProducts = [
  {
    id: 2,
    name: 'Merino Wool Blend',
    category: 'Premium Collection',
    price: 35,
    salePrice: 28,
    images: ['https://images.unsplash.com/photo-1580902394724-b08ff9ba7e8a?w=600&h=800&fit=crop'],
    badge: 'Sale',
    slug: 'merino-wool-blend'
  },
  {
    id: 3,
    name: 'Athletic Performance',
    category: 'Sports Collection',
    price: 28,
    images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=800&fit=crop'],
    badge: 'New',
    slug: 'athletic-performance'
  },
  {
    id: 4,
    name: 'Luxury Cashmere',
    category: 'Premium Collection',
    price: 45,
    images: ['https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=600&h=800&fit=crop'],
    slug: 'luxury-cashmere'
  },
  {
    id: 5,
    name: 'Cotton Ankle Socks',
    category: 'Everyday Comfort',
    price: 18,
    images: ['https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&h=800&fit=crop'],
    slug: 'cotton-ankle-socks'
  }
];

export default function ProductDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const { formatPrice } = useCurrency();
  
  const product = sampleProducts[slug] || sampleProducts['classic-crew-socks'];
  
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  const hasDiscount = product.salePrice && product.salePrice < product.price;
  const discountPercent = hasDiscount 
    ? Math.round(((product.price - product.salePrice) / product.price) * 100) 
    : 0;

  return (
    <>
      <Head>
        <title>{product.name} - Knitwink</title>
        <meta name="description" content={product.description} />
        <link rel="icon" href="/Knitwinkfavicon.jpeg" />
      </Head>

      <Header />

      <main className="productDetail">
        {/* Breadcrumb */}
        <div className="breadcrumb">
          <div className="container">
            <Link href="/">Home</Link>
            <span>/</span>
            <Link href="/shop">Shop</Link>
            <span>/</span>
            <span>{product.name}</span>
          </div>
        </div>

        {/* Product Section */}
        <section className="productSection">
          <div className="container">
            <div className="productGrid">
              {/* Product Images */}
              <div className="productImages">
                <div className="mainImage">
                  <Image
                    src={product.images[selectedImage]}
                    alt={product.name}
                    width={800}
                    height={1000}
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                  {product.badge && (
                    <span className="badge">{product.badge}</span>
                  )}
                  {hasDiscount && !product.badge && (
                    <span className="badge">-{discountPercent}%</span>
                  )}
                </div>
                <div className="thumbnailGrid">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <Image src={img} alt={`${product.name} ${index + 1}`} width={200} height={250} style={{ objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Info */}
              <div className="productInfo">
                {product.category && <span className="category">{product.category}</span>}
                <h1 className="productTitle">{product.name}</h1>
                
                <div className="priceContainer">
                  {hasDiscount ? (
                    <>
                      <span className="salePrice">{formatPrice(product.salePrice)}</span>
                      <span className="originalPrice">{formatPrice(product.price)}</span>
                      <span className="discountBadge">Save {discountPercent}%</span>
                    </>
                  ) : (
                    <span className="price">{formatPrice(product.price)}</span>
                  )}
                </div>

                <p className="description">{product.description}</p>

                {/* Size Selector */}
                {product.sizes && (
                  <div className="optionGroup">
                    <label>Size:</label>
                    <div className="sizeOptions">
                      {product.sizes.map(size => (
                        <button
                          key={size}
                          className={`sizeBtn ${selectedSize === size ? 'active' : ''}`}
                          onClick={() => setSelectedSize(size)}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Color Selector */}
                {product.colors && (
                  <div className="optionGroup">
                    <label>Color:</label>
                    <div className="colorOptions">
                      {product.colors.map(color => (
                        <button
                          key={color}
                          className={`colorBtn ${selectedColor === color ? 'active' : ''}`}
                          onClick={() => setSelectedColor(color)}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="optionGroup">
                  <label>Quantity:</label>
                  <div className="quantitySelector">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                    <span>{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)}>+</button>
                  </div>
                </div>

                {/* Actions */}
                <div className="productActions">
                  <button className="btn btn-primary btn-lg addToCartBtn">
                    Add to Cart
                  </button>
                  <button className="btnWishlist">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>

                {/* Features */}
                {product.features && (
                  <div className="features">
                    <h3>Features:</h3>
                    <ul>
                      {product.features.map((feature, index) => (
                        <li key={index}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Related Products */}
        <section className="relatedProducts">
          <div className="container">
            <h2>You May Also Like</h2>
            <div className="productsGrid">
              {relatedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .productDetail {
          min-height: 100vh;
          background-color: var(--color-white);
        }

        .breadcrumb {
          padding: var(--spacing-lg) 0;
          background-color: var(--color-gray-100);
          font-size: var(--font-size-sm);
          border-bottom: 1px solid var(--color-gray-200);
        }

        .breadcrumb .container {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .breadcrumb a {
          color: var(--color-gray-600);
          transition: color var(--transition-base);
        }

        .breadcrumb a:hover {
          color: var(--color-dark);
        }

        .breadcrumb span:last-child {
          color: var(--color-dark);
          font-weight: var(--font-weight-semibold);
        }

        .productSection {
          padding: var(--spacing-3xl) 0;
        }

        .productGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-4xl);
        }

        .productImages {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .mainImage {
          position: relative;
          aspect-ratio: 4/5;
          overflow: hidden;
          background-color: var(--color-gray-100);
          border: 1px solid var(--color-gray-200);
        }

        .mainImage img {
          width: 100%;
          height: 100%;
        }

        .badge {
          position: absolute;
          top: var(--spacing-lg);
          left: var(--spacing-lg);
          padding: var(--spacing-xs) var(--spacing-md);
          background-color: var(--color-dark);
          color: var(--color-white);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-bold);
          text-transform: uppercase;
          z-index: 2;
        }

        .thumbnailGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md);
        }

        .thumbnail {
          position: relative;
          aspect-ratio: 4/5;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all var(--transition-base);
          background: var(--color-gray-100);
          padding: 0;
        }

        .thumbnail:hover,
        .thumbnail.active {
          border-color: var(--color-dark);
        }

        .thumbnail img {
          width: 100%;
          height: 100%;
        }

        .productInfo {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .category {
          font-size: var(--font-size-xs);
          color: var(--color-gray-600);
          font-weight: var(--font-weight-bold);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .productTitle {
          font-family: var(--font-heading);
          font-size: var(--font-size-4xl);
          font-weight: var(--font-weight-black);
          color: var(--color-dark);
          margin: 0;
          letter-spacing: -1px;
        }

        .priceContainer {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        .price,
        .salePrice {
          font-family: var(--font-heading);
          font-size: var(--font-size-3xl);
          font-weight: var(--font-weight-black);
          color: var(--color-dark);
        }

        .originalPrice {
          font-size: var(--font-size-xl);
          color: var(--color-gray-500);
          text-decoration: line-through;
        }

        .discountBadge {
          padding: var(--spacing-xs) var(--spacing-sm);
          background-color: var(--color-dark);
          color: var(--color-white);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-bold);
        }

        .description {
          font-size: var(--font-size-base);
          line-height: 1.8;
          color: var(--color-gray-700);
        }

        .optionGroup {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .optionGroup label {
          font-family: var(--font-heading);
          font-weight: var(--font-weight-bold);
          color: var(--color-dark);
          text-transform: uppercase;
          font-size: var(--font-size-sm);
          letter-spacing: 1px;
        }

        .sizeOptions,
        .colorOptions {
          display: flex;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }

        .sizeBtn,
        .colorBtn {
          padding: var(--spacing-sm) var(--spacing-lg);
          border: 2px solid var(--color-gray-300);
          background-color: transparent;
          color: var(--color-dark);
          font-weight: var(--font-weight-semibold);
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .sizeBtn:hover,
        .colorBtn:hover,
        .sizeBtn.active,
        .colorBtn.active {
          border-color: var(--color-dark);
          background-color: var(--color-dark);
          color: var(--color-white);
        }

        .quantitySelector {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          border: 2px solid var(--color-gray-300);
          width: fit-content;
        }

        .quantitySelector button {
          padding: var(--spacing-sm) var(--spacing-lg);
          background: none;
          border: none;
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          cursor: pointer;
          color: var(--color-dark);
          transition: opacity var(--transition-base);
        }

        .quantitySelector button:hover {
          opacity: 0.7;
        }

        .quantitySelector span {
          min-width: 40px;
          text-align: center;
          font-weight: var(--font-weight-semibold);
        }

        .productActions {
          display: flex;
          gap: var(--spacing-md);
          margin-top: var(--spacing-lg);
        }

        .addToCartBtn {
          flex: 1;
        }

        .btnWishlist {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--color-dark);
          background-color: transparent;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .btnWishlist:hover {
          background-color: var(--color-dark);
          color: var(--color-white);
        }

        .features {
          padding: var(--spacing-xl);
          background-color: var(--color-gray-100);
          border: 1px solid var(--color-gray-200);
        }

        .features h3 {
          font-family: var(--font-heading);
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-bold);
          margin-bottom: var(--spacing-md);
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .features ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .features li {
          padding: var(--spacing-xs) 0;
          padding-left: var(--spacing-lg);
          position: relative;
          font-size: var(--font-size-sm);
        }

        .features li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--color-dark);
          font-weight: var(--font-weight-bold);
        }

        .relatedProducts {
          padding: var(--spacing-3xl) 0;
          background-color: var(--color-gray-100);
        }

        .relatedProducts h2 {
          font-family: var(--font-heading);
          font-size: var(--font-size-3xl);
          font-weight: var(--font-weight-black);
          text-align: center;
          margin-bottom: var(--spacing-3xl);
          letter-spacing: -1px;
        }

        .productsGrid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-xl);
        }

        @media (max-width: 1024px) {
          .productGrid {
            grid-template-columns: 1fr;
          }

          .productsGrid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .productTitle {
            font-size: var(--font-size-3xl);
          }

          .productsGrid {
            grid-template-columns: 1fr;
          }

          .thumbnailGrid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </>
  );
}
