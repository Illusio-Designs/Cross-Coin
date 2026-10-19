// Building blocks shared by the Website tabs (see WebsiteShell.jsx).
import { useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import StatusPill from '../ui/StatusPill';
import ErrorState from '../ui/ErrorState';
import FilterChips from '../ui/FilterChips';
import { brandLabel } from './webUtil';

// Status filter chips (shared FilterChips) — chips: [{ id, label, count }].
export function WebChips({ chips, value, onChange, label = 'Filter' }) {
  return <FilterChips ariaLabel={label} items={chips.map((c) => ({ value: c.id, label: c.label, count: c.count }))} value={value} onChange={onChange} />;
}

// Card grid + side panel, the same on every tab.
export function WebBody({ children, panel }) {
  return (
    <div className="web-body">
      <section className="web-main">{children}</section>
      {panel}
    </div>
  );
}

export function WebGridState({ loading, error, onRetry, empty, count }) {
  if (error) return <ErrorState message={`Couldn't load this list — ${error}`} onRetry={onRetry} />;
  if (loading) return <div className="web-grid" aria-busy="true">{[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="web-skel-card" />)}</div>;
  if (!count) return empty;
  return null;
}

/**
 * One card. `media` is an image URL, or a node for cards without a picture.
 * Extra controls (reorder…) go in `foot`, outside the main button.
 */
export function WebCard({ selected, onOpen, media, mediaAlt = '', title, pill, meta, sub, foot, wide = false }) {
  return (
    <article className={`web-card${selected ? ' is-on' : ''}`}>
      <button type="button" className="web-card-main" onClick={onOpen} aria-pressed={selected}>
        {media !== undefined && (
          <span className={`web-card-media${wide ? '' : ' web-card-media--169'}`}>
            {typeof media === 'string' && media
              ? <img src={media} alt={mediaAlt} loading="lazy" onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }} />
              : (media || <span className="web-card-noimg">No picture</span>)}
          </span>
        )}
        <span className="web-card-row">
          <b className="web-card-title">{title}</b>
          {pill && <StatusPill tone={pill.tone} size="sm">{pill.label}</StatusPill>}
        </span>
        {meta && <span className="web-card-meta">{meta}</span>}
        {sub && <span className="web-card-sub">{sub}</span>}
      </button>
      {foot && <div className="web-card-foot">{foot}</div>}
    </article>
  );
}

export function WebPager({ page, limit, total, onPage }) {
  if (!total || total <= limit) return null;
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="web-pager">
      <span>{from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}</span>
      <span className="web-pager-btns">
        <button type="button" className="web-btn web-btn--sm" disabled={page <= 1} onClick={() => onPage(page - 1)}><HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} /> Prev</button>
        <button type="button" className="web-btn web-btn--sm" disabled={to >= total} onClick={() => onPage(page + 1)}>Next <HugeiconsIcon icon={ArrowRight01Icon} size={14} strokeWidth={2} /></button>
      </span>
    </div>
  );
}

/**
 * The side-panel editor. On narrow screens it sits under the grid, so it
 * scrolls into view when a card opens it.
 */
export function WebPanel({ open, title, pill, onClose, children, actions, wide = false, hint }) {
  const ref = useRef(null);
  useEffect(() => {
    if (open && ref.current && typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 960px)').matches) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [open, title]);
  return (
    <aside ref={ref} className={`web-panel${wide ? ' web-panel--wide' : ''}${open ? '' : ' is-idle'}`} aria-label={open ? title : 'Editor'}>
      {open ? (
        <>
          <div className="web-panel-head">
            <b className="web-panel-title">{title}</b>
            {pill && <StatusPill tone={pill.tone} size="sm">{pill.label}</StatusPill>}
            {onClose && <button type="button" className="web-icon-btn" aria-label="Close editor" onClick={onClose}><HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} /></button>}
          </div>
          <div className="web-panel-body">{children}</div>
          {actions && <div className="web-panel-actions">{actions}</div>}
        </>
      ) : (
        <p className="web-panel-hint">{hint || 'Pick a card to edit it here.'}</p>
      )}
    </aside>
  );
}

export function WebField({ label, hint, error, children, htmlFor }) {
  return (
    <div className={`web-field${error ? ' has-error' : ''}`}>
      {label && <label className="web-label" htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="web-field-err">{error}</span> : hint ? <span className="web-hint">{hint}</span> : null}
    </div>
  );
}

// "View on site ↗" — disabled with a reason when there is no web address yet.
export function ViewOnSite({ url, reason = 'Add this store’s web address in Brands to open it.' }) {
  if (!url) return <button type="button" className="web-btn" disabled title={reason}>View on site ↗</button>;
  return <a className="web-btn" href={url} target="_blank" rel="noopener noreferrer">View on site ↗</a>;
}

export function StoreChecks({ brands, value, onChange, disabled }) {
  const sel = (value || []).map(Number);
  return (
    <div className="web-checks" role="group" aria-label="Stores">
      {brands.map((b) => {
        const on = sel.includes(Number(b.id));
        return (
          <label key={b.id} className={`web-check${on ? ' is-on' : ''}`}>
            <input type="checkbox" checked={on} disabled={disabled}
              onChange={() => onChange(on ? sel.filter((x) => x !== Number(b.id)) : [...sel, Number(b.id)])} />
            {brandLabel(b)}
          </label>
        );
      })}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label className="web-toggle">
      <span>{label}</span>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} className={`web-switch${checked ? ' is-on' : ''}`} onClick={() => onChange(!checked)}>
        <span />
      </button>
    </label>
  );
}
