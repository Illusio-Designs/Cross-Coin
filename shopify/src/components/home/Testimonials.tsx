'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    rating: 5,
    text: 'Best socks I\'ve ever owned! The quality is outstanding and they\'re incredibly comfortable. I\'ve already ordered three more pairs.',
    date: 'January 2024',
  },
  {
    id: 2,
    name: 'Michael Chen',
    rating: 5,
    text: 'As someone who\'s on their feet all day, these socks are a game-changer. No more sore feet at the end of the day!',
    date: 'December 2023',
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    rating: 4,
    text: 'Great quality and fast shipping. The athletic socks are perfect for my morning runs. Highly recommend!',
    date: 'January 2024',
  },
]

export default function Testimonials() {
  const [current, setCurrent] = useState(0)

  const next = () => setCurrent((prev) => (prev + 1) % testimonials.length)
  const prev = () => setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length)

  return (
    <section className="py-20">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-muted text-lg">Join thousands of happy customers</p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-50 p-8 md:p-12 relative">
            <div className="flex items-center justify-center mb-4">
              {[...Array(testimonials[current].rating)].map((_, i) => (
                <Star key={i} size={24} fill="currentColor" className="text-primary" />
              ))}
            </div>
            <p className="text-xl text-center mb-6 italic">
              "{testimonials[current].text}"
            </p>
            <div className="text-center">
              <p className="font-bold">{testimonials[current].name}</p>
              <p className="text-sm text-muted">{testimonials[current].date}</p>
            </div>

            <button
              onClick={prev}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Previous testimonial"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={next}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 hover:bg-gray-200 rounded-full transition-colors"
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
                  index === current ? 'bg-primary' : 'bg-gray-300'
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
