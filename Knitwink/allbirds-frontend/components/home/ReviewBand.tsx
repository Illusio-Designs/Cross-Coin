import { Star } from 'lucide-react'

const REVIEWS = [
  {
    id: 1,
    quote: 'The most comfortable shoes I have ever worn. I forget I have them on.',
    author: 'Priya S.',
    location: 'Mumbai',
    rating: 5,
  },
  {
    id: 2,
    quote: 'Incredibly lightweight and breathable. Perfect for long walks around the city.',
    author: 'Arjun M.',
    location: 'Bangalore',
    rating: 5,
  },
  {
    id: 3,
    quote: 'Love that they are sustainable. The wool keeps my feet warm in winter and cool in summer.',
    author: 'Kavya R.',
    location: 'Delhi',
    rating: 5,
  },
]

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${count} out of 5 stars`}>
      {Array.from({ length: count }).map((_, i) => (
        <Star key={i} size={14} className="fill-sage text-sage" aria-hidden="true" />
      ))}
    </div>
  )
}

export function ReviewBand() {
  return (
    <section className="bg-off-white py-16 md:py-24 lg:py-32">
      <div className="mx-auto max-w-site px-6 md:px-10 lg:px-16">
        <h2 className="mb-12 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
          What people are saying
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {REVIEWS.map((review) => (
            <div key={review.id} className="flex flex-col gap-4 rounded-2xl bg-white p-8">
              <StarRating count={review.rating} />
              <p className="flex-1 text-base leading-relaxed text-gray-800">
                &ldquo;{review.quote}&rdquo;
              </p>
              <div>
                <p className="text-sm font-medium text-brand-black">{review.author}</p>
                <p className="text-xs text-gray-600">{review.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
