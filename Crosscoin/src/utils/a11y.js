// Accessibility utilities for WCAG 2.1 compliance

// Generate unique IDs for form fields and labels
export const useAccessibleId = (prefix = 'field') => {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
};

// Check if element is visible to screen readers
export const isAccessible = (element) => {
  if (!element) return false;

  const style = window.getComputedStyle(element);

  // Check if hidden
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false;
  }

  // Check aria-hidden
  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  return true;
};

// Announce messages to screen readers
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.style.position = 'absolute';
  announcement.style.left = '-10000px';
  announcement.style.width = '1px';
  announcement.style.height = '1px';
  announcement.style.overflow = 'hidden';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

// Create accessible modal with proper focus management
export const createAccessibleModal = (options) => {
  const {
    title,
    content,
    onClose,
    focusSelector = null,
  } = options;

  return {
    open: () => {
      // Store previously focused element
      const previousActive = document.activeElement;

      // Announce modal opening
      announceToScreenReader(`${title} dialog opened`);

      return { previousActive };
    },
    close: (state) => {
      // Restore focus
      if (state?.previousActive) {
        state.previousActive.focus();
      }

      // Announce modal closing
      announceToScreenReader(`${title} dialog closed`);

      onClose?.();
    },
  };
};

// Check color contrast ratio (WCAG compliance)
export const getContrastRatio = (rgb1, rgb2) => {
  const getLuminance = (rgb) => {
    const [r, g, b] = rgb.match(/\d+/g).map(x => {
      const v = parseInt(x) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

// Check if contrast meets WCAG AA standards
export const meetsContrastAA = (rgb1, rgb2) => {
  const ratio = getContrastRatio(rgb1, rgb2);
  return ratio >= 4.5; // 4.5:1 for normal text, 3:1 for large text
};

// Keyboard navigation helpers
export const handleKeyboardNavigation = (event, options = {}) => {
  const { onEnter = null, onEscape = null, onArrowUp = null, onArrowDown = null } = options;

  switch (event.key) {
    case 'Enter':
    case ' ':
      onEnter?.(event);
      break;
    case 'Escape':
      onEscape?.(event);
      break;
    case 'ArrowUp':
      onArrowUp?.(event);
      break;
    case 'ArrowDown':
      onArrowDown?.(event);
      break;
    default:
      break;
  }
};

// Skip navigation link for keyboard users
export const createSkipLink = () => {
  const skip = document.createElement('a');
  skip.href = '#main-content';
  skip.className = 'skip-link';
  skip.textContent = 'Skip to main content';
  skip.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: white;
    padding: 8px;
    text-decoration: none;
    z-index: 100;
  `;
  skip.addEventListener('focus', () => {
    skip.style.top = '0';
  });
  skip.addEventListener('blur', () => {
    skip.style.top = '-40px';
  });

  document.body.insertBefore(skip, document.body.firstChild);
};

// Focus trap for modals
export const createFocusTrap = (element) => {
  const focusableElements = element.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }
  };

  element.addEventListener('keydown', handleKeyDown);

  return () => {
    element.removeEventListener('keydown', handleKeyDown);
  };
};

// Create accessible icon button (icon-only buttons need labels)
export const createAccessibleIconButton = (icon, label, onClick) => {
  return {
    role: 'button',
    'aria-label': label,
    tabIndex: 0,
    onClick,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        onClick(e);
      }
    },
  };
};

// Create accessible table
export const createAccessibleTable = (data, columns) => {
  return {
    role: 'table',
    'aria-label': 'Data table',
    headers: columns.map(col => ({
      role: 'columnheader',
      scope: 'col',
      children: col.header,
    })),
    rows: data.map((row, idx) => ({
      role: 'row',
      key: idx,
      cells: columns.map(col => ({
        role: 'cell',
        children: col.accessor(row),
      })),
    })),
  };
};

// Form field accessibility
export const createAccessibleFormField = (fieldId, options = {}) => {
  const { label, required = false, description = null, error = null } = options;

  const errorId = error ? `${fieldId}-error` : null;
  const descriptionId = description ? `${fieldId}-description` : null;

  const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ');

  return {
    input: {
      id: fieldId,
      'aria-label': label,
      'aria-required': required,
      'aria-invalid': !!error,
      'aria-describedby': ariaDescribedBy || undefined,
    },
    label: {
      htmlFor: fieldId,
      children: required ? `${label} *` : label,
    },
    description: description ? {
      id: descriptionId,
      children: description,
      style: { fontSize: '0.875rem', color: '#666' },
    } : null,
    error: error ? {
      id: errorId,
      role: 'alert',
      children: error,
      style: { color: '#dc2626', fontSize: '0.875rem' },
    } : null,
  };
};

export default {
  useAccessibleId,
  isAccessible,
  announceToScreenReader,
  createAccessibleModal,
  getContrastRatio,
  meetsContrastAA,
  handleKeyboardNavigation,
  createSkipLink,
  createFocusTrap,
  createAccessibleIconButton,
  createAccessibleTable,
  createAccessibleFormField,
};
