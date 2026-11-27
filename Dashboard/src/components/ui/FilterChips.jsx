import { useEffect, useRef } from 'react';
import clsx from '../Dashboard/primitives/_clsx';

const fmt = (n) => (typeof n === 'number' ? n.toLocaleString('en-IN') : n);

/**
 * FilterChips — tabs as pills, each with an optional count.
 *
 *   <FilterChips
 *     ariaLabel="Review status"
 *     items={[{ value: 'pending', label: 'Waiting', count: 6 }, { value: 'approved', label: 'Approved', count: 312 }, { value: 'rejected', label: 'Rejected' }]}
 *     value={tab} onChange={setTab}
 *   />
 *
 * Keyboard: ←/→ (and Home/End) move between chips and pick them; only the
 * picked chip is in the Tab order. `controls` = id of the list it filters.
 */
export default function FilterChips({ items = [], value, onChange, ariaLabel = 'Filter', controls, className, itemClassName, revealSelected = false }) {
  const refs = useRef([]);
  const listRef = useRef(null);
  const pick = (i) => {
    const it = items[i];
    if (!it || it.disabled) return;
    refs.current[i]?.focus();
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
    if (!revealSelected || !list || !active) return;
    const reveal = () => {
      if (list.scrollWidth <= list.clientWidth) return;
      const viewport = list.getBoundingClientRect();
      const tab = active.getBoundingClientRect();
      // Keep the selected tab visible without scrolling the page vertically.
      if (tab.left < viewport.left) list.scrollLeft += tab.left - viewport.left;
      else if (tab.right > viewport.right) list.scrollLeft += tab.right - viewport.right;
    };
    reveal();
    window.addEventListener('resize', reveal);
    return () => window.removeEventListener('resize', reveal);
  }, [activeIndex, value, hasCounts, revealSelected]);

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
            className={clsx('ui-chip', itemClassName, on && 'is-on')}
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
