import React, { useRef, useEffect, useState } from 'react';
import SafeImage from './SafeImage';

const InfiniteReviewsSlider = ({ reviews }) => {
  const sliderRef = useRef(null);
  const containerRef = useRef(null);
  const [hoveredReview, setHoveredReview] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(true);

  // Function to truncate text
  const truncateText = (text, maxLength = 80) => {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // ✅ Intersection Observer - Pause animation when component is not visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, []);

  // Handle mouse enter for tooltip
  const handleReviewMouseEnter = (review, event) => {
    if (review.review && review.review.length > 80) {
      const rect = event.currentTarget.getBoundingClientRect();
      setTooltipPosition({
        x: rect.left + rect.width / 2,
        y: rect.top - 10
      });
      setHoveredReview(review);
    }
  };

  // Handle mouse leave for tooltip
  const handleReviewMouseLeave = () => {
    setHoveredReview(null);
  };

  useEffect(() => {
    if (!reviews || reviews.length < 3) return;

    const slider = sliderRef.current;
    if (!slider) return;

    let animationId;
    let scrollSpeed = 0.5; // Increased speed for better visibility
    let isPaused = false;

    const autoScroll = () => {
      // ✅ Only scroll if component is visible AND not paused
      if (!isPaused && isVisible) {
        slider.scrollLeft += scrollSpeed;
        
        // Reset scroll position for infinite loop
        // When we've scrolled past the original content, reset to beginning
        const originalContentWidth = slider.scrollWidth / 2;
        if (slider.scrollLeft >= originalContentWidth) {
          slider.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(autoScroll);
    };

    // Start auto-scrolling
    animationId = requestAnimationFrame(autoScroll);

    // Pause on hover
    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };

    slider.addEventListener('mouseenter', handleMouseEnter);
    slider.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (slider) {
        slider.removeEventListener('mouseenter', handleMouseEnter);
        slider.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [reviews, isVisible]);

  if (!reviews || reviews.length === 0) {
    return (
      <div style={{ color: '#888', fontSize: 14, padding: '20px', textAlign: 'center' }}>
        No reviews yet.
      </div>
    );
  }

  // Duplicate reviews for infinite scroll if we have enough reviews
  const displayReviews = reviews.length >= 3 ? [...reviews, ...reviews] : reviews;

  return (
    <>
      <div ref={containerRef}>
        <div
          ref={sliderRef}
          className="infinite-reviews-slider"
          style={{
            display: 'flex',
            overflowX: 'auto',
            gap: '12px',
            padding: '8px 0',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          <style jsx>{`
            .infinite-reviews-slider::-webkit-scrollbar {
              display: none;
            }
          `}</style>
          
          {displayReviews.map((review, idx) => (
          <div
            key={`${review.id || idx}-${idx}`}
            className="review-slide"
            style={{
              minWidth: '240px',
              maxWidth: '260px',
              background: '#fafbfc',
              border: '1px solid #eee',
              borderRadius: '8px',
              padding: '12px',
              boxShadow: '0 2px 8px #eee',
              transition: 'transform 0.2s, box-shadow 0.2s',
              cursor: 'pointer',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(206,30,54,0.10)';
              handleReviewMouseEnter(review, e);
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px #eee';
              handleReviewMouseLeave();
            }}
          >
            <div className="reviewer-name" style={{ fontWeight: 'bold', marginBottom: 4, fontSize: '13px' }}>
              {review.reviewerName || review.User?.username || review.guestName || 'Anonymous'}
            </div>
            <div className="review-stars" style={{ color: '#f59e42', marginBottom: 4, fontSize: '14px' }}>
              {Array.from({ length: review.rating }).map((_, i) => (
                <span key={i}>★</span>
              ))}
            </div>
            <div className="review-text" style={{ fontSize: 12, marginBottom: 6, lineHeight: 1.3, minHeight: '32px' }}>
              {truncateText(review.review)}
            </div>
            <div className="review-date" style={{ fontSize: 11, color: '#888' }}>
              {new Date(review.createdAt).toLocaleDateString()}
            </div>
            {review.ReviewImages && review.ReviewImages.length > 0 && (
              <div className="review-images" style={{ marginTop: 6, display: 'flex', gap: 3 }}>
                {review.ReviewImages.slice(0, 2).map((image, imgIdx) => (
                  <SafeImage
                    key={imgIdx}
                    imageData={{
                      image_url: `/uploads/reviews/${image.fileName}`
                    }}
                    alt={`Review image ${imgIdx + 1}`}
                    style={{ width: 32, height: 32, objectFit: 'cover', borderRadius: 3 }}
                  />
                ))}
                {review.ReviewImages.length > 2 && (
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    backgroundColor: '#f0f0f0', 
                    borderRadius: 3, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    fontSize: 10,
                    color: '#666'
                  }}>
                    +{review.ReviewImages.length - 2}
                  </div>
                )}
              </div>
            )}
          </div>
          ))}
        </div>
      </div>
      
      {/* Tooltip for full review text */}
      {hoveredReview && (
        <div
          style={{
            position: 'fixed',
            left: tooltipPosition.x,
            top: tooltipPosition.y,
            transform: 'translateX(-50%) translateY(-100%)',
            backgroundColor: '#333',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            maxWidth: '300px',
            lineHeight: 1.4,
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            pointerEvents: 'none'
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {hoveredReview.reviewerName || hoveredReview.User?.username || hoveredReview.guestName || 'Anonymous'}
          </div>
          <div>{hoveredReview.review}</div>
          {/* Tooltip arrow */}
          <div
            style={{
              position: 'absolute',
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '6px solid transparent',
              borderRight: '6px solid transparent',
              borderTop: '6px solid #333'
            }}
          />
        </div>
      )}
    </>
  );
};

export default InfiniteReviewsSlider;