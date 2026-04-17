import React from 'react';

const StarRating = ({ rating }) => (
  <div className="irs-stars">
    {[1, 2, 3, 4, 5].map((s) => (
      <span key={s} style={{ color: s <= rating ? '#f59e42' : '#e0e0e0' }}>★</span>
    ))}
  </div>
);

const ReviewCard = ({ review }) => {
  const name = review.reviewerName || review.User?.username || review.guestName || 'Anonymous';
  const text = review.review || '';
  const date = review.createdAt
    ? new Date(review.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '';

  return (
    <div className="irs-card">
      <div className="irs-card-name">{name}</div>
      <StarRating rating={review.rating || 0} />
      <p className="irs-card-text">{text}</p>
      {date && <div className="irs-card-date">{date}</div>}
    </div>
  );
};

const InfiniteReviewsSlider = ({ reviews }) => {
  // Filter out any reviews without actual review text
  const realReviews = (reviews || []).filter(r => r.review && r.review.trim().length > 0);

  if (realReviews.length === 0) {
    return <div className="irs-empty">No reviews yet.</div>;
  }

  // Duplicate just enough to fill the scroll seamlessly
  const duplicate = (arr) => {
    let result = [...arr];
    while (result.length < 8) result = [...result, ...arr];
    return result;
  };

  // Split reviews evenly between 2 rows — each row gets unique reviews
  const mid = Math.ceil(realReviews.length / 2);
  const row1Source = realReviews.slice(0, mid);
  const row2Source = realReviews.slice(mid).length > 0 ? realReviews.slice(mid) : realReviews.slice(0, mid);

  const topReviews = duplicate(row1Source);
  const botReviews = duplicate(row2Source);

  return (
    <div className="irs-wrapper">
      {/* Row 1 — scrolls left */}
      <div className="irs-track-outer">
        <div className="irs-track irs-track--left">
          {[...topReviews, ...topReviews].map((r, i) => (
            <ReviewCard key={`top-${i}`} review={r} />
          ))}
        </div>
      </div>

      {/* Row 2 — scrolls right */}
      <div className="irs-track-outer">
        <div className="irs-track irs-track--right">
          {[...botReviews, ...botReviews].map((r, i) => (
            <ReviewCard key={`bot-${i}`} review={r} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InfiniteReviewsSlider;
