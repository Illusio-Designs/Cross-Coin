/**
 * FilterBar — search box + filter pills row, sticks to the top of the
 * scroll container so it stays accessible while the user paginates
 * through a long table.
 *
 *   <FilterBar
 *     search={search}
 *     onSearchChange={setSearch}
 *     placeholder="Search products…"
 *   >
 *     <Select ... />
 *     <Select ... />
 *     <button className="ds-btn">Export</button>
 *   </FilterBar>
 *
 * Children render to the right of the search input on desktop and
 * wrap below it on mobile (search collapses to full width).
 */

const SearchIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

export default function FilterBar({
  search,
  onSearchChange,
  placeholder = 'Search…',
  hideSearch = false,             // omit the search input for filter-only rows
  children,
  ...rest
}) {
  return (
    <div className="ds-filterbar" {...rest}>
      {!hideSearch && (
        <label className="ds-filterbar__search" aria-label="Search">
          {SearchIcon}
          <input
            type="search"
            value={search ?? ''}
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder={placeholder}
          />
        </label>
      )}
      {children && <div className="ds-filterbar__group" style={hideSearch ? { flex: 1 } : undefined}>{children}</div>}
    </div>
  );
}
