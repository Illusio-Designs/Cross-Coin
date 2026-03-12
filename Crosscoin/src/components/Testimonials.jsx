import React, { useRef, useState, useEffect } from "react";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { getPublicProductReviews, getAllPublicReviews } from '../services/publicApi';

const Testimonials = () => {
  const sliderRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        // Fetch all approved reviews for testimonials
        const response = await getAllPublicReviews({ limit: 20, sort: 'highest' });
        if (response.success && response.reviews && response.reviews.length > 0) {
          setReviews(response.reviews);
        } else {
          setReviews([]);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  // Auto-scroll effect for infinite scrolling
  useEffect(() => {
    if (!reviews.length || reviews.length < 3) return;

    const slider = sliderRef.current;
    if (!slider) return;

    let animationId;
    let scrollSpeed = 0.5; // pixels per frame
    let isPaused = false;

    const autoScroll = () => {
      if (!isPaused && isAutoScrolling) {
        slider.scrollLeft += scrollSpeed;
        
        // Reset scroll position for infinite loop
        const maxScroll = slider.scrollWidth - slider.clientWidth;
        if (slider.scrollLeft >= maxScroll / 2) {
          slider.scrollLeft = 0;
        }
      }
      animationId = requestAnimationFrame(autoScroll);
    };

    // Start auto-scrolling
    animationId = requestAnimationFrame(autoScroll);

    // Pause on hover
    const handleMouseEnter = () => {
      isPaused = true;
    };

    const handleMouseLeave = () => {
      isPaused = false;
    };

    slider.addEventListener('mouseenter', handleMouseEnter);
    slider.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (slider) {
        slider.removeEventListener('mouseenter', handleMouseEnter);
        slider.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [reviews, isAutoScrolling]);

  const scrollSlider = (direction) => {
    const scrollAmount = 400;
    if (sliderRef.current) {
      setIsAutoScrolling(false); // Pause auto-scroll when user interacts
      
      if (direction === 'left') {
        sliderRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
      
      // Resume auto-scroll after 3 seconds
      setTimeout(() => {
        setIsAutoScrolling(true);
      }, 3000);
    }
  };

  if (loading) {
    return (
      <section className="testimonials-section">
        <h3 className="section-title">CUSTOMER SATISFACTION</h3>
        <div className="testimonials-container">
          <div className="loading">Loading testimonials...</div>
        </div>
      </section>
    );
  }

  if (!reviews.length) {
    return (
      <section className="testimonials-section">
        <h3 className="section-title">CUSTOMER SATISFACTION</h3>
        <div className="testimonials-container">
          <div className="loading">No testimonials available yet.</div>
        </div>
      </section>
    );
  }

  // Create duplicated reviews for infinite scroll effect
  const duplicatedReviews = reviews.length >= 3 ? [...reviews, ...reviews] : reviews;

  return (
    <section className="testimonials-section">
      <h3 className="section-title">CUSTOMER SATISFACTION</h3>
      <div className="testimonials-container">
        {reviews.length > 2 && (
          <button className="slider-arrow slider-arrow-left" aria-label="Previous testimonial" onClick={() => scrollSlider('left')}>
            <IoIosArrowBack />
          </button>
        )}
        <div className="testimonials-slider infinite-scroll" ref={sliderRef}>
          {duplicatedReviews.map((review, idx) => (
            <div className="testimonial-card" key={`${review.id || idx}-${idx}`}>
              <div className="reviewer-name">{review.reviewerName}</div>
              <div className="testimonial-rating">
                {Array.from({ length: review.rating }).map((_, i) => (
                  <span key={i} className="testimonial-star">★</span>
                ))}
              </div>
              <p className="testimonial-text">{review.review}</p>
            </div>
          ))}
        </div>
        {reviews.length > 2 && (
          <button className="slider-arrow slider-arrow-right" aria-label="Next testimonial" onClick={() => scrollSlider('right')}>
            <IoIosArrowForward />
          </button>
        )}
      </div>
    </section>
  );
};

export default Testimonials; 