'use client';

import { useEffect, useState } from 'react';
import { submitReview } from '@/lib/api/reviews';
import { toastReviewSubmitted, toastReviewError } from '@/lib/toast';

/* "Write a review" button + modal for the PDP. Posts a guest review to
   /api/reviews/submit (moderated before it shows). Opens by itself for the
   WhatsApp review-request deep link (?review=open). */
export default function WriteReview({ productId, productName, label = 'Write a review' }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('review') === 'open') setOpen(true);
    } catch { /* ignore */ }
  }, []);

  return (
    <>
      <button type="button" className="m-btn m-btn--ghost" onClick={() => setOpen(true)}>{label}</button>
      {open ? <ReviewModal productId={productId} productName={productName} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function ReviewModal({ productId, productName, onClose }) {
  const [rating, setRating] = useState(0);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!rating) return setError('Please pick a rating.');
    if (!comment.trim()) return setError('Please write a short review.');
    if (!name.trim()) return setError('Please enter your name.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Please enter a valid email.');
    setBusy(true);
    try {
      await submitReview({ productId, rating, comment: comment.trim(), name: name.trim(), email: email.trim() });
      setDone(true);
      toastReviewSubmitted();
    } catch (err) {
      const msg = err.message || 'Could not submit your review. Please try again.';
      setError(msg);
      toastReviewError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="m-modal" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="m-modal__card" role="dialog" aria-modal="true" aria-labelledby="m-review-title">
        <button type="button" className="m-modal__x" aria-label="Close" onClick={onClose}>×</button>
        {done ? (
          <div style={{ textAlign: 'center', padding: '18px 0' }}>
            <span className="m-eyebrow">Thank you</span>
            <h2 id="m-review-title" className="m-modal__h">Review received.</h2>
            <p className="m-modal__p">Your review of {productName || 'this fragrance'} will appear once it has been checked.</p>
            <button type="button" className="m-btn m-btn--fill" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <span className="m-eyebrow">Your experience</span>
            <h2 id="m-review-title" className="m-modal__h">Review {productName || 'this fragrance'}</h2>
            <div className="m-field">
              <span className="m-label" id="m-rate-l">Rating</span>
              <div className="m-ratepick" role="radiogroup" aria-labelledby="m-rate-l">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    className={n <= rating ? 'on' : ''} onClick={() => setRating(n)}>★</button>
                ))}
              </div>
            </div>
            <div className="m-grid2">
              <div className="m-field"><label className="m-label" htmlFor="m-rv-name">Name</label><input id="m-rv-name" className="m-input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
              <div className="m-field"><label className="m-label" htmlFor="m-rv-email">Email</label><input id="m-rv-email" className="m-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
            </div>
            <div className="m-field"><label className="m-label" htmlFor="m-rv-text">Review</label><textarea id="m-rv-text" className="m-textarea" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="How does it wear, last and make you feel?" /></div>
            {error ? <p className="m-formerr" role="alert">{error}</p> : null}
            <button type="submit" className="m-btn m-btn--fill" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>{busy ? 'Submitting…' : 'Submit review'}</button>
          </form>
        )}
      </div>
    </div>
  );
}
