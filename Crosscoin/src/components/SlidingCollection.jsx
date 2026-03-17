import React, { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import { getPublicCategoryByName } from '../services/publicApi';

const shimmerStyle = {
  background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer-skeleton 1.5s infinite linear',
};

const SlidingCollection = ({ collections = [], isLoading = false }) => {
  const stageRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [current, setCurrent] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loadedImages, setLoadedImages] = useState({});
  const router = useRouter();
  const total = collections.length;

  const wrap = (i) => ((i % total) + total) % total;

  const relPos = (i) => {
    let r = i - current;
    if (r > total / 2) r -= total;
    if (r < -total / 2) r += total;
    return r;
  };

  const handleCollectionClick = async (collectionName) => {
    if (!collectionName) {
      router.push('/Products');
      return;
    }

    try {
      setLoading(true);
      // Fetch category data by name
      const categoryData = await getPublicCategoryByName(collectionName);
      
      // Navigate to products page with category filter
      router.push(`/Products?category=${encodeURIComponent(collectionName)}`);
    } catch (error) {
      console.error('Error fetching category:', error);
      // Fallback to basic redirect if API fails
      router.push(`/Products?category=${encodeURIComponent(collectionName)}`);
    } finally {
      setLoading(false);
    }
  };

  const goTo = (index) => {
    if (busy) return;
    const next = wrap(index);
    if (next === current) return;
    setBusy(true);
    setCurrent(next);
    setTimeout(() => setBusy(false), 520);
  };

  const getImageSrc = (imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') return null;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

    if (imageUrl.startsWith('/assets/')) {
      return imageUrl;
    }

    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }

    if (imageUrl.startsWith('/uploads/')) {
      return `${baseUrl}${imageUrl}`;
    }

    return `${baseUrl}/uploads/categories/${imageUrl}`;
  };

  // Layout calculation - responsive
  const getCardStyle = (index) => {
    if (!stageRef.current) return {};

    const sw = stageRef.current.offsetWidth;
    const sh = stageRef.current.offsetHeight;
    const cx = sw / 2;
    const cy = sh / 2;
    const rel = relPos(index);

    // Responsive sizing based on viewport width
    const isMobile = sw < 768;
    const isTablet = sw < 1024;

    let ACTIVE_W, ACTIVE_H, SIDE_W, SIDE_H, SIDE_PEEK;

    if (isMobile) {
      ACTIVE_W = sw * 0.78;
      ACTIVE_H = sh * 0.88;
      SIDE_W = sw * 0.78;
      SIDE_H = sh * 0.72;
      SIDE_PEEK = sw * 0.22;
    } else if (isTablet) {
      ACTIVE_W = sw * 0.55;
      ACTIVE_H = sh * 0.82;
      SIDE_W = sw * 0.55;
      SIDE_H = sh * 0.7;
      SIDE_PEEK = sw * 0.28;
    } else {
      ACTIVE_W = 480;
      ACTIVE_H = 420;
      SIDE_W = 480;
      SIDE_H = 360;
      SIDE_PEEK = 320;
    }

    let x, y, w, h, opacity, zIndex, shadow;

    if (rel === 0) {
      w = ACTIVE_W;
      h = ACTIVE_H;
      x = cx - w / 2;
      y = cy - h / 2;
      opacity = 1;
      zIndex = 10;
      shadow = '0 24px 60px rgba(0,0,0,0.18)';
    } else if (rel === -1) {
      w = SIDE_W;
      h = SIDE_H;
      x = cx - SIDE_PEEK - w / 2;
      y = cy - h / 2;
      opacity = isMobile ? 0 : 0.78;
      zIndex = isMobile ? 0 : 5;
      shadow = isMobile ? 'none' : '0 8px 24px rgba(0,0,0,0.10)';
    } else if (rel === 1) {
      w = SIDE_W;
      h = SIDE_H;
      x = cx + SIDE_PEEK - w / 2;
      y = cy - h / 2;
      opacity = isMobile ? 0 : 0.78;
      zIndex = isMobile ? 0 : 5;
      shadow = isMobile ? 'none' : '0 8px 24px rgba(0,0,0,0.10)';
    } else if (rel === -2) {
      w = SIDE_W;
      h = SIDE_H;
      x = cx - SIDE_PEEK - w / 2 - SIDE_W * 0.65;
      y = cy - h / 2;
      opacity = 0;
      zIndex = 1;
      shadow = 'none';
    } else if (rel === 2) {
      w = SIDE_W;
      h = SIDE_H;
      x = cx + SIDE_PEEK - w / 2 + SIDE_W * 0.65;
      y = cy - h / 2;
      opacity = 0;
      zIndex = 1;
      shadow = 'none';
    } else {
      w = SIDE_W;
      h = SIDE_H;
      x = rel < 0 ? -w - 100 : sw + 100;
      y = cy - h / 2;
      opacity = 0;
      zIndex = 0;
      shadow = 'none';
    }

    return {
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
      opacity,
      zIndex,
      boxShadow: shadow,
      cursor: 'default'
    };
  };

  if (isLoading || !collections || collections.length === 0) {
    return (
      <div className="sliding-collection-section">
        <div className="section-header">
          <h2>On-Trend <strong>Picks</strong></h2>
          <p>Explore our promising line-up</p>
        </div>
        <div className="stage" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '24px', position: 'relative' }}>
          {/* side card left */}
          <div style={{ ...shimmerStyle, width: '340px', height: '300px', borderRadius: '16px', opacity: 0.5, flexShrink: 0 }} />
          {/* center card */}
          <div style={{ ...shimmerStyle, width: '480px', height: '380px', borderRadius: '16px', flexShrink: 0 }} />
          {/* side card right */}
          <div style={{ ...shimmerStyle, width: '340px', height: '300px', borderRadius: '16px', opacity: 0.5, flexShrink: 0 }} />
        </div>
        <div className="dots" style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ ...shimmerStyle, width: '10px', height: '10px', borderRadius: '50%' }} />
          ))}
        </div>
        <style jsx>{`
          @keyframes shimmer-skeleton {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="sliding-collection-section">
      <div className="section-header">
        <h2>On-Trend <strong>Picks</strong></h2>
        <p>Explore our promising line-up</p>
      </div>

      <div className="stage" ref={stageRef}>
        <button 
          className="nav-btn nav-prev" 
          onClick={() => goTo(current - 1)}
          disabled={loading}
          aria-label="Previous collection"
        >
          <svg viewBox="0 0 24 24">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </button>

        {collections.map((collection, index) => {
          const rel = relPos(index);
          const imageSrc = getImageSrc(collection.image);
          
          // Check if collection name starts with "Crosscoin"
          let isCrosscoin = collection.name.toLowerCase().startsWith('crosscoin');
          let line1Text = '';
          let line2Text = '';
          
          if (isCrosscoin) {
            line1Text = 'CROSSCOIN';
            line2Text = collection.name.substring(9).trim(); // Get text after "Crosscoin"
          } else {
            const firstWord = collection.name.split(' ')[0];
            const restWords = collection.name.split(' ').slice(1).join(' ');
            line1Text = firstWord;
            line2Text = restWords;
          }

          return (
            <div
              key={collection.id || index}
              className="card"
              data-i={index}
              style={getCardStyle(index)}
              onClick={() => {
                if (rel === -1) goTo(current - 1);
                else if (rel === 1) goTo(current + 1);
              }}
            >
              <div className="card-inner">
                {/* Background Image */}
                {imageSrc && (
                  <img
                    src={imageSrc}
                    alt={collection.name}
                    className="card-bg-img"
                    draggable={false}
                    onLoad={() => setLoadedImages(prev => ({ ...prev, [index]: true }))}
                    style={{ opacity: loadedImages[index] ? 1 : 0 }}
                  />
                )}
                {(!imageSrc || !loadedImages[index]) && <div className="card-bg-fallback" />}

                {/* SVG Pattern Overlay */}
                <svg className="card-pattern" viewBox="0 0 420 400" xmlns="http://www.w3.org/2000/svg">
                  <path d="M0 320 Q105 220 210 320 T420 320" fill="none" strokeWidth="1.2"/>
                  <path d="M0 360 Q105 260 210 360 T420 360" fill="none" strokeWidth="1"/>
                  <path d="M0 400 Q105 300 210 400 T420 400" fill="none" strokeWidth="0.8"/>
                </svg>

                {/* Content */}
                <div className="card-content">
                  <div className="top">
                    {isCrosscoin ? (
                      <>
                        <span className="line1-bold">{line1Text}</span>
                        <span className="line2-regular">{line2Text}</span>
                      </>
                    ) : (
                      <>
                        <span className="line1">{line1Text}</span>
                        <span className="line2">{line2Text}</span>
                      </>
                    )}
                  </div>
                  <button 
                    className="explore-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCollectionClick(collection.name);
                    }}
                    disabled={loading}
                  >
                    {loading ? 'LOADING...' : 'EXPLORE NOW'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        <button 
          className="nav-btn nav-next" 
          onClick={() => goTo(current + 1)}
          disabled={loading}
          aria-label="Next collection"
        >
          <svg viewBox="0 0 24 24">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </button>
      </div>

      {/* Dots */}
      <div className="dots">
        {collections.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === current ? 'active' : ''}`}
            onClick={() => goTo(index)}
            aria-label={`Go to collection ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

export default SlidingCollection;
