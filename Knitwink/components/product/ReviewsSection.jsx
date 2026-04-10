'use client';


import { Star } from 'lucide-react';











const FALLBACK_REVIEWS = [
{ id: '1', authorName: 'Priya S.', rating: 5, title: 'Best socks I own', body: 'Incredibly comfortable from day one. The alignment really works — my toes feel so much better after long walks.', createdAt: '2024-11-10', verified: true },
{ id: '2', authorName: 'Arjun M.', rating: 5, title: 'Worth every rupee', body: 'Lightweight, breathable, and they look great. I was skeptical but after wearing them daily for 3 months I completely understand.', createdAt: '2024-10-22', verified: true },
{ id: '3', authorName: 'Kavya R.', rating: 4, title: 'Great quality', body: 'Love the feel and the material. My feet feel relaxed after wearing these all day. Highly recommend for anyone on their feet a lot.', createdAt: '2024-09-15', verified: true },
{ id: '4', authorName: 'Rohit T.', rating: 5, title: 'Game changer', body: 'I had bunion pain for years. These socks have genuinely helped. The toe separator design is subtle but effective.', createdAt: '2024-08-30', verified: true },
{ id: '5', authorName: 'Sneha P.', rating: 5, title: 'Gifted to my mom too', body: 'Bought for myself first, loved them so much I ordered 3 more pairs for family. The white color stays clean too.', createdAt: '2024-08-12', verified: true },
{ id: '6', authorName: 'Vikram D.', rating: 4, title: 'Solid product', body: 'Good build quality, comfortable fit. The free size works perfectly for me. Delivery was fast too.', createdAt: '2024-07-20', verified: true }];


function Stars({ rating }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) =>
      <Star key={i} size={12} className={i < rating ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'} />
      )}
    </div>);

}







export function ReviewsSection({ reviews, averageRating = 4.8, totalReviews }) {
  const items = reviews && reviews.length > 0 ? reviews : FALLBACK_REVIEWS;
  // Duplicate for seamless infinite loop
  const doubled = [...items, ...items];
  const count = totalReviews ?? items.length;

  return (
    <div className="py-12">
      {/* Header */}
      <div className="mb-8 flex items-center gap-4 px-5 lg:px-8">
        <span className="font-display text-4xl font-normal text-brand-black">{averageRating.toFixed(1)}</span>
        <div className="flex flex-col gap-1">
          <Stars rating={Math.round(averageRating)} />
          <p className="text-xs text-gray-500">{count} reviews</p>
        </div>
      </div>

      {/* Infinite scroll track */}
      <div className="overflow-hidden">
        <div className="flex animate-marquee gap-4 will-change-transform">
          {doubled.map((review, i) =>
          <div
            key={`${review.id}-${i}`}
            className="w-72 shrink-0 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            
              <div className="mb-3 flex items-center justify-between">
                <Stars rating={review.rating} />
                {review.verified &&
              <span className="text-[10px] font-medium uppercase tracking-widest text-gray-400">Verified</span>
              }
              </div>
              <p className="mb-1.5 text-sm font-semibold text-brand-black">{review.title}</p>
              <p className="mb-4 text-sm leading-relaxed text-gray-600 line-clamp-3">{review.body}</p>
              <p className="text-xs text-gray-400">
                {review.authorName} · {new Date(review.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'short' })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>);

}