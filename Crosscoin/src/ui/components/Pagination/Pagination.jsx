import React from 'react';
import { FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight } from 'react-icons/fi';
import styles from './Pagination.module.css';

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
  // Generate visible page numbers with ellipsis
  const getVisiblePages = () => {
    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const delta = Math.floor((maxVisiblePages - 3) / 2); // Reserve space for first, last, and ellipsis
    const range = [];
    const rangeWithDots = [];
    
    // Always show first page
    range.push(1);
    
    // Calculate start and end of middle range
    let start = Math.max(2, currentPage - delta);
    let end = Math.min(totalPages - 1, currentPage + delta);
    
    // Adjust range if we're near the beginning or end
    if (currentPage <= delta + 2) {
      end = Math.min(totalPages - 1, maxVisiblePages - 2);
    }
    if (currentPage >= totalPages - delta - 1) {
      start = Math.max(2, totalPages - maxVisiblePages + 3);
    }
    
    // Add ellipsis before middle range if needed
    if (start > 2) {
      rangeWithDots.push(1, '...');
    } else {
      rangeWithDots.push(1);
    }
    
    // Add middle range
    for (let i = start; i <= end; i++) {
      if (i !== 1 && i !== totalPages) {
        rangeWithDots.push(i);
      }
    }
    
    // Add ellipsis after middle range if needed
    if (end < totalPages - 1) {
      rangeWithDots.push('...', totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }
    
    return rangeWithDots;
  };

  const handlePageChange = (page) => {
    if (!disabled && page !== currentPage && page >= 1 && page <= totalPages) {
      onPageChange?.(page);
    }
  };

  const containerClasses = [
    styles.pagination,
    styles[`pagination--${size}`],
    disabled && styles['pagination--disabled'],
    className
  ].filter(Boolean).join(' ');

  const buttonClasses = (isActive = false, isDisabled = false) => [
    styles.button,
    isActive && styles['button--active'],
    isDisabled && styles['button--disabled']
  ].filter(Boolean).join(' ');

  if (totalPages <= 1) return null;

  return (
    <nav className={containerClasses} aria-label="Pagination" {...props}>
      {showFirstLast && (
        <button
          className={buttonClasses(false, currentPage === 1 || disabled)}
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1 || disabled}
          aria-label="First page"
          title="First page"
        >
          <FiChevronsLeft />
        </button>
      )}
      
      {showPrevNext && (
        <button
          className={buttonClasses(false, currentPage === 1 || disabled)}
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || disabled}
          aria-label="Previous page"
          title="Previous page"
        >
          <FiChevronLeft />
        </button>
      )}
      
      {showPageNumbers && getVisiblePages().map((page, index) => (
        page === '...' ? (
          <span 
            key={`ellipsis-${index}`} 
            className={styles.ellipsis}
            aria-hidden="true"
          >
            ...
          </span>
        ) : (
          <button
            key={page}
            className={buttonClasses(currentPage === page, disabled)}
            onClick={() => handlePageChange(page)}
            disabled={disabled}
            aria-label={`Page ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
            title={`Page ${page}`}
          >
            {page}
          </button>
        )
      ))}

      {showPrevNext && (
        <button
          className={buttonClasses(false, currentPage === totalPages || disabled)}
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || disabled}
          aria-label="Next page"
          title="Next page"
        >
          <FiChevronRight />
        </button>
      )}
      
      {showFirstLast && (
        <button
          className={buttonClasses(false, currentPage === totalPages || disabled)}
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage === totalPages || disabled}
          aria-label="Last page"
          title="Last page"
        >
          <FiChevronsRight />
        </button>
      )}
    </nav>
  );
};

export default Pagination;