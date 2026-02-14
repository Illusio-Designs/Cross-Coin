import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';
import { useCurrency } from '../../context/CurrencyContext';

// Sample product data (in real app, this would come from API/database)
const sampleProducts = {
  'premium-leather-jacket': {
    id: 1,
    name: 'Premium Leather Jacket',
    brand: 'Gripzus',
    price: 299,
    salePrice: 249,
    description: 'Crafted from the finest Italian leather, this premium jacket combines timeless style with modern comfort. Perfect for any occasion.',
    images: [
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1520975954732-35dd22299614?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1521223890158-f9f7c3d5d504?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=1000&fit=crop'
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'Brown', 'Navy'],
    badge: 'Sale',
    slug: 'premium-leather-jacket',
    features: [
      'Genuine Italian leather',
      'Premium YKK zippers',
      'Fully lined interior',
      'Multiple pockets',
      'Adjustable cuffs'
    ]
  },
  'classic-denim-jeans': {
    id: 2,
    name: 'Classic Denim Jeans',
    brand: 'Gripzus',
    price: 89,
    description: 'Timeless denim jeans crafted from premium cotton. Features a comfortable fit and durable construction for everyday wear.',
    images: [
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1475178626620-a4d074967452?w=800&h=1000&fit=crop'
    ],
    sizes: ['28', '30', '32', '34', '36', '38'],
    colors: ['Blue', 'Black', 'Gray'],
    badge: 'New',
    slug: 'classic-denim-jeans',
    features: [
      'Premium cotton denim',
      'Classic fit',
      'Five-pocket design',
      'Reinforced stitching',
      'Machine washable'
    ]
  },
  'luxury-watch': {
    id: 3,
    name: 'Luxury Watch',
    brand: 'Gripzus',
    price: 599,
    description: 'Elegant timepiece featuring Swiss movement and sapphire crystal. A perfect blend of sophistication and precision.',
    images: [
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=800&h=1000&fit=crop'
    ],
    sizes: ['One Size'],
    colors: ['Silver', 'Gold', 'Rose Gold'],
    badge: 'Bestseller',
    slug: 'luxury-watch',
    features: [
      'Swiss movement',
      'Sapphire crystal',
      'Water resistant',
      'Stainless steel case',
      'Leather strap'
    ]
  },
  'designer-sneakers': {
    id: 4,
    name: 'Designer Sneakers',
    brand: 'Gripzus',
    price: 159,
    description: 'Contemporary sneakers with premium materials and exceptional comfort. Perfect for casual and athletic wear.',
    images: [
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800&h=1000&fit=crop'
    ],
    sizes: ['7', '8', '9', '10', '11', '12'],
    colors: ['White', 'Black', 'Navy'],
    slug: 'designer-sneakers',
    features: [
      'Premium leather upper',
      'Cushioned insole',
      'Rubber outsole',
      'Breathable lining',
      'Lace-up closure'
    ]
  },
  'wool-coat': {
    id: 5,
    name: 'Wool Coat',
    brand: 'Gripzus',
    price: 399,
    salePrice: 299,
    description: 'Luxurious wool coat with classic tailoring. Stay warm and stylish during the colder months.',
    images: [
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&h=1000&fit=crop'
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Charcoal', 'Navy', 'Camel'],
    badge: 'Sale',
    slug: 'wool-coat',
    features: [
      'Premium wool blend',
      'Classic tailoring',
      'Fully lined',
      'Button closure',
      'Side pockets'
    ]
  },
  'silk-scarf': {
    id: 6,
    name: 'Silk Scarf',
    brand: 'Gripzus',
    price: 79,
    description: 'Elegant silk scarf with beautiful patterns. Add a touch of sophistication to any outfit.',
    images: [
      'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&h=1000&fit=crop'
    ],
    sizes: ['One Size'],
    colors: ['Red', 'Blue', 'Gold', 'Black'],
    slug: 'silk-scarf',
    features: [
      '100% silk',
      'Hand-rolled edges',
      'Versatile styling',
      'Lightweight',
      'Dry clean only'
    ]
  },
  'leather-bag': {
    id: 7,
    name: 'Leather Bag',
    brand: 'Gripzus',
    price: 249,
    description: 'Handcrafted leather bag with spacious interior. Perfect for work or travel with timeless design.',
    images: [
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=800&h=1000&fit=crop'
    ],
    sizes: ['One Size'],
    colors: ['Brown', 'Black', 'Tan'],
    badge: 'New',
    slug: 'leather-bag',
    features: [
      'Genuine leather',
      'Multiple compartments',
      'Adjustable strap',
      'Secure zipper closure',
      'Interior pockets'
    ]
  },
  'cashmere-sweater': {
    id: 8,
    name: 'Cashmere Sweater',
    brand: 'Gripzus',
    price: 189,
    description: 'Luxuriously soft cashmere sweater. Experience ultimate comfort and warmth with this premium piece.',
    images: [
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&h=1000&fit=crop',
      'https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&h=1000&fit=crop'
    ],
    sizes: ['XS', 'S', 'M', 'L', 'XL'],
    colors: ['Beige', 'Gray', 'Navy', 'Black'],
    slug: 'cashmere-sweater',
    features: [
      '100% cashmere',
      'Crew neck',
      'Ribbed cuffs',
      'Soft and warm',
      'Hand wash recommended'
    ]
  }
};

// Related products
const relatedProducts = [
  {
    id: 2,
    name: 'Classic Denim Jeans',
    brand: 'Gripzus',
    price: 89,
    images: ['https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=800&fit=crop'],
    badge: 'New',
    slug: 'classic-denim-jeans'
  },
  {
    id: 3,
    name: 'Luxury Watch',
    brand: 'Gripzus',
    price: 599,
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&h=800&fit=crop'],
    slug: 'luxury-watch'
  },
  {
    id: 4,
    name: 'Designer Sneakers',
    brand: 'Gripzus',
    price: 159,
    images: ['https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=600&h=800&fit=crop'],
    slug: 'designer-sneakers'
  },
  {
    id: 5,
    name: 'Wool Coat',
    brand: 'Gripzus',
    price: 399,
    salePrice: 299,
    images: ['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=600&h=800&fit=crop'],
    badge: 'Sale',
    slug: 'wool-coat'
  }
];

export default function ProductDetail() {
  const router = useRouter();
  const { slug } = router.query;
  const { formatPrice } = useCurrency();
  
  const product = sampleProducts[slug] || sampleProducts['premium-leather-jacket'];
  
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
        <title>{product.name} - Gripzus</title>
        <meta name="description" content={product.description} />
      </Head>

      <Header />

      <main className="product-detail">
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
        <section className="product-section">
          <div className="container">
            <div className="product-grid">
              {/* Product Images */}
              <div className="product-images">
                <div className="main-image">
                  <Image
                    src={product.images[selectedImage]}
                    alt={product.name}
                    fill
                    className="image"
                    priority
                  />
                  {product.badge && (
                    <span className="badge">{product.badge}</span>
                  )}
                  {hasDiscount && !product.badge && (
                    <span className="badge">-{discountPercent}%</span>
                  )}
                </div>
                <div className="thumbnail-grid">
                  {product.images.map((img, index) => (
                    <button
                      key={index}
                      className={`thumbnail ${selectedImage === index ? 'active' : ''}`}
                      onClick={() => setSelectedImage(index)}
                    >
                      <Image src={img} alt={`${product.name} ${index + 1}`} fill />
                    </button>
                  ))}
                </div>
              </div>

              {/* Product Info */}
              <div className="product-info">
                {product.brand && <span className="brand">{product.brand}</span>}
                <h1 className="product-title">{product.name}</h1>
                
                <div className="price-container">
                  {hasDiscount ? (
                    <>
                      <span className="sale-price">{formatPrice(product.salePrice)}</span>
                      <span className="original-price">{formatPrice(product.price)}</span>
                      <span className="discount-badge">Save {discountPercent}%</span>
                    </>
                  ) : (
                    <span className="price">{formatPrice(product.price)}</span>
                  )}
                </div>

                <p className="description">{product.description}</p>

                {/* Size Selector */}
                {product.sizes && (
                  <div className="option-group">
                    <label>Size:</label>
                    <div className="size-options">
                      {product.sizes.map(size => (
                        <button
                          key={size}
                          className={`size-btn ${selectedSize === size ? 'active' : ''}`}
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
                  <div className="option-group">
                    <label>Color:</label>
                    <div className="color-options">
                      {product.colors.map(color => (
                        <button
                          key={color}
                          className={`color-btn ${selectedColor === color ? 'active' : ''}`}
                          onClick={() => setSelectedColor(color)}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="option-group">
                  <label>Quantity:</label>
                  <div className="quantity-selector">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                    <span>{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)}>+</button>
                  </div>
                </div>

                {/* Actions */}
                <div className="product-actions">
                  <button className="btn btn-primary btn-lg add-to-cart-btn">
                    Add to Cart
                  </button>
                  <button className="btn-wishlist">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="currentColor" strokeWidth="2"/>
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
        <section className="related-products">
          <div className="container">
            <h2>You May Also Like</h2>
            <div className="products-grid">
              {relatedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />

      <style jsx>{`
        .product-detail {
          min-height: 100vh;
          background-color: var(--bg-primary);
        }

        .breadcrumb {
          padding: var(--spacing-lg) 0;
          background-color: var(--bg-secondary);
          font-size: var(--font-size-sm);
        }

        .breadcrumb .container {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .breadcrumb a {
          color: var(--text-secondary);
          transition: color var(--transition-base);
        }

        .breadcrumb a:hover {
          color: var(--color-accent);
        }

        .breadcrumb span:last-child {
          color: var(--text-primary);
          font-weight: var(--font-weight-semibold);
        }

        .product-section {
          padding: var(--spacing-4xl) 0;
        }

        .product-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-4xl);
        }

        .product-images {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .main-image {
          position: relative;
          aspect-ratio: 3/4;
          border-radius: var(--radius-xl);
          overflow: hidden;
          background-color: var(--bg-secondary);
        }

        .main-image .image {
          object-fit: cover;
        }

        .badge {
          position: absolute;
          top: var(--spacing-lg);
          left: var(--spacing-lg);
          padding: var(--spacing-xs) var(--spacing-md);
          background-color: var(--color-accent);
          color: var(--color-primary);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-bold);
          text-transform: uppercase;
          border-radius: var(--radius-md);
          z-index: 2;
        }

        .thumbnail-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md);
        }

        .thumbnail {
          position: relative;
          aspect-ratio: 3/4;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all var(--transition-base);
          background: none;
          padding: 0;
        }

        .thumbnail:hover,
        .thumbnail.active {
          border-color: var(--color-accent);
        }

        .thumbnail img {
          object-fit: cover;
        }

        .product-info {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg);
        }

        .brand {
          font-size: var(--font-size-sm);
          color: var(--color-accent);
          font-weight: var(--font-weight-bold);
          text-transform: uppercase;
          letter-spacing: var(--letter-spacing-wide);
        }

        .product-title {
          font-family: var(--font-heading);
          font-size: var(--font-size-4xl);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
          margin: 0;
        }

        .price-container {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          flex-wrap: wrap;
        }

        .price,
        .sale-price {
          font-size: var(--font-size-3xl);
          font-weight: var(--font-weight-bold);
          color: var(--text-primary);
        }

        .original-price {
          font-size: var(--font-size-xl);
          color: var(--text-secondary);
          text-decoration: line-through;
        }

        .discount-badge {
          padding: var(--spacing-xs) var(--spacing-sm);
          background-color: var(--color-primary);
          color: var(--text-inverse);
          font-size: var(--font-size-xs);
          font-weight: var(--font-weight-bold);
          border-radius: var(--radius-md);
        }

        .description {
          font-size: var(--font-size-base);
          line-height: var(--line-height-relaxed);
          color: var(--text-secondary);
        }

        .option-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .option-group label {
          font-weight: var(--font-weight-semibold);
          color: var(--text-primary);
        }

        .size-options,
        .color-options {
          display: flex;
          gap: var(--spacing-sm);
          flex-wrap: wrap;
        }

        .size-btn,
        .color-btn {
          padding: var(--spacing-sm) var(--spacing-lg);
          border: 2px solid var(--border-medium);
          background-color: transparent;
          color: var(--text-primary);
          font-weight: var(--font-weight-semibold);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .size-btn:hover,
        .color-btn:hover,
        .size-btn.active,
        .color-btn.active {
          border-color: var(--color-accent);
          background-color: var(--color-accent);
          color: var(--color-primary);
        }

        .quantity-selector {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          border: 2px solid var(--border-medium);
          border-radius: var(--radius-md);
          width: fit-content;
        }

        .quantity-selector button {
          padding: var(--spacing-sm) var(--spacing-lg);
          background: none;
          border: none;
          font-size: var(--font-size-xl);
          font-weight: var(--font-weight-bold);
          cursor: pointer;
          color: var(--text-primary);
          transition: color var(--transition-base);
        }

        .quantity-selector button:hover {
          color: var(--color-accent);
        }

        .quantity-selector span {
          min-width: 40px;
          text-align: center;
          font-weight: var(--font-weight-semibold);
        }

        .product-actions {
          display: flex;
          gap: var(--spacing-md);
          margin-top: var(--spacing-lg);
        }

        .add-to-cart-btn {
          flex: 1;
        }

        .btn-wishlist {
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--border-medium);
          background-color: transparent;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .btn-wishlist:hover {
          border-color: var(--color-accent);
          background-color: var(--color-accent);
          color: var(--color-primary);
        }

        .features {
          padding: var(--spacing-xl);
          background-color: var(--bg-secondary);
          border-radius: var(--radius-lg);
        }

        .features h3 {
          font-size: var(--font-size-lg);
          margin-bottom: var(--spacing-md);
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
        }

        .features li::before {
          content: '✓';
          position: absolute;
          left: 0;
          color: var(--color-accent);
          font-weight: var(--font-weight-bold);
        }

        .related-products {
          padding: var(--spacing-4xl) 0;
          background-color: var(--bg-secondary);
        }

        .related-products h2 {
          font-family: var(--font-heading);
          font-size: var(--font-size-3xl);
          font-weight: var(--font-weight-bold);
          text-align: center;
          margin-bottom: var(--spacing-3xl);
        }

        .products-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-xl);
        }

        @media (max-width: 1024px) {
          .product-grid {
            grid-template-columns: 1fr;
          }

          .products-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .product-title {
            font-size: var(--font-size-3xl);
          }

          .products-grid {
            grid-template-columns: 1fr;
          }

          .thumbnail-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>
    </>
  );
}
