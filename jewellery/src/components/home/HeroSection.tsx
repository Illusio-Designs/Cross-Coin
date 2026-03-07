'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const slides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=1920',
    title: 'Timeless Elegance',
    subtitle: 'Exquisite craftsmanship in every piece',
    cta: 'Explore Collection',
    link: '/collections',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1920',
    title: 'Diamond Collection',
    subtitle: 'Brilliance that lasts forever',
    cta: 'Shop Diamonds',
    link: '/collections/rings',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=1920',
    title: 'Luxury Watches',
    subtitle: 'Swiss precision meets timeless design',
    cta: 'View Watches',
    link: '/collections/watches',
  },
]

export default function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % slides.length)
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  return (
    <section className="relative h-[600px] lg:h-[700px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-black/40" />
          
          <div className="relative h-full container-custom flex items-center">
            <div className="max-w-2xl text-white">
              <h1 className="text-5xl lg:text-7xl font-serif font-bold mb-4 animate-fade-in">
                {slide.title}
              </h1>
              <p className="text-xl lg:text-2xl mb-8 text-gold animate-fade-in">
                {slide.subtitle}
              </p>
              <Link
                href={slide.link}
                className="inline-block btn-primary animate-fade-in"
              >
                {slide.cta}
              </Link>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-gold/80 hover:bg-gold text-primary rounded-full transition-colors z-10"
        aria-label="Previous slide"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-gold/80 hover:bg-gold text-primary rounded-full transition-colors z-10"
        aria-label="Next slide"
      >
        <ChevronRight size={24} />
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`w-3 h-3 rounded-full transition-colors ${
              index === currentSlide ? 'bg-gold' : 'bg-white/50'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}
