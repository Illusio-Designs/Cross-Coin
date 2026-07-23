'use client';

import { useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { submitReview } from '@/lib/api';

// Product reviews: real average + distribution computed from the actual
// reviews, the review list, and a working "write a review" form that POSTs to
// /api/reviews/submit (same endpoint the other brands use). New reviews show
// immediately (pending moderation is normal on the backend).
export default function ProductReviews({ productId, initialReviews = [], fallbackRating = 0, fallbackCount = 0 }) {
  const [reviews, setReviews] = useState(Array.isArray(initialReviews) ? initialReviews : []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', rating: 5, comment: '' });
  const [status, setStatus] = useState({ state: 'idle', msg: '' });

  const { avg, total, dist } = useMemo(() => {
    const list = reviews.filter((r) => Number(r.rating) > 0);
    const total = list.length || fallbackCount;
    const avg = list.length
      ? list.reduce((a, r) => a + Number(r.rating), 0) / list.length
      : Number(fallbackRating) || 0;
    const dist = [5, 4, 3, 2, 1].map((s) => {
      const c = list.filter((r) => Math.round(Number(r.rating)) === s).length;
      return { s, pct: list.length ? Math.round((c / list.length) * 100) : 0 };
    });
    return { avg, total, dist };
  }, [reviews, fallbackRating, fallbackCount]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.comment.trim() || !form.name.trim()) {
      setStatus({ state: 'error', msg: 'Please add your name and a short review.' });
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
      // Show it right away.
      setReviews((prev) => [
        { author: form.name.trim(), rating: Number(form.rating), date: 'Just now', title: '', text: form.comment.trim() },
        ...prev,
      ]);
      setForm({ name: '', email: '', rating: 5, comment: '' });
      setStatus({ state: 'success', msg: 'Thanks! Your review has been submitted.' });
      setOpen(false);
    } catch (err) {
      setStatus({ state: 'error', msg: err.message || 'Could not submit your review. Please try again.' });
    }
  };

  return (
    <section className="pdp-reviews section" id="reviews">
      <div className="section-head" style={{ justifyContent: 'space-between' }}>
        <h2>Customer reviews</h2>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen((o) => !o)}>
          {open ? 'Close' : 'Write a review'} <Icon name="Star" size={15} />
        </button>
      </div>

      {open && (
        <form className="review-form" onSubmit={onSubmit}>
          <div className="review-form-rating">
            <span className="opt-label">Your rating</span>
            <div className="rating-picker">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setForm((f) => ({ ...f, rating: n }))}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`} className="rating-star">
                  <Icon name="Star" size={22} color={n <= form.rating ? 'var(--star)' : '#d7dde2'} />
                </button>
              ))}
            </div>
          </div>
          <div className="field-row">
            <input className="input" placeholder="Your name" value={form.name} onChange={set('name')} required />
            <input className="input" type="email" placeholder="Email (optional)" value={form.email} onChange={set('email')} />
          </div>
          <textarea className="input" rows={4} placeholder="Share your experience with this product…"
            value={form.comment} onChange={set('comment')} required />
          {status.state === 'error' && <p className="form-msg error">{status.msg}</p>}
          <button type="submit" className="btn btn-primary" disabled={status.state === 'loading'}>
            {status.state === 'loading' ? 'Submitting…' : 'Submit review'}
          </button>
        </form>
      )}

      {status.state === 'success' && !open && <p className="form-msg success">{status.msg}</p>}

      <div className="reviews-layout">
        <div className="reviews-summary">
          <div className="rs-score">{avg.toFixed(1)}</div>
          <div className="rs-stars">
            {[0, 1, 2, 3, 4].map((i) => (
              <Icon key={i} name="Star" size={16} color={i < Math.round(avg) ? 'var(--star)' : '#d7dde2'} />
            ))}
          </div>
          <div className="muted" style={{ fontSize: 13 }}>Based on {total} review{total === 1 ? '' : 's'}</div>
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
