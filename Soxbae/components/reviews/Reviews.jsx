'use client';

import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { submitReview } from '@/lib/api';
import { toast } from '@/lib/toast';

// ONE review section, shared by the home page and the PDP. Same layout in both:
// a header with the average + count, then a clean grid of review cards. The PDP
// passes `showWrite` (+ productId) to add the "Write a review" button + modal.
export default function Reviews({
  reviews = [],
  title = 'What our customers say',
  productId,
  showWrite = false,
  limit,
}) {
  const [list, setList] = useState(Array.isArray(reviews) ? reviews : []);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', rating: 5, comment: '' });
  const [status, setStatus] = useState({ state: 'idle', msg: '' });

  const { avg, total } = useMemo(() => {
    const rated = list.filter((r) => Number(r.rating) > 0);
    const total = list.length;
    const avg = rated.length ? rated.reduce((a, r) => a + Number(r.rating), 0) / rated.length : 0;
    return { avg, total };
  }, [list]);

  const shown = limit ? list.slice(0, limit) : list;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Auto-scroll (infinite marquee) once there are more reviews than fit nicely:
  // more than 3 on desktop, more than 1 on mobile.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 700px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const scroll = shown.length > (isMobile ? 1 : 3);

  const ReviewCard = (r, i) => (
    <article className="sx-review" key={i}>
      <span className="sx-review-stars">
        {[0, 1, 2, 3, 4].map((n) => (
          <Icon key={n} name="Star" size={13} color={n < r.rating ? 'var(--accent)' : 'var(--line)'} />
        ))}
      </span>
      {r.title && <h3 className="sx-review-title">{r.title}</h3>}
      <p className="sx-review-text">{r.text}</p>
      <div className="sx-review-by">
        <span className="sx-review-av">{(r.author || '?').charAt(0)}</span>
        <span><b>{r.author}</b>{r.date && <em>{r.date}</em>}</span>
      </div>
    </article>
  );

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
    <section className="section container sx-reviews" id="reviews">
      <div className="sx-reviews-head">
        <div>
          <span className="eyebrow">Reviews</span>
          <h2>{title}</h2>
        </div>
        <div className="sx-reviews-right">
          <div className="sx-reviews-score">
            <b>{total ? avg.toFixed(1) : '—'}</b>
            <span className="sx-reviews-stars">
              {[0, 1, 2, 3, 4].map((i) => (
                <Icon key={i} name="Star" size={14} color={i < Math.round(avg) ? 'var(--accent)' : 'var(--line)'} />
              ))}
            </span>
            <small>{total} review{total === 1 ? '' : 's'}</small>
          </div>
          {showWrite && (
            <button type="button" className="sx-reviews-write" onClick={() => setOpen(true)}>
              Write a review
            </button>
          )}
        </div>
      </div>

      {status.state === 'success' && !open && <p className="form-msg success">{status.msg}</p>}

      {shown.length === 0 ? (
        <div className="empty">No reviews yet — {showWrite ? 'be the first to review this product.' : 'your feedback will appear here.'}</div>
      ) : scroll ? (
        <div className="sx-reviews-marquee" aria-label="Customer reviews, auto-scrolling">
          <div className="sx-reviews-track">
            {[...shown, ...shown].map((r, i) => ReviewCard(r, i))}
          </div>
        </div>
      ) : (
        <div className="sx-reviews-grid">
          {shown.map((r, i) => ReviewCard(r, i))}
        </div>
      )}

      {showWrite && open && (
        <div className="review-modal-overlay" onClick={() => setOpen(false)}>
          <div className="review-modal" data-lenis-prevent onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Write a review">
            <div className="review-modal-head">
              <h3>Write a review</h3>
              <button type="button" className="review-modal-close" onClick={() => setOpen(false)} aria-label="Close"><Icon name="X" size={18} /></button>
            </div>
            <form className="review-form" onSubmit={onSubmit}>
              <div className="review-form-rating">
                <span className="opt-label">Your rating</span>
                <div className="rating-picker">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button type="button" key={n} onClick={() => setForm((f) => ({ ...f, rating: n }))} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="rating-star">
                      <span className="rating-star-ic" style={{ color: n <= form.rating ? 'var(--accent)' : 'var(--line)' }}>★</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="field-row">
                <input className="input" placeholder="Your name" value={form.name} onChange={set('name')} required />
                <input className="input" type="email" placeholder="Email" value={form.email} onChange={set('email')} required />
              </div>
              <textarea className="input" rows={4} placeholder="Share your experience with this product…" value={form.comment} onChange={set('comment')} required />
              {status.state === 'error' && <p className="form-msg error">{status.msg}</p>}
              <button type="submit" className="btn btn-primary" disabled={status.state === 'loading'}>
                {status.state === 'loading' ? 'Submitting…' : 'Submit review'}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
