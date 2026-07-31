'use client';

/* Numbered pagination — ‹  1 … n-1 [n] n+1 … N  › with a windowed range.
   Bordered buttons styled with the brand ink/paper tokens; active = filled. */

function pageList(page, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, '…', total];
  if (page >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total];
  return [1, '…', page - 1, page, page + 1, '…', total];
}

export default function Pagination({ page = 1, totalPages = 1, onChange, disabled = false }) {
  if (!totalPages || totalPages <= 1) return null;
  const items = pageList(page, totalPages);

  const base =
    'inline-flex items-center justify-center min-w-[40px] h-10 px-3 rounded-full border text-sm font-body transition-colors';
  const cell = (active) =>
    active
      ? `${base} border-[var(--ink)] bg-[var(--ink)] text-white font-medium`
      : `${base} border-[var(--border)] bg-white text-[var(--ink)] hover:border-[var(--gold)]`;
  const arrow = (enabled) =>
    `${base} border-[var(--border)] bg-white text-[var(--ink)] ${
      enabled && !disabled ? 'hover:border-[var(--gold)]' : 'opacity-40 cursor-not-allowed'
    }`;

  return (
    <nav aria-label="Pagination" className="mt-16 flex flex-wrap items-center justify-center gap-2">
      <button
        aria-label="Previous page"
        className={arrow(page > 1)}
        disabled={disabled || page <= 1}
        onClick={() => onChange(page - 1)}
      >
        ‹
      </button>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={`e${i}`} className="px-1 text-[var(--ink-muted)]">…</span>
        ) : (
          <button
            key={it}
            className={cell(it === page)}
            disabled={disabled}
            aria-current={it === page ? 'page' : undefined}
            onClick={() => onChange(it)}
          >
            {it}
          </button>
        )
      )}
      <button
        aria-label="Next page"
        className={arrow(page < totalPages)}
        disabled={disabled || page >= totalPages}
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
    </nav>
  );
}
