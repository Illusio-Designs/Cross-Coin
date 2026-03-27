import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { useCart } from "../../context/CartContext";
import { getPublicLookbookBySlug, getPublicLookbooks } from "../../services/publicApi";

const LookbookShowcase = ({ slug: slugProp = null, embedded = false }) => {
  const router = useRouter();
  const querySlug = typeof router?.query?.slug === "string" ? router.query.slug : null;
  const [internalSlug, setInternalSlug] = useState(slugProp || null);
  const slug = slugProp || querySlug || internalSlug;
  const { addToCart } = useCart();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lookbooks, setLookbooks] = useState([]);
  const [lookbook, setLookbook] = useState(null);
  const [activeHotspot, setActiveHotspot] = useState(null);

  const isDetailView = useMemo(() => !!slug, [slug]);

  useEffect(() => {
    setInternalSlug(slugProp || null);
  }, [slugProp]);

  useEffect(() => {
    const fetchLookbooks = async () => {
      try {
        setLoading(true);
        setError(null);
        setActiveHotspot(null);

        const data = isDetailView
          ? await getPublicLookbookBySlug(slug)
          : await getPublicLookbooks();

        if (!data?.success) {
          throw new Error(data.message || "Failed to load lookbook data");
        }

        if (isDetailView) {
          setLookbook(data.data);
          setLookbooks([]);
        } else {
          setLookbooks(Array.isArray(data.data) ? data.data : []);
          setLookbook(null);
        }
      } catch (err) {
        setError(err.message || "Failed to load lookbook data");
      } finally {
        setLoading(false);
      }
    };

    fetchLookbooks();
  }, [isDetailView, slug]);

  const handleOpenLookbook = (targetSlug) => {
    if (embedded || !querySlug) {
      setInternalSlug(targetSlug);
      return;
    }
    router.push({ pathname: router.pathname, query: { ...router.query, slug: targetSlug } });
  };

  const handleBackToGrid = () => {
    if (embedded || !querySlug) {
      setInternalSlug(null);
      return;
    }
    const nextQuery = { ...router.query };
    delete nextQuery.slug;
    router.push({ pathname: router.pathname, query: nextQuery });
  };

  const handleAddToCart = async (product) => {
    if (!product) return;
    const productPayload = {
      id: product.id,
      name: product.name,
      price: product.price || 0,
      images: product.primary_image ? [product.primary_image] : [],
      comparePrice: product.comparePrice || 0,
      variations: [],
    };
    await addToCart(productPayload, null, null, 1, null, productPayload.images);
  };

  if (loading) {
    return (
      <div className="lookbook-page">
        <div className="lookbook-loading">Loading lookbook...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lookbook-page">
        <div className="lookbook-error">{error}</div>
      </div>
    );
  }

  if (!isDetailView) {
    return (
      <div className="lookbook-page">
        <section className="lookbook-grid-section">
          {!embedded ? <h1 className="lookbook-title">Lookbook</h1> : null}
          <p className="lookbook-subtitle">Explore styled drops and shop directly from hotspots.</p>

          <div className="lookbook-grid">
            {lookbooks.map((item) => {
              const coverImage = item.Images && item.Images[0] ? item.Images[0].image_url : null;
              return (
                <button
                  key={item.id}
                  className="lookbook-card"
                  onClick={() => handleOpenLookbook(item.slug)}
                  type="button"
                >
                  {coverImage ? (
                    <img src={coverImage} alt={item.title} className="lookbook-card-image" />
                  ) : (
                    <div className="lookbook-card-placeholder">No Image</div>
                  )}
                  <div className="lookbook-card-overlay">
                    <h3>{item.title}</h3>
                    {item.description ? <p>{item.description}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    );
  }

  if (!lookbook) {
    return (
      <div className="lookbook-page">
        <div className="lookbook-error">Lookbook not found.</div>
      </div>
    );
  }

  return (
    <div className="lookbook-page">
      <section className="lookbook-detail-header">
        <button type="button" className="lookbook-back-btn" onClick={handleBackToGrid}>
          Back to Lookbook
        </button>
        <h1>{lookbook.title}</h1>
        {lookbook.description ? <p>{lookbook.description}</p> : null}
      </section>

      <section className="lookbook-detail-images">
        {(lookbook.Images || []).map((image) => (
          <div className="lookbook-image-wrap" key={image.id}>
            <img src={image.image_url} alt={image.alt_text || lookbook.title} className="lookbook-image" />

            {(image.Hotspots || []).map((hotspot) => {
              const key = `${image.id}-${hotspot.id}`;
              const isOpen = activeHotspot === key;
              return (
                <div
                  key={hotspot.id}
                  className="lookbook-hotspot-wrap"
                  style={{ left: `${hotspot.position_x}%`, top: `${hotspot.position_y}%` }}
                  onMouseEnter={() => setActiveHotspot(key)}
                  onMouseLeave={() => setActiveHotspot(null)}
                >
                  <button
                    type="button"
                    className="lookbook-hotspot-btn"
                    onClick={() => setActiveHotspot(isOpen ? null : key)}
                    aria-label={hotspot.label || hotspot.Product?.name || "Hotspot"}
                  />

                  {isOpen ? (
                    <div className="lookbook-product-popup">
                      {hotspot.Product?.primary_image ? (
                        <img
                          src={hotspot.Product.primary_image}
                          alt={hotspot.Product?.name || "Product"}
                          className="lookbook-popup-image"
                        />
                      ) : null}
                      <div className="lookbook-popup-content">
                        <h4>{hotspot.Product?.name}</h4>
                        <p>Rs. {Number(hotspot.Product?.price || 0).toFixed(2)}</p>
                        <div className="lookbook-popup-actions">
                          <button type="button" onClick={() => handleAddToCart(hotspot.Product)}>
                            Add to Cart
                          </button>
                          {hotspot.Product?.slug ? (
                            <button
                              type="button"
                              onClick={() => router.push(`/ProductDetails?slug=${hotspot.Product.slug}`)}
                            >
                              View
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </section>
    </div>
  );
};

export default LookbookShowcase;
