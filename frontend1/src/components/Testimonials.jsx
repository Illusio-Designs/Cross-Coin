import React, { useRef, useState, useEffect } from "react";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';
import { getPublicProductReviews } from '../services/publicindex';

const Testimonials = () => {
  const sliderRef = useRef(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        // Fetch reviews from a sample product to display in testimonials
        // We'll use product ID 1 as a sample, or you can change this to any product that has reviews
        const response = await getPublicProductReviews(1, { limit: 10, sort: 'highest' });
        if (response.success && response.reviews && response.reviews.length > 0) {
          setReviews(response.reviews);
        } else {
          // Fallback to hardcoded testimonials if API fails or no reviews
          setReviews([
            {
              reviewerName: "Gabrile Jackson",
              review: "Teamollo delivered the site with inthe timeline as they requested. Inthe end, the client found a 50% increase in traffic with in days since its launch. They also had an impressive ability to use technologies that the company hasn't used, which have also proved to be easy to use and reliable.",
              rating: 5
            },
            {
              reviewerName: "Sarah Johnson",
              review: "Excellent service and quality products. The team was very responsive and delivered exactly what we needed. Highly recommended for anyone looking for reliable solutions.",
              rating: 5
            },
            {
              reviewerName: "Michael Chen",
              review: "Outstanding experience working with this team. They exceeded our expectations and delivered a fantastic product that has significantly improved our business.",
              rating: 5
            },
            {
              reviewerName: "Emily Davis",
              review: "Professional, efficient, and results-driven. The project was completed on time and within budget. We're very satisfied with the outcome.",
              rating: 5
            },
            {
              reviewerName: "David Wilson",
              review: "Great communication throughout the project. The team was knowledgeable and delivered high-quality work. Will definitely work with them again.",
              rating: 5
            },
            {
              reviewerName: "Lisa Brown",
              review: "Amazing work ethic and attention to detail. The final product was exactly what we envisioned and more. Highly recommend their services.",
              rating: 5
            }
          ]);
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
        // Fallback to hardcoded testimonials
        setReviews([
          {
            reviewerName: "Gabrile Jackson",
            review: "Teamollo delivered the site with inthe timeline as they requested. Inthe end, the client found a 50% increase in traffic with in days since its launch. They also had an impressive ability to use technologies that the company hasn't used, which have also proved to be easy to use and reliable.",
            rating: 5
          },
          {
            reviewerName: "Sarah Johnson",
            review: "Excellent service and quality products. The team was very responsive and delivered exactly what we needed. Highly recommended for anyone looking for reliable solutions.",
            rating: 5
          },
          {
            reviewerName: "Michael Chen",
            review: "Outstanding experience working with this team. They exceeded our expectations and delivered a fantastic product that has significantly improved our business.",
            rating: 5
          },
          {
            reviewerName: "Emily Davis",
            review: "Professional, efficient, and results-driven. The project was completed on time and within budget. We're very satisfied with the outcome.",
            rating: 5
          },
          {
            reviewerName: "David Wilson",
            review: "Great communication throughout the project. The team was knowledgeable and delivered high-quality work. Will definitely work with them again.",
            rating: 5
          },
          {
            reviewerName: "Lisa Brown",
            review: "Amazing work ethic and attention to detail. The final product was exactly what we envisioned and more. Highly recommend their services.",
            rating: 5
          }
        ]);
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