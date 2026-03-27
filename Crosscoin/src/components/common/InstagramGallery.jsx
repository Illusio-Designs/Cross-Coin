import React, { useEffect, useState } from "react";
import { useCart } from "../../context/CartContext";
import { useRouter } from "next/router";
import { getInstagramFeed } from "../../services/publicApi";

const InstagramGallery = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);
  const [activePostId, setActivePostId] = useState(null);
  const { addToCart } = useCart();
  const router = useRouter();

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        setLoading(true);
        const data = await getInstagramFeed();
        if (!data?.success) {
          throw new Error(data.message || "Failed to load Instagram feed");
        }
        setPosts(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        setError(err.message || "Failed to load Instagram feed");
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, []);

  const handleAddToCart = async (product) => {
    if (!product) return;
    const payload = {
      id: product.id,
      name: product.name,
      price: product.price || 0,
      images: product.primary_image ? [product.primary_image] : [],
      comparePrice: product.comparePrice || 0,
      variations: [],
    };
    await addToCart(payload, null, null, 1, null, payload.images);
  };

  if (loading) return <div className="instagram-gallery__state">Loading Instagram feed...</div>;
  if (error) return <div className="instagram-gallery__state">{error}</div>;

  return (
    <section className="instagram-gallery">
      <div className="instagram-gallery__header">
        <h2>Instagram Gallery</h2>
      </div>

      <div className="instagram-gallery__grid">
        {posts.map((post) => {
          const imageUrl = post.media_type === "VIDEO" ? post.thumbnail_url || post.media_url : post.media_url;
          const hasTags = Array.isArray(post.tagged_products) && post.tagged_products.length > 0;
          const isOpen = activePostId === post.id;
          return (
            <div className="instagram-gallery__item" key={post.id}>
              <a href={post.permalink} target="_blank" rel="noreferrer" className="instagram-gallery__link">
                {imageUrl ? (
                  <img src={imageUrl} alt={post.caption || "Instagram post"} className="instagram-gallery__image" />
                ) : (
                  <div className="instagram-gallery__placeholder">No image</div>
                )}
                {post.media_type === "VIDEO" ? (
                  <span className="instagram-gallery__video-badge">▶</span>
                ) : null}
                <div className="instagram-gallery__overlay">
                  <p>{(post.caption || "View on Instagram").slice(0, 80)}</p>
                </div>
              </a>

              {hasTags ? (
                <>
                  <button
                    type="button"
                    className="instagram-gallery__tag-btn"
                    onClick={() => setActivePostId(isOpen ? null : post.id)}
                  >
                    🛍
                  </button>
                  {isOpen ? (
                    <div className="instagram-gallery__product-popup">
                      {post.tagged_products.map((product) => (
                        <div className="instagram-gallery__product" key={`${post.id}-${product.id}`}>
                          {product.primary_image ? (
                            <img src={product.primary_image} alt={product.name} />
                          ) : null}
                          <div>
                            <h4>{product.name}</h4>
                            <p>Rs. {Number(product.price || 0).toFixed(2)}</p>
                            <div className="instagram-gallery__product-actions">
                              <button type="button" onClick={() => handleAddToCart(product)}>
                                Add to Cart
                              </button>
                              {product.slug ? (
                                <button
                                  type="button"
                                  onClick={() => router.push(`/ProductDetails?slug=${product.slug}`)}
                                >
                                  View
                                </button>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default InstagramGallery;

