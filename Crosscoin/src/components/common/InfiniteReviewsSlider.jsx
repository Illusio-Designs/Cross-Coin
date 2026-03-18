import React, { useRef, useEffect, useState } from 'react';
import SafeImage from './SafeImage';

const InfiniteReviewsSlider = ({ reviews }) => {
  const topRowRef = useRef(null);
  const bottomRowRef = useRef(null);
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
    if (!reviews || reviews.length < 2) return;

    const topRow = topRowRef.current;
    const bottomRow = bottomRowRef.current;
    if (!topRow || !bottomRow) return;

    let topAnimationId;
    let bottomAnimationId;
    let scrollSpeed = 0.5;
    let isPaused = false;

    // Split reviews into two rows
    const midPoint = Math.ceil(reviews.length / 2);
    const topReviews = reviews.slice(0, midPoint);
    const bottomReviews = reviews.slice(midPoint);

    // Clone items for seamless infinite loop
    const cloneItems = (row, reviewsArray) => {
      row.innerHTML = '';
      reviewsArray.forEach(review => {
        row.appendChild(createReviewCard(review));
      });
      // Clone for infinite scroll
      reviewsArray.forEach(review => {
        row.appendChild(createReviewCard(review));
      });
    };

    const createReviewCard = (review) => {
      const div = document.createElement('div');
      div.className = 'review-slide';
      div.style.cssText = `
        min-width: 240px;
        max-width: 260px;
        background: #fafbfc;
        border: 1px solid #eee;
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 2px 8px #eee;
        transition: transform 0.2s, box-shadow 0.2s;
        cursor: pointer;
        position: relative;
        flex-shrink: 0;
      `;

      div.innerHTML = `
        <div class="reviewer-name" style="font-weight: bold; margin-bottom: 4px; font-size: 13px;">
          ${review.reviewerName || review.User?.username || review.guestName || 'Anonymous'}
        </div>
        <div class="review-stars" style="color: #f59e42; margin-bottom: 4px; font-size: 14px;">
          ${Array.from({ length: review.rating }).map(() => '★').join('')}
        </div>
        <div class="review-text" style="font-size: 12px; margin-bottom: 6px; line-height: 1.3; min-height: 32px;">
          ${truncateText(review.review)}
        </div>
        <div class="review-date" style="font-size: 11px; color: #888;">
          ${new Date(review.createdAt).toLocaleDateString()}
        </div>
        ${review.ReviewImages && review.ReviewImages.length > 0 ? `
          <div class="review-images" style="margin-top: 6px; display: flex; gap: 3px;">
            ${review.ReviewImages.slice(0, 2).map((image, idx) => `
              <img src="/uploads/reviews/${image.fileName}" alt="Review image ${idx + 1}" 
                   style="width: 32px; height: 32px; object-fit: cover; border-radius: 3px;" />
            `).join('')}
            ${review.ReviewImages.length > 2 ? `
              <div style="width: 32px; height: 32px; background-color: #f0f0f0; border-radius: 3px; 
                          display: flex; align-items: center; justify-content: center; font-size: 10px; color: #666;">
                +${review.ReviewImages.length - 2}
              </div>
            ` : ''}
          </div>
        ` : ''}
      `;

      div.addEventListener('mouseenter', (e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(206,30,54,0.10)';
        handleReviewMouseEnter(review, e);
      });

      div.addEventListener('mouseleave', (e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px #eee';
        handleReviewMouseLeave();
      });

      return div;
    };

    cloneItems(topRow, topReviews);
    cloneItems(bottomRow, bottomReviews);

    // Auto scroll animation
    let topScrollPos = 0;
    let bottomScrollPos = 0;

    const animateScroll = () => {
      if (!isPaused && isVisible) {
        // Top row scrolls left
        topScrollPos += scrollSpeed;
        const topContentWidth = topRow.scrollWidth / 2;
        if (topScrollPos >= topContentWidth) {
          topScrollPos = 0;
        }
        topRow.style.transform = `translateX(-${topScrollPos}px)`;

        // Bottom row scrolls right
        bottomScrollPos += scrollSpeed;
        const bottomContentWidth = bottomRow.scrollWidth / 2;
        if (bottomScrollPos >= bottomContentWidth) {
          bottomScrollPos = 0;
        }
        bottomRow.style.transform = `translateX(${bottomScrollPos}px)`;
      }

      topAnimationId = requestAnimationFrame(animateScroll);
    };

    animateScroll();

    // Pause on hover
    const handleMouseEnter = () => { isPaused = true; };
    const handleMouseLeave = () => { isPaused = false; };

    topRow.addEventListener('mouseenter', handleMouseEnter);
    topRow.addEventListener('mouseleave', handleMouseLeave);
    bottomRow.addEventListener('mouseenter', handleMouseEnter);
    bottomRow.addEventListener('mouseleave', handleMouseLeave);

    // Cleanup
    return () => {
      if (topAnimationId) cancelAnimationFrame(topAnimationId);
      if (bottomAnimationId) cancelAnimationFrame(bottomAnimationId);
      if (topRow) {
        topRow.removeEventListener('mouseenter', handleMouseEnter);
        topRow.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (bottomRow) {
        bottomRow.removeEventListener('mouseenter', handleMouseEnter);
        bottomRow.removeEventListener('mouseleave', handleMouseLeave);
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

  return (
    <>
      <div ref={containerRef} style={{ width: '100%', overflow: 'hidden' }}>
        <style jsx>{`
          .reviews-row {
            display: flex;
            gap: 12px;
            padding: 8px 0;
            will-change: transform;
          }
          .reviews-row::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        {/* Top Row - Scrolls Left */}
        <div
          ref={topRowRef}
          className="reviews-row"
          style={{
            marginBottom: '20px'
          }}
        />

        {/* Bottom Row - Scrolls Right */}
        <div
          ref={bottomRowRef}
          className="reviews-row"
        />
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