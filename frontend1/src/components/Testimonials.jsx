import React, { useRef } from "react";
import { IoIosArrowBack, IoIosArrowForward } from 'react-icons/io';

const testimonials = [
  {
    name: "Gabrile Jackson",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    text: "Teamollo delivered the site with inthe timeline as they requested. Inthe end, the client found a 50% increase in traffic with in days since its launch. They also had an impressive ability to use technologies that the company hasn't used, which have also proved to be easy to use and reliable.",
    rating: 5
  },
  {
    name: "Gabrile Jackson",
    avatar: "https://randomuser.me/api/portraits/men/33.jpg",
    text: "Teamollo delivered the site with inthe timeline as they requested. Inthe end, the client found a 50% increase in traffic with in days since its launch. They also had an impressive ability to use technologies that the company hasn't used, which have also proved to be easy to use and reliable.",
    rating: 5
  },
  {
    name: "Gabrile Jackson",
    avatar: "https://randomuser.me/api/portraits/men/34.jpg",
    text: "Teamollo delivered the site with inthe timeline as they requested. Inthe end, the client found a 50% increase in traffic with in days since its launch. They also had an impressive ability to use technologies that the company hasn't used, which have also proved to be easy to use and reliable.",
    rating: 5
  },
  {
    name: "Gabrile Jackson",
    avatar: "https://randomuser.me/api/portraits/men/35.jpg",
    text: "Teamollo delivered the site with inthe timeline as they requested. Inthe end, the client found a 50% increase in traffic with in days since its launch. They also had an impressive ability to use technologies that the company hasn't used, which have also proved to be easy to use and reliable.",
    rating: 5
  },
  {
    name: "Gabrile Jackson",
    avatar: "https://randomuser.me/api/portraits/men/36.jpg",
    text: "Teamollo delivered the site with inthe timeline as they requested. Inthe end, the client found a 50% increase in traffic with in days since its launch. They also had an impressive ability to use technologies that the company hasn't used, which have also proved to be easy to use and reliable.",
    rating: 5
  },
  {
    name: "Gabrile Jackson",
    avatar: "https://randomuser.me/api/portraits/men/37.jpg",
    text: "Teamollo delivered the site with inthe timeline as they requested. Inthe end, the client found a 50% increase in traffic with in days since its launch. They also had an impressive ability to use technologies that the company hasn't used, which have also proved to be easy to use and reliable.",
    rating: 5
  }
];

const Testimonials = () => {
  const sliderRef = useRef(null);

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

  return (
    <section className="testimonials-section">
      <h3 className="section-title">CUSTOMER SATISFACTION</h3>
      <div className="testimonials-container">
        <button className="slider-arrow slider-arrow-left" onClick={() => scrollSlider('left')}>
          <IoIosArrowBack />
        </button>
        <div className="testimonials-slider" ref={sliderRef}>
          {testimonials.map((t, idx) => (
            <div className="testimonial-card" key={idx}>
              <p className="testimonial-text">{t.text}</p>
              <div className="testimonial-user">
                <img className="testimonial-avatar" src={t.avatar} alt={t.name} />
                <div>
                  <div className="testimonial-name">{t.name}</div>
                  <div className="testimonial-rating">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i} className="testimonial-star">★</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button className="slider-arrow slider-arrow-right" onClick={() => scrollSlider('right')}>
          <IoIosArrowForward />
        </button>
      </div>
    </section>
  );
};

export default Testimonials; 