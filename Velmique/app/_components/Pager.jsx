import Link from 'next/link';

/* Numbered pagination. Works in server components with `hrefFor(n)` (links,
   crawlable) or inside client components with `onGo(n)` (buttons). */
export default function Pager({ page, pages, onGo, hrefFor }) {
  const nums = Array.from({ length: pages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  const item = (n, label, opts = {}) => (hrefFor
    ? <Link key={`${label}-${n}`} href={hrefFor(n)} className={`m-pager__b ${opts.on ? 'on' : ''}`} aria-current={opts.on ? 'page' : undefined} aria-label={opts.aria}>{label}</Link>
    : <button key={`${label}-${n}`} type="button" className={`m-pager__b ${opts.on ? 'on' : ''}`} aria-current={opts.on ? 'page' : undefined} aria-label={opts.aria} onClick={() => onGo(n)}>{label}</button>);
  const out = [];
  if (page > 1) out.push(item(page - 1, '‹', { aria: 'Previous page' }));
  nums.forEach((n, i) => {
    if (i && n - nums[i - 1] > 1) out.push(<span key={`gap-${n}`} className="m-pager__gap">…</span>);
    out.push(item(n, String(n), { on: n === page, aria: `Page ${n}` }));
  });
  if (page < pages) out.push(item(page + 1, '›', { aria: 'Next page' }));
  return <nav className="m-pager" aria-label="Pagination">{out}</nav>;
}
