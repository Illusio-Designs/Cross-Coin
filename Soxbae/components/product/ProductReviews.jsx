'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { submitReview } from '@/lib/api';
import { toast } from '@/lib/toast';

// Product reviews: real average + distribution computed from the actual
// reviews, the review list, and a working "write a review" form that POSTs to
// /api/reviews/submit (same endpoint the other brands use). New reviews show
// immediately (pending moderation is normal on the backend).
export default function ProductReviews({ productId, initialReviews = [], fallbackRating = 0, fallbackCount = 0 }) {
  const [reviews, setReviews] = useState(Array.isArray(initialReviews) ? initialReviews : []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', rating: 5, comment: '' });
  const [status, setStatus] = useState({ state: 'idle', msg: '' });

  // Summary reflects ONLY the reviews actually shown (approved). No fallback to
  // the product's review_count — that includes unapproved reviews and would
  // show "5.0 / 1 review" next to an empty list.
  const { avg, total, dist } = useMemo(() => {
    const list = reviews.filter((r) => Number(r.rating) > 0);
    const total = list.length;
    const avg = total ? list.reduce((a, r) => a + Number(r.rating), 0) / total : 0;
    const dist = [5, 4, 3, 2, 1].map((s) => {
      const c = list.filter((r) => Math.round(Number(r.rating)) === s).length;
      return { s, pct: total ? Math.round((c / total) * 100) : 0 };
    });
    return { avg, total, dist };
  }, [reviews]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    // The backend requires ALL of productId, rating, comment, name AND email.
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
      // Do NOT show it yet — reviews only appear after an admin approves them
      // (the list endpoint returns approved reviews only).
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
    <section className="pdp-reviews section" id="reviews">
      <div className="section-head" style={{ justifyContent: 'space-between' }}>
        <h2>Customer reviews</h2>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
          Write a review <Icon name="Star" size={15} />
        </button>
      </div>

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

      {status.state === 'success' && !open && <p className="form-msg success">{status.msg}</p>}

      <div className="reviews-layout">
        <div className="reviews-summary">
          <div className="rs-score">{total ? avg.toFixed(1) : '—'}</div>
          <div className="rs-stars">
            {[0, 1, 2, 3, 4].map((i) => (
              <Icon key={i} name="Star" size={16} color={i < Math.round(avg) ? 'var(--star)' : '#d7dde2'} />
            ))}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>
            {total ? `Based on ${total} review${total === 1 ? '' : 's'}` : 'No reviews yet'}
          </div>
          <div className="rs-bars">
            {dist.map((d) => (
              <div className="rs-bar" key={d.s}>
                <span>{d.s}★</span>
                <div className="rs-track"><div className="rs-fill" style={{ width: `${d.pct}%` }} /></div>
                <span className="muted">{d.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="reviews-list">
          {reviews.length === 0 ? (
            <div className="empty" style={{ margin: 0 }}>No reviews yet — be the first to review this product.</div>
          ) : reviews.map((r, i) => (
            <div className="review" key={i}>
              <div className="review-head">
                <div className="review-av">{(r.author || '?').charAt(0)}</div>
                <div>
                  <b>{r.author}</b>
                  <div className="review-stars">
                    {[0, 1, 2, 3, 4].map((n) => (
                      <Icon key={n} name="Star" size={12} color={n < r.rating ? 'var(--star)' : '#d7dde2'} />
                    ))}
                    {r.date && <span className="muted" style={{ fontSize: 12, marginLeft: 6 }}>{r.date}</span>}
                  </div>
                </div>
              </div>
              {r.title && <b className="review-title">{r.title}</b>}
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
