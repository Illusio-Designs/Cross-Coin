import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useCart } from "../context/CartContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.crosscoin.in";

const ReelsPage = () => {
  const router = useRouter();
  const { addToCart } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reels, setReels] = useState([]);
  const videoRefs = useRef([]);
  const viewedSetRef = useRef(new Set());

  useEffect(() => {
    const fetchReels = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_URL}/api/reels`, {
          headers: {
            "Content-Type": "application/json",
            "X-Brand-Name": "crosscoin",
          },
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.message || "Failed to load reels");
        }
        setReels(Array.isArray(data.data) ? data.data : []);
      } catch (err) {
        setError(err.message || "Failed to load reels");
      } finally {
        setLoading(false);
      }
    };
    fetchReels();
  }, []);

  useEffect(() => {
    if (!reels.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = Number(entry.target.dataset.index);
          const reel = reels[index];
          const video = videoRefs.current[index];
          if (!video || !reel) return;

          if (entry.isIntersecting && entry.intersectionRatio >= 0.65) {
            video.play().catch(() => {});
            if (!viewedSetRef.current.has(reel.id)) {
              viewedSetRef.current.add(reel.id);
              fetch(`${API_URL}/api/reels/${reel.id}/view`, {
                method: "POST",
                headers: { "Content-Type": "application/json", "X-Brand-Name": "crosscoin" },
              }).catch(() => {});
            }
          } else {
            video.pause();
          }
        });
      },
      { threshold: [0.65] }
    );

    const cards = document.querySelectorAll(".reels-card");
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [reels]);

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

  if (loading) return <div className="reels-loading">Loading reels...</div>;
  if (error) return <div className="reels-error">{error}</div>;

  return (
    <div className="reels-page">
      <div className="reels-container">
        {reels.map((reel, index) => (
          <section className="reels-card" key={reel.id} data-index={index}>
            <video
              ref={(el) => {
                videoRefs.current[index] = el;
              }}
              src={reel.video_url}
              poster={reel.thumbnail_url || undefined}
              muted
              loop
              playsInline
              preload="metadata"
              className="reels-video"
            />
            <div className="reels-bottom-sheet">
              <h3>{reel.title}</h3>
              <div className="reels-products">
                {(reel.Products || []).map((product) => (
                  <div key={`${reel.id}-${product.id}`} className="reels-product-card">
                    {product.primary_image ? (
                      <img src={product.primary_image} alt={product.name} className="reels-product-image" />
                    ) : null}
                    <div className="reels-product-meta">
                      <p className="reels-product-name">{product.name}</p>
                      <p className="reels-product-price">Rs. {Number(product.price || 0).toFixed(2)}</p>
                    </div>
                    <div className="reels-product-actions">
                      <button type="button" onClick={() => handleAddToCart(product)}>
                        Add to Cart
                      </button>
                      {product.slug ? (
                        <button type="button" onClick={() => router.push(`/ProductDetails?slug=${product.slug}`)}>
                          View
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default ReelsPage;

