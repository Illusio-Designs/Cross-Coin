/**
 * EmptyState — friendlier "nothing here yet" panel than a raw "No data"
 * row. Used by ResponsiveTable as its default empty content but also
 * works standalone (filtered lists, search with no results, etc.).
 *
 *   <EmptyState
 *     icon={<MyIcon />}
 *     title="No products yet"
 *     message="Add your first product to get started."
 *     action={<button className="ds-btn ds-btn--primary">+ Add product</button>}
 *   />
 */

const DefaultIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export default function EmptyState({ icon, title, message, action }) {
  return (
    <div className="ds-empty" role="status" aria-live="polite">
      <div className="ds-empty__icon" aria-hidden="true">{icon || DefaultIcon}</div>
      {title && <h3 className="ds-empty__title">{title}</h3>}
      {message && <p className="ds-empty__message">{message}</p>}
      {action}
    </div>
  );
}
