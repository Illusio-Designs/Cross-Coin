import React from 'react';

/* Numbered pagination — shared across the blog (and reusable elsewhere).
   Shows: ‹  1 … n-1 [n] n+1 … N  › with a windowed range. */

function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (page >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', page - 1, page, page + 1, '…', total];
}

export default function Pagination({ page = 1, totalPages = 1, onChange, disabled = false }) {
  if (!totalPages || totalPages <= 1) return null;
  const items = pageList(page, totalPages);

  const btn = (active) => ({
    minWidth: 40,
    height: 40,
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    border: '1px solid ' + (active ? '#111' : '#e5e7eb'),
    background: active ? '#111' : '#fff',
    color: active ? '#fff' : '#111',
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all .2s ease',
  });

  const arrow = (enabled) => ({
    ...btn(false),
    minWidth: 40,
    opacity: enabled && !disabled ? 1 : 0.4,
    cursor: enabled && !disabled ? 'pointer' : 'not-allowed',
  });

  return (
    <nav aria-label="Pagination" className="blog-pagination"
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap', margin: '40px auto 8px' }}>
      <button aria-label="Previous page" style={arrow(page > 1)} disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>‹</button>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={`e${i}`} style={{ color: '#9ca3af', padding: '0 4px' }}>…</span>
        ) : (
          <button key={it} style={btn(it === page)} disabled={disabled} aria-current={it === page ? 'page' : undefined} onClick={() => onChange(it)}>
            {it}
          </button>
        )
      )}
      <button aria-label="Next page" style={arrow(page < totalPages)} disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>›</button>
    </nav>
  );
}
