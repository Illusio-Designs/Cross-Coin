import React from 'react';

const StarRating = ({ rating }) => (
  <div className="irs-stars">
    {[1, 2, 3, 4, 5].map((s) => (
      <span key={s} style={{ color: s <= rating ? '#f59e42' : '#e0e0e0' }}>★</span>
    ))}
  </div>
);

// Generate a deterministic but varied dummy date based on review id/index
const getDummyDate = (review, index) => {
  const seed = (review.id || index + 1) * 7 + index * 13;
  const daysAgo = (seed % 180) + 30; // between 30 and 210 days ago
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const ReviewCard = ({ review, index = 0 }) => {
  const name = review.reviewerName || review.User?.username || review.guestName || 'Anonymous';
  const text = review.review || '';
  const date = getDummyDate(review, index);

  return (
    <div className="irs-card">
      <div className="irs-card-name">{name}</div>
      <StarRating rating={review.rating || 0} />
      <p className="irs-card-text">{text}</p>
      <div className="irs-card-date">{date}</div>
    </div>
  );
};

const InfiniteReviewsSlider = ({ reviews }) => {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="irs-empty">No reviews yet.</div>
    );
  }

  // Need at least enough cards to fill the viewport — duplicate until we have plenty
  const ensureEnough = (arr) => {
    let result = [...arr];
    while (result.length < 10) result = [...result, ...arr];
    return result;
  };

  const mid = Math.ceil(reviews.length / 2);
  const topReviews  = ensureEnough(reviews.slice(0, mid));
  const botReviews  = ensureEnough(reviews.slice(mid) || reviews);

  return (
    <div className="irs-wrapper">
      {/* Row 1 — scrolls left */}
      <div className="irs-track-outer">
        <div className="irs-track irs-track--left">
          {[...topReviews, ...topReviews].map((r, i) => (
            <ReviewCard key={`top-${i}`} review={r} index={i} />
          ))}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div className="irs-track-outer">
        <div className="irs-track irs-track--right">
          {[...botReviews, ...botReviews].map((r, i) => (
            <ReviewCard key={`bot-${i}`} review={r} index={i + 50} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfiniteReviewsSlider;
