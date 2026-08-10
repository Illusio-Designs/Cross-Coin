import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useCart } from "../../context/CartContext";
import { getPublicLookbooks, getPublicProductBySlug } from "../../services/publicApi";
import ProductCard from "../products/ProductCard";
import Skeleton from "./Skeleton";
import { ikTransform } from "../../utils/imageUtils";

const LookbookShowcase = () => {
  const router = useRouter();
  const { addToCart } = useCart();

  const [loading, setLoading]               = useState(true);
  const [error, setError]                   = useState(null);
  const [lookbooks, setLookbooks]           = useState([]);
  const [selectedLb, setSelectedLb]         = useState(null);
  const [activeImg, setActiveImg]           = useState(0);
  const [activeHotspot, setActiveHotspot]   = useState(null);
  const [fullProduct, setFullProduct]       = useState(null);
  const [productLoading, setProductLoading] = useState(false);

  const loadHotspotProduct = async (hs) => {
    if (!hs?.Product?.slug) return;
    setActiveHotspot(hs.id);
    setFullProduct(null);
    setProductLoading(true);
    try {
      const res = await getPublicProductBySlug(hs.Product.slug);
      if (res?.success && res?.data) setFullProduct(res.data);
    } catch (e) {}
    finally { setProductLoading(false); }
  };

  useEffect(() => {
    getPublicLookbooks()
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : [];
        setLookbooks(list);
        if (list.length > 0) {
          setSelectedLb(list[0]);
          const firstHs = list[0]?.Images?.[0]?.Hotspots?.[0];
          if (firstHs) loadHotspotProduct(firstHs);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const selectLookbook = (lb) => {
    setSelectedLb(lb);
    setActiveImg(0);
    setFullProduct(null);
    setActiveHotspot(null);
    const firstHs = lb.Images?.[0]?.Hotspots?.[0];
    if (firstHs) loadHotspotProduct(firstHs);
  };

  const handleHotspotClick = (hs) => {
    if (activeHotspot === hs.id) return;
    loadHotspotProduct(hs);
  };

  if (loading) return <div className="lb-loading"><Skeleton height={420} style={{ borderRadius: 12 }} /></div>;
  if (error)   return <div className="lb-error">{error}</div>;
  if (!lookbooks.length) return <div className="lb-error">No lookbooks found.</div>;

  const images       = selectedLb?.Images || [];
  const currentImage = images[activeImg] || images[0];

  const cardProduct = fullProduct ? (() => {
    const api = fullProduct;
    const variations = api.variations || [];
    const firstVar = variations[0] || {};
    return {
      id: api.id,
      name: api.name,
      slug: api.slug,
      price: parseFloat(firstVar.price || api.price || 0),
      comparePrice: parseFloat(firstVar.comparePrice || 0),
      images: api.images || [],
      variations,
      review_count: api.review_count || 0,
      avg_rating: api.avg_rating || null,
      badge: api.badge || null,
    };
  })() : null;

  return (
    <div className="lb-wrap">

      {/* Col 1 — Lookbook list */}
      <div className="lb-list">
        <div className="lb-list-title">Lookbooks</div>
        {lookbooks.map(lb => {
          const cover = lb.Images?.[0]?.image_url;
          const isActive = selectedLb?.id === lb.id;
          return (
            <button key={lb.id} type="button"
              className={`lb-list-item${isActive ? ' lb-list-item--active' : ''}`}
              aria-label={`View lookbook: ${lb.title}`}
              onClick={() => selectLookbook(lb)}>
              {isActive && <div className="lb-list-active-bar" />}
              <div className="lb-list-thumb">
                {cover ? <img src={ikTransform(cover, 200)} alt={lb.title} loading="lazy" /> : <div className="lb-list-thumb-empty" />}
              </div>
              <div className="lb-list-info">
                <span className="lb-list-name">{lb.title}</span>
                <span className="lb-list-count">{(lb.Images || []).length} image{(lb.Images || []).length !== 1 ? 's' : ''}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Col 2 — Main image with hotspots (no title/description) */}
      <div className="lb-center">
        {selectedLb && (
          <>
            {images.length > 1 && (
              <div className="lb-thumbs">
                {images.map((img, i) => (
                  <button key={img.id} type="button"
                    className={`lb-thumb${activeImg === i ? ' lb-thumb--active' : ''}`}
                    aria-label={img.alt_text || `View image ${i + 1}`}
                    onClick={() => { setActiveImg(i); setActiveHotspot(null); setFullProduct(null); }}>
                    <img src={ikTransform(img.image_url, 160)} alt={img.alt_text || `Image ${i + 1}`} loading="lazy" />
                  </button>
                ))}
              </div>
            )}

            <div className="lb-main-img-wrap">
              {currentImage && (
                <div className="lb-img-inner">
                  <img
                    src={ikTransform(currentImage.image_url, 600)}
                    srcSet={`${ikTransform(currentImage.image_url, 490)} 490w, ${ikTransform(currentImage.image_url, 600)} 600w, ${ikTransform(currentImage.image_url, 900)} 900w`}
                    sizes="(max-width: 600px) 90vw, 490px"
                    alt={currentImage.alt_text || selectedLb.title}
                    className="lb-main-img"
                    width={600}
                    height={600}
                    loading="lazy"
                    decoding="async"
                  />
                  {(currentImage.Hotspots || []).map(hs => (
                    <div key={hs.id}
                      className={`lb-hotspot${activeHotspot === hs.id ? ' lb-hotspot--active' : ''}`}
                      style={{ left: `${hs.position_x}%`, top: `${hs.position_y}%` }}
                      onClick={() => handleHotspotClick(hs)}>
                      <button type="button" className="lb-hotspot-dot" aria-label={hs.label || hs.Product?.name || 'Hotspot'} />
                      {hs.label && <span className="lb-hotspot-label">{hs.label}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Col 3 — Real ProductCard */}
      <div className="lb-product-panel">
        {productLoading ? (
          <div className="lb-panel-hint"><Skeleton type="text" width="70%" height="16px" /></div>
        ) : !cardProduct ? (
          <div className="lb-panel-hint">
            <svg width="40" height="40" fill="none" stroke="#ddd" strokeWidth="1.5" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
            </svg>
            <p>Tap a hotspot on the image to see the product</p>
          </div>
        ) : (
          <ProductCard
            key={cardProduct.id}
            product={cardProduct}
            index={0}
            onProductClick={() => cardProduct.slug && router.push(`/products/${cardProduct.slug}`)}
            onAddToCart={(e, prod) => {
              e.stopPropagation();
              addToCart(
                { id: prod.id, name: prod.name, price: prod.price, images: prod.images, variations: prod.variations || [] },
                null, null, 1, null,
                prod.images?.map(i => i.image_url || i) || []
              );
            }}
          />
        )}
      </div>

    </div>
  );
};

export default LookbookShowcase;
