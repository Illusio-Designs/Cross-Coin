import { Star } from 'lucide-react'

const REVIEWS = [
  { id: 1, quote: 'The most comfortable shoes I have ever worn. I forget I have them on.', author: 'Priya S.', location: 'Mumbai', rating: 5 },
  { id: 2, quote: 'Incredibly lightweight and breathable. Perfect for long walks around the city.', author: 'Arjun M.', location: 'Bangalore', rating: 5 },
  { id: 3, quote: 'Love that they are sustainable. The wool keeps my feet warm in winter and cool in summer.', author: 'Kavya R.', location: 'Delhi', rating: 5 },
]

export function ReviewBand() {
  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-off-white px-6 py-10 md:px-10 md:py-14">
      <h2 className="mb-10 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
        What people are saying
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {REVIEWS.map((review) => (
          <div key={review.id} className="flex flex-col gap-4 rounded-xl bg-white p-7">
            <div className="flex gap-0.5" aria-label={`${review.rating} out of 5 stars`}>
              {Array.from({ length: review.rating }).map((_, i) => (
                <Star key={i} size={13} className="fill-sage text-sage" aria-hidden="true" />
              ))}
            </div>
            <p className="flex-1 text-base leading-relaxed text-gray-800">&ldquo;{review.quote}&rdquo;</p>
            <div>
              <p className="text-sm font-medium text-brand-black">{review.author}</p>
              <p className="text-xs text-gray-600">{review.location}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
