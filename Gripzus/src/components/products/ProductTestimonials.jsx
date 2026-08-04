import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { toastReviewSubmitted, toastReviewError, toastValidationError } from '../../utils/toast';
import { getProductReviews, submitReview } from '../../services/reviews';

/* Product testimonials — mirrors the home page ReviewBand (two-row
   infinite marquee that pauses on hover). Shows only THIS product's
   reviews from the API; the "Write a Review" form creates a review
   for this product. */

function Stars({ n = 5, size = 13, interactive, onSelect }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const star = (
          <svg width={size} height={size} viewBox="0 0 24 24"
            fill={i < n ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4"
            className={i < n ? 'text-clay' : 'text-line'}>
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        );
        return interactive ? (
          <button key={i} type="button" onClick={() => onSelect(i + 1)} aria-label={`${i + 1} star`} className="leading-none">
            {star}
          </button>
        ) : (
          <span key={i} className="leading-none">{star}</span>
        );
      })}
    </div>
  );
}

function ReviewCard({ r }) {
  return (
    <figure className="shrink-0 w-[300px] md:w-[360px] bg-paper-warm border border-line rounded-lg p-6 mx-2.5">
      <Stars n={r.rating} />
      <blockquote className="h-display text-ink text-lg md:text-xl leading-snug mt-4 mb-5">
        “{r.quote}”
      </blockquote>
      <figcaption className="text-sm">
        <span className="text-ink font-medium">{r.name}</span>
        <span className="text-ink-muted"> · {r.role}</span>
      </figcaption>
    </figure>
  );
}

export default function ProductTestimonials({ productId, productName }) {
  const [reviews, setReviews] = useState([]);
  const [loaded, setLoaded]   = useState(false);
  const [open, setOpen]       = useState(false);
  const [mounted, setMounted] = useState(false);
  const [form, setForm]       = useState({ name: '', email: '', rating: 0, text: '' });
  const [submitting, setSubmitting] = useState(false);

  // Portal target only exists on the client.
  useEffect(() => setMounted(true), []);

  // Fetch this product's reviews.
  useEffect(() => {
    if (!productId) return;
    let active = true;
    getProductReviews(productId)
      .then(({ reviews: list }) => {
        if (active) { setReviews(list || []); setLoaded(true); }
      })
      .catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [productId]);

  const close = () => {
    setOpen(false);
    setForm({ name: '', email: '', rating: 0, text: '' });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.rating)       { toastValidationError('Please select a star rating.'); return; }
    if (!form.name.trim())  { toastValidationError('Please enter your name.');      return; }
    if (!form.email.trim()) { toastValidationError('Please enter your email.');     return; }
    if (!form.text.trim())  { toastValidationError('Please write your review.');    return; }
    setSubmitting(true);
    try {
      await submitReview({
        productId,
        rating: form.rating,
        comment: form.text,
        name: form.name,
        email: form.email,
      });
      toastReviewSubmitted();
      close();
    } catch (err) {
      toastReviewError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasReviews = reviews.length > 0;
  // Split into two rows; duplicate each row for a seamless marquee loop.
  const half = Math.ceil(reviews.length / 2);
  const rowA = reviews.slice(0, half);
  const rowB = reviews.slice(half).length ? reviews.slice(half) : rowA;

  return (
    <section data-product-id={productId} className="section-y border-y border-line overflow-hidden">
      <div className="wrap">
        <div className="text-center mb-12">
          <p className="eyebrow mb-3">Worn &amp; reviewed</p>
          <h2 className="h-display text-3xl md:text-5xl">
            What buyers <span className="h-italic">say.</span>
          </h2>
          <button onClick={() => setOpen(true)} className="btn mt-7 !py-3.5 !px-7">
            Write a Review
          </button>
        </div>
      </div>

      {hasReviews ? (
        <>
          {/* Row 1 — scrolls left */}
          <div className="gz-marquee">
            <div className="gz-track gz-track--left">
              {[...rowA, ...rowA].map((r, i) => <ReviewCard key={`a-${r.id}-${i}`} r={r} />)}
            </div>
          </div>
          {/* Row 2 — scrolls right */}
          <div className="gz-marquee mt-5">
            <div className="gz-track gz-track--right">
              {[...rowB, ...rowB].map((r, i) => <ReviewCard key={`b-${r.id}-${i}`} r={r} />)}
            </div>
          </div>
        </>
      ) : (
        loaded && (
          <div className="wrap">
            <p className="text-center text-sm text-ink-muted">
              No reviews yet — be the first to review {productName || 'this pair'}.
            </p>
          </div>
        )
      )}

      {/* Write-a-review modal */}
      {open && mounted && createPortal(
        <div className="fixed inset-0 z-[9000] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" onClick={close} />
          <div className="relative z-10 w-full max-w-md rounded-xl bg-paper p-7 shadow-2xl">
            <button onClick={close} aria-label="Close" className="absolute right-4 top-4 text-ink-muted transition-colors hover:text-ink">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            <p className="eyebrow mb-2">Share your experience</p>
            <h3 className="h-display text-2xl leading-tight">Write a Review</h3>
            {productName && <p className="mt-1 mb-6 text-[13px] text-ink-muted">for {productName}</p>}

            <form onSubmit={submit} className="flex flex-col gap-5">
              <div>
                <p className="eyebrow mb-2">Your rating</p>
                <Stars n={form.rating} size={26} interactive onSelect={(r) => setForm((f) => ({ ...f, rating: r }))} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="eyebrow mb-2">Name</p>
                  <input
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                    className="w-full rounded-sm border border-line px-3.5 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
                  />
                </div>
                <div>
                  <p className="eyebrow mb-2">Email</p>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@email.com"
                    className="w-full rounded-sm border border-line px-3.5 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <p className="eyebrow mb-2">Your review</p>
                <textarea
                  rows={4}
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  placeholder="What did you think of this pair?"
                  className="w-full resize-none rounded-sm border border-line px-3.5 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
                />
              </div>
              <button type="submit" disabled={submitting} className="btn w-full justify-center !py-4 disabled:opacity-50">
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      <style jsx>{`
        .gz-marquee {
          overflow: hidden;
          -webkit-mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent);
          mask-image: linear-gradient(to right, transparent, #000 7%, #000 93%, transparent);
        }
        .gz-track {
          display: flex;
          width: max-content;
          will-change: transform;
        }
        .gz-track--left  { animation: gz-scroll-left 46s linear infinite; }
        .gz-track--right { animation: gz-scroll-right 46s linear infinite; }
        .gz-marquee:hover .gz-track { animation-play-state: paused; }
        @keyframes gz-scroll-left  { from { transform: translateX(0); }    to { transform: translateX(-50%); } }
        @keyframes gz-scroll-right { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        @media (max-width: 768px) {
          .gz-track--left, .gz-track--right { animation-duration: 32s; }
        }
      `}</style>
    </section>
  );
}
