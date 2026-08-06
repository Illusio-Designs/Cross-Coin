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

import { HugeiconsIcon } from '@hugeicons/react';
import { InformationCircleIcon } from '@hugeicons/core-free-icons';

const DefaultIcon = <HugeiconsIcon icon={InformationCircleIcon} size={40} strokeWidth={1.6} aria-hidden="true" />;

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
