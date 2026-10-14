import { useEffect, useState } from 'react';
import { submitReview } from '../../services/reviews';
import { showSuccess, showError } from '../../utils/toast';

// "Write a review" button + modal, styled in Gripzus's own Monochrome Atelier
// language (ink/paper/line tokens, square hairline panel) — NOT the ported
// Morbix modal CSS. Submits to /api/reviews/submit via Gripzus's own
// submitReview ({ productId, rating, comment, name, email }); new reviews appear
// once approved. The ?review=open deep link (used by WhatsApp review requests)
// auto-opens the popup.
export default function WriteReviewButton({ productId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', rating: 5, comment: '' });
  const [status, setStatus] = useState({ state: 'idle', msg: '' });

  // Auto-open for WhatsApp review-request deep links (?review=open).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('review') === 'open') setOpen(true);
    } catch (_) {}
  }, []);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.comment.trim()) {
      setStatus({ state: 'error', msg: 'Please fill in your name, email and review.' });
      showError('Please fill in your name, email and review');
      return;
    }
    setStatus({ state: 'loading', msg: '' });
    try {
      await submitReview({
        productId,
        rating: Number(form.rating),
        comment: form.comment.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
      });
      setForm({ name: '', email: '', rating: 5, comment: '' });
      setStatus({ state: 'idle', msg: '' });
      setOpen(false);
      showSuccess('Review submitted — it will appear once approved');
    } catch (err) {
      setStatus({ state: 'error', msg: err.message || 'Could not submit your review. Please try again.' });
      showError(err.message || 'Could not submit your review');
    }
  };

  const Star = ({ filled }) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.4" className={filled ? 'text-ink' : 'text-line'} aria-hidden="true">
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex shrink-0 items-center gap-2 border border-ink px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
      >
        Write a review
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
          style={{ background: 'rgba(18,18,18,.55)' }}
          onClick={() => setOpen(false)}
        >
          <div
            data-lenis-prevent
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Write a review"
            className="w-full max-w-md max-h-[90vh] overflow-y-auto border border-line bg-paper p-6 md:p-7"
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="h-display text-xl text-ink">Write a review</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="text-2xl leading-none text-ink-muted hover:text-ink">×</button>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div>
                <span className="eyebrow text-ink-muted mb-2 block">Your rating</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onClick={() => setForm((f) => ({ ...f, rating: n }))} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="p-0.5">
                      <Star filled={n <= form.rating} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input className="w-full border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink" placeholder="Your name" value={form.name} onChange={set('name')} required />
                <input className="w-full border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
              </div>

              <textarea className="w-full resize-none border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink" rows={4} placeholder="Share your experience with this product…" value={form.comment} onChange={set('comment')} required />

              {status.state === 'error' && <p className="text-sm text-red-600">{status.msg}</p>}

              <button type="submit" className="btn w-full justify-center !py-3" disabled={status.state === 'loading'}>
                {status.state === 'loading' ? 'Submitting…' : 'Submit review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
