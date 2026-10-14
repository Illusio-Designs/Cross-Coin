'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { submitReview } from '@/lib/api';
import { toast } from '@/lib/toast';

// "Write a review" button + modal form, POSTing to /api/reviews/submit.
// Extracted so it can live inside the brand reviews section on the PDP.
// New reviews appear once an admin approves them.
export default function WriteReviewButton({ productId }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', rating: 5, comment: '' });
  const [status, setStatus] = useState({ state: 'idle', msg: '' });

  // Open the review popup automatically for WhatsApp review-request deep links (?review=open).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('review') === 'open') setOpen(true);
    } catch (_) {}
  }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.comment.trim()) {
      setStatus({ state: 'error', msg: 'Please fill in your name, email and review.' });
      toast.error('Please fill in your name, email and review');
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
      setStatus({ state: 'success', msg: 'Thanks! Your review has been submitted and will appear once approved.' });
      setOpen(false);
      toast.success('Review submitted — it will appear once approved');
    } catch (err) {
      setStatus({ state: 'error', msg: err.message || 'Could not submit your review. Please try again.' });
      toast.error(err.message || 'Could not submit your review');
    }
  };

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Write a review <Icon name="Star" size={15} />
      </button>
      {status.state === 'success' && !open && <p className="form-msg success">{status.msg}</p>}

      {open && (
        <div className="review-modal-overlay" onClick={() => setOpen(false)}>
          <div className="review-modal" data-lenis-prevent onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Write a review">
            <div className="review-modal-head">
              <h3>Write a review</h3>
              <button type="button" className="review-modal-close" onClick={() => setOpen(false)} aria-label="Close">
                <Icon name="X" size={18} />
              </button>
            </div>
            <form className="review-form" onSubmit={onSubmit}>
              <div className="review-form-rating">
                <span className="opt-label">Your rating</span>
                <div className="rating-picker">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onClick={() => setForm((f) => ({ ...f, rating: n }))}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`} className="rating-star">
                      <span className="rating-star-ic" style={{ color: n <= form.rating ? 'var(--star)' : '#d7dde2' }}>★</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field-row">
                <input className="input" placeholder="Your name" value={form.name} onChange={set('name')} required />
                <input className="input" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
              </div>
              <textarea className="input" rows={4} placeholder="Share your experience with this product…"
                value={form.comment} onChange={set('comment')} required />
              {status.state === 'error' && <p className="form-msg error">{status.msg}</p>}
              <button type="submit" className="btn btn-primary" disabled={status.state === 'loading'}>
                {status.state === 'loading' ? 'Submitting…' : 'Submit review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
