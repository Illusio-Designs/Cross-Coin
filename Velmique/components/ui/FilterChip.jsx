import Link from 'next/link';

/** Shared shop control: links navigate, buttons select or reveal filters. */
export default function FilterChip({ selected = false, href, children, className = '', ...props }) {
  const shared = {
    ...props,
    className: `v-filter-chip ${className}`.trim(),
    'data-selected': selected ? 'true' : 'false',
  };

  if (href) {
    return <Link {...shared} href={href} aria-current={selected ? 'page' : undefined}>{children}</Link>;
  }

  return <button type="button" {...shared}>{children}</button>;
}
