import BrandIcon from '@/components/ui/BrandIcon';

export default function ReviewChip({ rating, reviews }) {
  const score = Number(rating);
  const total = Number(reviews);
  const hasRating = Number.isFinite(score) && score > 0;
  const count = Number.isFinite(total) && total > 0 ? total.toLocaleString('en-IN') : '';
  if (!hasRating && !count) return null;

  const reviewLabel = count ? `${count} ${total === 1 ? 'review' : 'reviews'}` : '';
  const scoreLabel = hasRating ? `Rated ${score.toFixed(1)} out of 5` : '';
  return (
    <span className="m-card__rbadge">
      <span className="sr-only">{[scoreLabel, reviewLabel].filter(Boolean).join(', ')}</span>
      <BrandIcon name="star" size={13} fill="currentColor" />
      <span aria-hidden="true">{hasRating ? `${score.toFixed(1)}/5${count ? ` (${count})` : ''}` : reviewLabel}</span>
    </span>
  );
}
