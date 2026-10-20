// Building blocks shared by the Website tabs (see WebsiteShell.jsx).
import { useEffect, useRef } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon, ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import StatusPill from '../ui/StatusPill';
import ErrorState from '../ui/ErrorState';
import FilterChips from '../ui/FilterChips';
import { Skeleton, SkeletonForm } from '../ui/Skeleton';
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

const SKEL_TITLE_W = ['72%', '58%', '80%', '64%', '76%', '52%', '68%', '60%'];

/**
 * Card-shaped placeholders in the same grid the cards use. `media` is the
 * picture's aspect ratio ('16 / 9', '1 / 1') or null for text-only cards.
 */
export function WebGridSkeleton({ grid = 'web-grid', media = '16 / 9', count = 6, label = 'Loading…' }) {
  return (
    <div className={grid} role="status" aria-busy="true">
      <span className="ds-sr-only">{label}</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="web-card web-card--skel" aria-hidden="true">
          <span className="web-card-main">
            {media && <Skeleton w="100%" h="auto" r={10} style={{ aspectRatio: media }} />}
            <span className="web-card-row"><Skeleton w={SKEL_TITLE_W[i % SKEL_TITLE_W.length]} h={13} /><Skeleton w={44} h={16} r={999} /></span>
            <Skeleton w="50%" h={10} />
            {!media && <Skeleton w="35%" h={10} />}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Error / first-load / empty states for a card grid. Skeleton only when there
 * is nothing to show yet — on a refetch (search, filter, page) the tab keeps
 * the old cards on screen, dimmed with `webStale(loading)`.
 */
export function WebGridState({ loading, error, onRetry, empty, count, grid, media, label }) {
  if (error) return <ErrorState message={`Couldn't load this list — ${error}`} onRetry={onRetry} />;
  if (loading && !count) return <WebGridSkeleton grid={grid} media={media} label={label} />;
  if (!count) return empty;
  return null;
}
export const webStale = (loading) => (loading ? ' is-stale' : '');

// Side-panel body while a record's details load (the panel header stays).
export function WebPanelSkeleton({ fields = 4, editor = false, label = 'Loading…' }) {
  return (
    <>
      <SkeletonForm fields={fields} label={label} />
      {editor && <div className="web-editor-skel" aria-hidden="true" />}
    </>
  );
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
export function ViewOnSite({ url, label = 'View on site ↗', reason = 'Add this store’s web address in Brands to open it.' }) {
  if (!url) return <button type="button" className="web-btn" disabled title={reason}>{label}</button>;
  return <a className="web-btn" href={url} target="_blank" rel="noopener noreferrer">{label}</a>;
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
