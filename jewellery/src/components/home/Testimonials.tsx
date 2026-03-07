'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

const testimonials = [
  {
    id: 1,
    name: 'Emily Richardson',
    rating: 5,
    text: 'The diamond ring I purchased is absolutely stunning. The craftsmanship is impeccable and exceeded all my expectations. Truly a piece to treasure forever.',
    date: 'February 2024',
  },
  {
    id: 2,
    name: 'Michael Chen',
    rating: 5,
    text: 'Outstanding service and quality. The team helped me find the perfect engagement ring. My fiancée was speechless when she saw it!',
    date: 'January 2024',
  },
  {
    id: 3,
    name: 'Sarah Williams',
    rating: 5,
    text: 'Exquisite jewelry and exceptional customer service. The pearl necklace I ordered is even more beautiful in person. Highly recommend!',
    date: 'February 2024',
  },
]

export default function Testimonials() {
  const [current, setCurrent] = useState(0)

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length)
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length)

  return (
    <section className="py-20 bg-gray-50">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold mb-4">What Our Clients Say</h2>
          <p className="text-muted text-lg">Trusted by thousands of satisfied customers</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white p-8 md:p-12 relative shadow-lg">
            <div className="flex items-center justify-center mb-4">
              {[...Array(testimonials[current].rating)].map((_, i) => (
                <Star key={i} size={24} fill="currentColor" className="text-gold" />
              ))}
            </div>
            <p className="text-xl text-center mb-6 italic text-muted">
              "{testimonials[current].text}"
            </p>
            <div className="text-center">
              <p className="font-bold">{testimonials[current].name}</p>
              <p className="text-sm text-muted">{testimonials[current].date}</p>
            </div>

            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gold/10 rounded-full transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gold/10 rounded-full transition-colors"
              aria-label="Next testimonial"
            >
              <ChevronRight size={24} />
            </button>
          </div>

          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrent(index)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === current ? 'bg-gold' : 'bg-gray-300'
                }`}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
