import React, { useState } from 'react';
import { createPublicReview } from '../../services/publicApi';

const StarPicker = ({ value, onChange }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="rvf-stars">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          className={`rvf-star ${(hovered || value) >= s ? 'active' : ''}`}
          aria-label={`${s} star`}
        >★</button>
      ))}
    </div>
  );
};

export default function ReviewForm({ productId, productName, onSubmitted }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', rating: 0, comment: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.rating) { setError('Please select a rating'); return; }
    if (!form.comment.trim()) { setError('Please write a review'); return; }
    setError('');
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('productId', productId);
      formData.append('rating', form.rating);
      formData.append('comment', form.comment);
      formData.append('name', form.name);
      formData.append('email', form.email);
      await createPublicReview(formData);
      setDone(true);
      if (onSubmitted) onSubmitted();
    } catch (err) {
      setError(typeof err === 'string' ? err : err?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setForm({ name: '', email: '', rating: 0, comment: '' });
    setError('');
    setDone(false);
  };

  return (
    <>
      <button className="rvf-trigger" onClick={() => setOpen(true)} type="button">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        Write a Review
      </button>

      {open && (
        <div className="rvf-overlay" onClick={handleClose}>
          <div className="rvf-modal" onClick={e => e.stopPropagation()}>
            <button className="rvf-close" onClick={handleClose} type="button" aria-label="Close">×</button>

            {done ? (
              <div className="rvf-done">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <h3>Thank you!</h3>
                <p>Your review has been submitted and is pending approval.</p>
                <button className="rvf-btn" onClick={handleClose} type="button">Close</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="rvf-form">
                <h3>Write a Review</h3>
                {productName && <p className="rvf-product-name">{productName}</p>}

                <label className="rvf-label">Your Rating</label>
                <StarPicker value={form.rating} onChange={v => set('rating', v)} />

                <div className="rvf-row">
                  <div className="rvf-field">
                    <label className="rvf-label">Name</label>
                    <input required value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your name" className="rvf-input" />
                  </div>
                  <div className="rvf-field">
                    <label className="rvf-label">Email</label>
                    <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" className="rvf-input" />
                  </div>
                </div>

                <label className="rvf-label">Your Review</label>
                <textarea required rows={4} value={form.comment} onChange={e => set('comment', e.target.value)} placeholder="Share your experience..." className="rvf-input rvf-textarea" />

                {error && <p className="rvf-error">{error}</p>}

                <button type="submit" disabled={submitting} className="rvf-btn">
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
