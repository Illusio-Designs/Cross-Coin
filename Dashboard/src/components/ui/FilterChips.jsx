import { useEffect, useRef } from 'react';
import clsx from '../Dashboard/primitives/_clsx';

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-IN') : n);

/**
 * FilterChips — dashboard tabs with optional counts.
 *
 *   <FilterChips
 *     ariaLabel="Review status"
 *     items={[{ value: 'pending', label: 'Waiting', count: 6 }, { value: 'approved', label: 'Approved', count: 312 }, { value: 'rejected', label: 'Rejected' }]}
 *     value={tab} onChange={setTab}
 *   />
 *
 * Keyboard: ←/→ (and Home/End) move between tabs and pick them; only the
 * selected tab is in the keyboard Tab order. `controls` = id of the list it filters.
 */
export default function FilterChips({ items = [], value, onChange, ariaLabel = 'Filter', controls, className }) {
  const refs = useRef([]);
  const listRef = useRef(null);
  const pick = (i) => {
    const it = items[i];
    if (!it || it.disabled) return;
    refs.current[i]?.focus({ preventScroll: true });
    if (it.value !== value) onChange?.(it.value);
  };
  const onKeyDown = (e, i) => {
    const last = items.length - 1;
    const to = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    pick(to);
  };
  const activeIndex = items.findIndex((it) => it.value === value);
  const selectedIndex = Math.max(0, activeIndex);
  const hasCounts = items.some((it) => it.count != null);

  useEffect(() => {
    const list = listRef.current;
    const active = refs.current[activeIndex];
    if (!list || !active) return;
    const reveal = () => {
      if (list.scrollWidth <= list.clientWidth) return;
      const viewport = list.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      const { paddingLeft, paddingRight } = window.getComputedStyle(list);
      const left = viewport.left + list.clientLeft + parseFloat(paddingLeft);
      const right = viewport.left + list.clientLeft + list.clientWidth - parseFloat(paddingRight);
      // Leave room for the group padding without scrolling the page vertically.
      if (tab.left < left) list.scrollLeft += tab.left - left;
      else if (tab.right > right) list.scrollLeft += tab.right - right;
    };
    reveal();
    window.addEventListener('resize', reveal);
    return () => window.removeEventListener('resize', reveal);
  }, [activeIndex, value, hasCounts]);

  return (
    <div ref={listRef} className={clsx('ui-chips', className)} role="tablist" aria-label={ariaLabel}>
      {items.map((it, i) => {
        const on = it.value === value;
        return (
          <button
            key={String(it.value)}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="tab"
            aria-selected={on}
            aria-controls={controls}
            tabIndex={i === selectedIndex ? 0 : -1}
            disabled={it.disabled}
            className={clsx('ui-chip', on && 'is-on')}
            onClick={() => pick(i)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {it.label}
            {it.count !== undefined && it.count !== null && <b className="ui-chip__count">{fmt(it.count)}</b>}
          </button>
        );
      })}
    </div>
  );
}
