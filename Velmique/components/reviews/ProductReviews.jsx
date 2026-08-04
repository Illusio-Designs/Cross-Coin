'use client';
import { useEffect, useState } from 'react';
import { Star, Send, CheckCircle2, X, PenLine } from 'lucide-react';
import { getProductReviews, submitReview } from '@/lib/api/reviews';
import { toastReviewSubmitted, toastReviewError } from '@/lib/toast';

/* Live reviews list for a single product. The "Write a Review" form lives
   in a modal triggered by an Add Review button at the top of the section. */

function StarRow({ value, size = 12, onChange, interactive = false }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => {
        const filled = s <= (value || 0);
        const cls = `${filled ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-[var(--border)]'} ${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`;
        return interactive
          ? <button key={s} type="button" aria-label={`${s} star${s > 1 ? 's' : ''}`} onClick={() => onChange?.(s)}>
              <Star size={size} className={cls} />
            </button>
          : <Star key={s} size={size} className={cls} />;
      })}
    </div>
  );
}

function fmtDate(s) {
  if (!s) return '';
  try {
    const d = new Date(s);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

export default function ProductReviews({ productId, productName, initialReviewsPayload = null }) {
  // Server shell can pass `initialReviewsPayload` (the raw response from
  // getProductReviews). When present, the first paint already has data
  // and we skip the client round-trip.
  const seeded = initialReviewsPayload
    ? {
        reviews: initialReviewsPayload.reviews || [],
        stats:   initialReviewsPayload.stats   || null,
        total:   initialReviewsPayload.pagination?.total || (initialReviewsPayload.reviews?.length ?? 0),
      }
    : { reviews: [], stats: null, total: 0 };
  const [data,    setData]    = useState(seeded);
  const [loading, setLoading] = useState(!initialReviewsPayload);
  const [showAll, setShowAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!productId) return;
    if (initialReviewsPayload) return; // server-seeded
    setLoading(true);
    getProductReviews(productId, { limit: 30 }).then(res => {
      if (!alive) return;
      setData({
        reviews: res.reviews || [],
        stats:   res.stats || null,
        total:   res.pagination?.total || (res.reviews?.length ?? 0),
      });
      setLoading(false);
    });
    return () => { alive = false; };
  }, [productId, initialReviewsPayload]);

  const stats = data.stats;
  const avg = stats?.average ? Number(stats.average) : 0;
  const histogram = stats?.ratings || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalForHist = Object.values(histogram).reduce((s, n) => s + n, 0) || 1;

  // Duplicate the list so the marquee track can loop seamlessly. With only
  // one review the loop still feels alive (it scrolls back round).
  const looped = data.reviews.length ? [...data.reviews, ...data.reviews] : [];
  // Slow the animation down a bit when there are very few cards so they
  // don't fly past at warp speed.
  const animSeconds = Math.max(28, data.reviews.length * 7);

  return (
    <div className="space-y-6">
      {/* Stats summary + Add Review button */}
      {loading ? (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-7 h-[180px] animate-pulse" />
      ) : data.total > 0 ? (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-7">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            <div className="md:col-span-4 text-center md:border-r md:border-[var(--border)] md:pr-6">
              <p className="font-serif italic text-[var(--ink)] text-5xl leading-none">{avg ? avg.toFixed(1) : '—'}</p>
              <div className="flex justify-center gap-0.5 mt-2">
                <StarRow value={Math.round(avg)} size={14} />
              </div>
              <p className="text-[var(--ink-muted)] text-xs font-body mt-2 tracking-wider uppercase">{data.total} review{data.total === 1 ? '' : 's'}</p>
            </div>
            <div className="md:col-span-8 space-y-1.5">
              {[5, 4, 3, 2, 1].map(n => {
                const count = histogram[n] || 0;
                const pct = (count / totalForHist) * 100;
                return (
                  <div key={n} className="flex items-center gap-3 text-xs font-body">
                    <span className="text-[var(--ink-soft)] w-3">{n}</span>
                    <Star size={11} className="fill-[var(--gold)] text-[var(--gold)] shrink-0" />
                    <div className="flex-1 h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                      <div className="h-full bg-[var(--gold)]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[var(--ink-muted)] w-7 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-[var(--border)] flex items-center justify-between gap-4 flex-wrap">
            <p className="text-[var(--ink-soft)] text-sm font-body">Have you tried this fragrance?</p>
            <button onClick={() => setModalOpen(true)} className="pill-cta !py-2.5 !px-5">
              <PenLine size={13} /> Add Review
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-[var(--border)] rounded-2xl p-7 text-center">
          <p className="text-[var(--ink)] text-sm font-body font-medium mb-1">No reviews yet</p>
          <p className="text-[var(--ink-muted)] text-xs font-body mb-5">
            Be the first to share your experience with {productName || 'this fragrance'}.
          </p>
          <button onClick={() => setModalOpen(true)} className="pill-cta !py-2.5 !px-5 mx-auto">
            <PenLine size={13} /> Write the First Review
          </button>
        </div>
      )}

      {/* Review marquee — fixed-width same-height cards scroll horizontally,
          loop seamlessly, pause on hover. */}
      {!loading && data.reviews.length > 0 && (
        <div className="pdp-reviews-marquee">
          <div
            className="pdp-reviews-track"
            style={{ animationDuration: `${animSeconds}s` }}
          >
            {looped.map((r, i) => (
              <article
                key={`${r.id}-${i}`}
                className="pdp-review-card bg-white border border-[var(--border)] rounded-2xl p-5 md:p-6 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="font-serif italic text-[var(--ink)] text-base leading-tight truncate">
                      {r.reviewerName || r.guestName || r.User?.name || 'Anonymous'}
                    </p>
                    <p className="text-[var(--ink-muted)] text-[10px] tracking-[0.2em] uppercase font-body mt-1">
                      {fmtDate(r.createdAt)}{r.verified_purchase ? ' · Verified' : ''}
                    </p>
                  </div>
                  <StarRow value={Number(r.rating || 0)} />
                </div>
                <p className="text-[var(--ink-soft)] text-sm font-body leading-[1.55] flex-1 overflow-hidden line-clamp-3">
                  {r.review || r.comment}
                </p>
              </article>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .pdp-reviews-marquee {
          position: relative;
          overflow: hidden;
          mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, #000 5%, #000 95%, transparent);
        }
        .pdp-reviews-track {
          display: flex;
          gap: 1rem;
          width: max-content;
          will-change: transform;
          animation: pdp-reviews-scroll 40s linear infinite;
        }
        .pdp-reviews-marquee:hover .pdp-reviews-track {
          animation-play-state: paused;
        }
        .pdp-review-card {
          flex: 0 0 auto;
          width: 300px;
          height: 150px;
          padding: 1rem 1.25rem;
        }
        @media (min-width: 768px) {
          .pdp-review-card { width: 360px; height: 120px; }
        }
        @keyframes pdp-reviews-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>

      {/* Modal — only mounts when open */}
      {modalOpen && (
        <ReviewModal
          productId={productId}
          productName={productName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────
   Modal — appears centered with backdrop. Closes on ✕, ESC, or overlay click.
   Locks page scroll while open. Stays mounted through the success state so
   the user sees the confirmation before manually closing.
   ───────────────────────────────────── */
function ReviewModal({ productId, productName, onClose }) {
  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [rating,  setRating]  = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState({ type: '', text: '' });
  const [submitted,  setSubmitted]  = useState(false);

  // Lock body scroll while open + ESC closes.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitMsg({ type: '', text: '' });
    if (!rating)         return setSubmitMsg({ type: 'error', text: 'Please pick a rating.' });
    if (!comment.trim()) return setSubmitMsg({ type: 'error', text: 'Please write a short review.' });
    if (!name.trim())    return setSubmitMsg({ type: 'error', text: 'Please enter your name.' });
    if (!email.trim())   return setSubmitMsg({ type: 'error', text: 'Please enter your email.' });

    setSubmitting(true);
    try {
      await submitReview({ productId, rating, comment: comment.trim(), name: name.trim(), email: email.trim() });
      setSubmitted(true);
      toastReviewSubmitted();
    } catch (err) {
      const msg = err.message || 'Could not submit your review. Please try again.';
      setSubmitMsg({ type: 'error', text: msg });
      toastReviewError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4 py-10"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-[var(--ink)]/55 backdrop-blur-sm" />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-2xl border border-[var(--border)] shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-9 h-9 rounded-full border border-[var(--border)] bg-white hover:bg-[var(--surface)] flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] transition-colors z-10"
        >
          <X size={15} />
        </button>

        <div className="p-7 md:p-9">
          {submitted ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-[var(--gold)]/15 border border-[var(--gold)]/40 flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 size={28} className="text-[var(--gold-deep)]" />
              </div>
              <h3 id="review-modal-title" className="font-display text-[var(--ink)] text-2xl uppercase tracking-tight mb-3">Thank you</h3>
              <p className="text-[var(--ink-soft)] text-sm font-body mb-6 max-w-sm mx-auto">
                Your review for <span className="font-serif italic">{productName || 'this product'}</span> has been received and will appear once moderated.
              </p>
              <button onClick={onClose} className="pill-cta !py-2.5 !px-6 mx-auto">Close</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-2">Add a Review</p>
              <h3 id="review-modal-title" className="font-display text-[var(--ink)] text-2xl md:text-3xl uppercase tracking-tight mb-1">Share your experience</h3>
              {productName && (
                <p className="text-[var(--ink-muted)] text-sm font-body italic mb-6">{productName}</p>
              )}

              <div className="space-y-4">
                <div>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-2">Your rating</p>
                  <StarRow value={rating} size={24} interactive onChange={setRating} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
                      className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">Your review</label>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} rows={4} placeholder="What did you think?"
                    className="w-full input-gold px-4 py-3 text-sm font-body rounded-md resize-none" />
                </div>

                {submitMsg.text && (
                  <div className="flex items-center gap-2 text-xs font-body p-3 rounded-md bg-red-50 text-red-700 border border-red-200">
                    {submitMsg.text}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <button type="submit" disabled={submitting}
                    className={`pill-cta !py-3 !px-6 ${submitting ? 'opacity-60 cursor-not-allowed' : ''}`}>
                    <Send size={13} />
                    {submitting ? 'Submitting…' : 'Submit Review'}
                  </button>
                  <button type="button" onClick={onClose}
                    className="text-[var(--ink-soft)] text-[11px] tracking-[0.3em] uppercase font-body hover:text-[var(--ink)] transition-colors">
                    Cancel
                  </button>
                </div>

                <p className="text-[var(--ink-muted)] text-[11px] font-body">
                  Reviews are moderated before they appear on the site. Your email is never shown publicly.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
