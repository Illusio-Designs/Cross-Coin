import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toastReviewSubmitted, toastReviewError, toastValidationError } from '../../utils/toast';
import { getProductReviews, submitReview } from '../../services/reviews';
import ReviewMarquee from '../common/ReviewMarquee';

/* Product reviews — uses the SHARED minimal ReviewMarquee so the design matches
   the home page exactly. Shows only THIS product's reviews; the "Write a Review"
   form creates a review for this product. */

// Interactive stars — only used by the write-a-review form.
function RatingStars({ n = 0, onSelect }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <button key={i} type="button" onClick={() => onSelect(i + 1)} aria-label={`${i + 1} star`} className="leading-none">
          <svg width="26" height="26" viewBox="0 0 24 24"
            fill={i < n ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4"
            className={i < n ? 'text-ink' : 'text-line'}>
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

export default function ProductTestimonials({ productId, productName }) {
  const [reviews, setReviews] = useState([]);
  const [loaded, setLoaded]   = useState(false);
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const [form, setForm]       = useState({ name: '', email: '', rating: 0, text: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!productId) return;
    let active = true;
    getProductReviews(productId)
      .then(({ reviews: list }) => { if (active) { setReviews(list || []); setLoaded(true); } })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [productId]);

  const close = () => { setOpen(false); setForm({ name: '', email: '', rating: 0, text: '' }); };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating)       { toastValidationError('Please select a star rating.'); return; }
    if (!form.name.trim())  { toastValidationError('Please enter your name.');      return; }
    if (!form.email.trim()) { toastValidationError('Please enter your email.');     return; }
    if (!form.text.trim())  { toastValidationError('Please write your review.');    return; }
    setSubmitting(true);
    try {
      await submitReview({ productId, rating: form.rating, comment: form.text, name: form.name, email: form.email });
      toastReviewSubmitted();
      close();
    } catch (err) {
      toastReviewError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section data-product-id={productId} className="section-y border-y border-line overflow-hidden">
      <div className="wrap mb-10 md:mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-ink-muted mb-3">Worn &amp; reviewed</p>
          <h2 className="h-display text-2xl md:text-4xl">What buyers say.</h2>
        </div>
        <button onClick={() => setOpen(true)} className="btn">Write a Review</button>
      </div>

      {reviews.length > 0 ? (
        <ReviewMarquee reviews={reviews} />
      ) : (
        loaded && (
          <div className="wrap">
            <p className="text-sm text-ink-muted">No reviews yet — be the first to review {productName || 'this pair'}.</p>
          </div>
        )
      )}

      {/* Write-a-review modal */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={close} />
          <div className="relative z-10 w-full max-w-md bg-paper p-7 shadow-2xl">
            <button onClick={close} aria-label="Close" className="absolute right-4 top-4 text-ink-muted transition-colors hover:text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <p className="eyebrow mb-2">Share your experience</p>
            <h3 className="h-display text-2xl leading-tight">Write a Review</h3>
            {productName && <p className="mt-1 mb-6 text-[13px] text-ink-muted">for {productName}</p>}

            <form onSubmit={submit} className="flex flex-col gap-5">
              <div>
                <p className="eyebrow mb-2">Your rating</p>
                <RatingStars n={form.rating} onSelect={(r) => setForm((f) => ({ ...f, rating: r }))} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-2">Name</p>
                  <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Your name"
                    className="w-full border border-line px-3.5 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none" />
                </div>
                <div>
                  <p className="eyebrow mb-2">Email</p>
                  <input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="you@email.com"
                    className="w-full border border-line px-3.5 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none" />
                </div>
              </div>
              <div>
                <p className="eyebrow mb-2">Your review</p>
                <textarea rows={4} value={form.text} onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))} placeholder="What did you think of this pair?"
                  className="w-full resize-none border border-line px-3.5 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none" />
              </div>
              <button type="submit" disabled={submitting} className="btn w-full justify-center !py-4 disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}
    </section>
  );
}
