import ReviewMarquee, { ReviewCount } from '../common/ReviewMarquee';
import WriteReviewButton from './WriteReviewButton';

// Customer reviews — rendered in Gripzus's OWN design language (NOT the ported
// Morbix wall). Reuses the brand-native ReviewMarquee + ReviewCount (the exact
// components the home ReviewBand uses) inside the shared section rhythm
// (section-y / wrap + a top-hairline eyebrow + h-display header). On the product
// page a productId is passed, which surfaces the "Write a review" popup; on the
// home page it is omitted. Review objects are { quote, name, role, rating }.
export default function ReviewsSection({ reviews = [], total: totalProp, productId }) {
  const hasReviews = reviews.length > 0;

  return (
    <section className="section-y overflow-hidden">
      <div className="wrap">
        <div className="flex flex-wrap items-end justify-between gap-5 border-t border-line pt-6 md:pt-8 mb-8 md:mb-12">
          <div>
            <p className="eyebrow text-ink-muted mb-2">Reviews</p>
            <h2 className="h-display text-2xl md:text-4xl text-ink leading-none">What our customers say</h2>
            <ReviewCount reviews={reviews} total={totalProp} />
          </div>
          {productId ? <WriteReviewButton productId={productId} /> : null}
        </div>
      </div>

      {hasReviews ? (
        <ReviewMarquee reviews={reviews} />
      ) : (
        <div className="wrap">
          <p className="text-ink-muted text-sm">No reviews yet — your feedback will appear here.</p>
        </div>
      )}
    </section>
  );
}
