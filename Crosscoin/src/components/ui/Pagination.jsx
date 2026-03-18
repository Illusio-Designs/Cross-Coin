import React from 'react';

const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);
const ChevronsLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>
);
const ChevronsRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
);

const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  showFirstLast = true,
  showPrevNext = true,
  showPageNumbers = true,
  maxVisiblePages = 7,
  size = 'md',
  className = '',
  disabled = false,
  ...props
}) => {
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const delta = Math.floor((maxVisiblePages - 3) / 2);
    const rangeWithDots = [];
    let start = Math.max(2, currentPage - delta);
    let end = Math.min(totalPages - 1, currentPage + delta);
    if (currentPage <= delta + 2) end = Math.min(totalPages - 1, maxVisiblePages - 2);
    if (currentPage >= totalPages - delta - 1) start = Math.max(2, totalPages - maxVisiblePages + 3);
    if (start > 2) rangeWithDots.push(1, '...');
    else rangeWithDots.push(1);
    for (let i = start; i <= end; i++) { if (i !== 1 && i !== totalPages) rangeWithDots.push(i); }
    if (end < totalPages - 1) rangeWithDots.push('...', totalPages);
    else if (totalPages > 1) rangeWithDots.push(totalPages);
    return rangeWithDots;
  };

  const handlePageChange = (page) => {
    if (!disabled && page !== currentPage && page >= 1 && page <= totalPages) onPageChange?.(page);
  };

  const btnCls = (isActive = false, isDisabled = false) =>
    ['pgn-btn', isActive && 'pgn-btn-active', isDisabled && 'pgn-btn-disabled'].filter(Boolean).join(' ');

  if (totalPages <= 1) return null;

  const containerCls = ['pgn', `pgn-${size}`, disabled && 'pgn-disabled', className].filter(Boolean).join(' ');

  return (
    <nav className={containerCls} aria-label="Pagination" {...props}>
      {showFirstLast && (
        <button className={btnCls(false, currentPage === 1 || disabled)}
          onClick={() => handlePageChange(1)} disabled={currentPage === 1 || disabled} aria-label="First page">
          <ChevronsLeft />
        </button>
      )}
      {showPrevNext && (
        <button className={btnCls(false, currentPage === 1 || disabled)}
          onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1 || disabled} aria-label="Previous page">
          <ChevronLeft />
        </button>
      )}
      {showPageNumbers && getVisiblePages().map((page, i) =>
        page === '...' ? (
          <span key={`e-${i}`} className="pgn-ellipsis" aria-hidden="true">...</span>
        ) : (
          <button key={page} className={btnCls(currentPage === page, disabled)}
            onClick={() => handlePageChange(page)} disabled={disabled}
            aria-label={`Page ${page}`} aria-current={currentPage === page ? 'page' : undefined}>
            {page}
          </button>
        )
      )}
      {showPrevNext && (
        <button className={btnCls(false, currentPage === totalPages || disabled)}
          onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || disabled} aria-label="Next page">
          <ChevronRight />
        </button>
      )}
      {showFirstLast && (
        <button className={btnCls(false, currentPage === totalPages || disabled)}
          onClick={() => handlePageChange(totalPages)} disabled={currentPage === totalPages || disabled} aria-label="Last page">
          <ChevronsRight />
        </button>
      )}
    </nav>
  );
};

export default Pagination;
