/**
 * PageHeader — every page starts the same way: title, one line saying what
 * the page is for, actions on the right. Stacks under 640px so the action
 * buttons don't get pushed off-screen on phones.
 *
 *   <PageHeader
 *     title="Coupons"
 *     description="Discount codes for sales and WhatsApp offers."
 *     actions={<><Button variant="secondary">Export</Button><Button>+ New coupon</Button></>}
 *   />
 *
 * `subtitle` is the older name for `description`. Also exported from
 * components/ui.
 */

export default function PageHeader({ title, description, subtitle, actions, children }) {
  const line = description ?? subtitle;
  return (
    <header className="ds-pageheader">
      <div className="ds-pageheader__text">
        <h1 className="ds-pageheader__title">{title}</h1>
        {line && <p className="ds-pageheader__subtitle">{line}</p>}
        {children}
      </div>
      {actions && <div className="ds-pageheader__actions">{actions}</div>}
    </header>
  );
}
