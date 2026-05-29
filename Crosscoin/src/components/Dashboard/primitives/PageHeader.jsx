/**
 * PageHeader — consistent top-of-page block for every dashboard view.
 * Reflows to a stacked layout under 640px so action buttons don't
 * get pushed off-screen on phones.
 *
 *   <PageHeader
 *     title="Products"
 *     subtitle="123 active · 4 out of stock"
 *     actions={<button className="ds-btn ds-btn--primary">+ Add</button>}
 *   />
 */

export default function PageHeader({ title, subtitle, actions, children }) {
  return (
    <header className="ds-pageheader">
      <div className="ds-pageheader__text">
        <h1 className="ds-pageheader__title">{title}</h1>
        {subtitle && <p className="ds-pageheader__subtitle">{subtitle}</p>}
        {children}
      </div>
      {actions && <div className="ds-pageheader__actions">{actions}</div>}
    </header>
  );
}
