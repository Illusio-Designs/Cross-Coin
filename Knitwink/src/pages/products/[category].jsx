import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProductCard from '../../components/ProductCard';

export default function CategoryProducts() {
  const router = useRouter();
  const { category } = router.query;
  const [activeFilter, setActiveFilter] = useState('all');
  const [sortBy, setSortBy] = useState('featured');

  useEffect(() => {
    if (category) {
      setActiveFilter(category);
    }
  }, [category]);

  // All products data
  const allProducts = [
    // Men's Socks
    { id: 1, name: 'Classic Dress Socks', price: 24.99, images: ['https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800', 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800'], category: 'men', badge: 'Bestseller', slug: 'classic-dress-socks' },
    { id: 2, name: 'Athletic Performance', price: 29.99, images: ['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800', 'https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=800'], category: 'men', slug: 'athletic-performance' },
    { id: 3, name: 'Casual Crew Socks', price: 19.99, images: ['https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=800', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800'], category: 'men', slug: 'casual-crew-socks' },
    { id: 4, name: 'Winter Wool Blend', price: 34.99, images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800', 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800'], category: 'men', badge: 'New', slug: 'winter-wool-blend' },
    
    // Women's Socks
    { id: 5, name: 'Ankle Socks Set', price: 22.99, images: ['https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800', 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800'], category: 'women', badge: 'New', slug: 'ankle-socks-set' },
    { id: 6, name: 'Knee High Socks', price: 27.99, images: ['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800', 'https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=800'], category: 'women', slug: 'knee-high-socks' },
    { id: 7, name: 'Compression Socks', price: 42.99, salePrice: 32.99, images: ['https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=800', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800'], category: 'women', badge: 'Sale', slug: 'compression-socks' },
    { id: 8, name: 'Cozy Knit Socks', price: 29.99, images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800', 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800'], category: 'women', slug: 'cozy-knit-socks' },
    
    // Accessories (Kids)
    { id: 9, name: 'Fun Pattern Kids', price: 18.99, images: ['https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800', 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800'], category: 'accessories', badge: 'Bestseller', slug: 'fun-pattern-kids' },
    { id: 10, name: 'School Socks Pack', price: 24.99, images: ['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800', 'https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=800'], category: 'accessories', slug: 'school-socks-pack' },
    { id: 11, name: 'Sports Socks Kids', price: 28.99, salePrice: 21.99, images: ['https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=800', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800'], category: 'accessories', badge: 'Sale', slug: 'sports-socks-kids' },
    { id: 12, name: 'Character Socks', price: 26.99, images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800', 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800'], category: 'accessories', slug: 'character-socks' },
    
    // New Arrivals
    { id: 13, name: 'Premium Merino Wool', price: 39.99, images: ['https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800', 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800'], category: 'new-arrivals', badge: 'New', slug: 'premium-merino-wool' },
    { id: 14, name: 'Bamboo Fiber Socks', price: 32.99, images: ['https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800', 'https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=800'], category: 'new-arrivals', badge: 'New', slug: 'bamboo-fiber-socks' },
    
    // Sale
    { id: 15, name: 'Cotton Blend Pack', price: 49.99, salePrice: 29.99, images: ['https://images.unsplash.com/photo-1581101767113-1677fc2beaa8?w=800', 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800'], category: 'sale', badge: 'Sale', slug: 'cotton-blend-pack' },
    { id: 16, name: 'Athletic Bundle', price: 59.99, salePrice: 39.99, images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800', 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800'], category: 'sale', badge: 'Sale', slug: 'athletic-bundle' },
  ];

  // Filter products
  const filteredProducts = activeFilter === 'all' 
    ? allProducts 
    : allProducts.filter(product => product.category === activeFilter);

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch(sortBy) {
      case 'price-low':
        return a.price - b.price;
      case 'price-high':
        return b.price - a.price;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const filters = [
    { id: 'all', label: 'All Products', count: allProducts.length },
    { id: 'men', label: "Men's Socks", count: allProducts.filter(p => p.category === 'men').length },
    { id: 'women', label: "Women's Socks", count: allProducts.filter(p => p.category === 'women').length },
    { id: 'accessories', label: 'Kids Socks', count: allProducts.filter(p => p.category === 'accessories').length },
    { id: 'new-arrivals', label: 'New Arrivals', count: allProducts.filter(p => p.category === 'new-arrivals').length },
    { id: 'sale', label: 'Sale', count: allProducts.filter(p => p.category === 'sale').length },
  ];

  const getCategoryTitle = () => {
    const filter = filters.find(f => f.id === category);
    return filter ? filter.label : 'Our Products';
  };

  return (
    <>
      <Head>
        <title>{getCategoryTitle()} - Knitwink</title>
        <meta name="description" content="Browse our complete collection of premium socks" />
      </Head>

      <Header />

      <main className="collectionsPage">
        {/* Hero Section */}
        <section className="collectionsHero">
          <div className="container">
            <h1>{getCategoryTitle()}</h1>
            <p>Premium comfort for every step</p>
          </div>
        </section>

        {/* Filters & Products */}
        <section className="collectionsContent">
          <div className="container">
            {/* Filter Bar */}
            <div className="filterBar">
              <div className="filterTabs">
                {filters.map(filter => (
                  <button
                    key={filter.id}
                    className={`filterTab ${activeFilter === filter.id ? 'active' : ''}`}
                    onClick={() => router.push(`/products/${filter.id}`)}
                  >
                    {filter.label}
                    <span className="filterCount">({filter.count})</span>
                  </button>
                ))}
              </div>

              <div className="sortDropdown">
                <label htmlFor="sort">Sort by:</label>
                <select 
                  id="sort" 
                  value={sortBy} 
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="featured">Featured</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="name">Name: A to Z</option>
                </select>
              </div>
            </div>

            {/* Products Grid */}
            <div className="productsGrid">
              {sortedProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Results Info */}
            <div className="resultsInfo">
              Showing {sortedProducts.length} of {allProducts.length} products
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
