'use client';

import { useRef } from 'react';

/* Four single-digit boxes with auto-advance, backspace-to-previous and paste
   of the whole code. `value` is an array of 4 strings. */
export default function OtpInput({ value, onChange, onComplete }) {
  const refs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const setAt = (i, d) => {
    const next = [...value];
    next[i] = d;
    onChange(next);
    if (d && i < 3) refs[i + 1].current?.focus();
    if (next.every(Boolean)) onComplete?.(next.join(''));
  };

  const onPaste = (e) => {
    const digits = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (!digits) return;
    e.preventDefault();
    const next = [0, 1, 2, 3].map((i) => digits[i] || '');
    onChange(next);
    refs[Math.min(digits.length, 3)].current?.focus();
    if (digits.length === 4) onComplete?.(digits);
  };

  return (
    <div className="m-otp" role="group" aria-label="One-time password">
      {value.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          className="m-input"
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          value={d}
          aria-label={`Digit ${i + 1}`}
          autoFocus={i === 0}
          onPaste={onPaste}
          onChange={(e) => setAt(i, e.target.value.replace(/\D/g, '').slice(-1))}
          onKeyDown={(e) => { if (e.key === 'Backspace' && !value[i] && i > 0) refs[i - 1].current?.focus(); }}
        />
      ))}
    </div>
  );
}
