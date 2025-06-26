import React, { useRef, useState, useEffect } from "react";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { getPublicProductReviews, getAllPublicReviews } from '../services/publicindex';

const Testimonials = () => {
  const sliderRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  const scrollSlider = (direction) => {
    const scrollAmount = 400;
    if (sliderRef.current) {
      if (direction === 'left') {
        sliderRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
      } else {
        sliderRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
      }
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

  return (
    <section className="testimonials-section">
      <h3 className="section-title">CUSTOMER SATISFACTION</h3>
      <div className="testimonials-container">
        {reviews.length > 2 && (
          <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('left')}>
            <IoIosArrowBack />
          </button>
        )}
        <div className="testimonials-slider" ref={sliderRef}>
          {reviews.map((review, idx) => (
            <div className="testimonial-card" key={idx}>
              <p className="testimonial-text">{review.review}</p>
              <div className="testimonial-user">
                <div>
                  <div className="testimonial-name">{review.reviewerName}</div>
                  <div className="testimonial-rating">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <span key={i} className="testimonial-star">★</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        {reviews.length > 2 && (
          <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('right')}>
            <IoIosArrowForward />
          </button>
        )}
      </div>
    </section>
  );
};

export default Testimonials; 