import React, { useState } from 'react';

const Tooltip = ({ text, children, position = 'top', delay = 300 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) clearTimeout(timeoutId);
    setIsVisible(false);
  };

  const positionStyles = {
    top: {
      bottom: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginBottom: '8px'
    },
    bottom: {
      top: '100%',
      left: '50%',
      transform: 'translateX(-50%)',
      marginTop: '8px'
    },
    left: {
      right: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginRight: '8px'
    },
    right: {
      left: '100%',
      top: '50%',
      transform: 'translateY(-50%)',
      marginLeft: '8px'
    }
  };

  const arrowStyles = {
    top: {
      bottom: '-4px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderTop: '4px solid rgba(0, 0, 0, 0.8)',
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent'
    },
    bottom: {
      top: '-4px',
      left: '50%',
      transform: 'translateX(-50%)',
      borderBottom: '4px solid rgba(0, 0, 0, 0.8)',
      borderLeft: '4px solid transparent',
      borderRight: '4px solid transparent'
    },
    left: {
      right: '-4px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderLeft: '4px solid rgba(0, 0, 0, 0.8)',
      borderTop: '4px solid transparent',
      borderBottom: '4px solid transparent'
    },
    right: {
      left: '-4px',
      top: '50%',
      transform: 'translateY(-50%)',
      borderRight: '4px solid rgba(0, 0, 0, 0.8)',
      borderTop: '4px solid transparent',
      borderBottom: '4px solid transparent'
    }
  };

  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && text && (
        <div
          style={{
            position: 'absolute',
            ...positionStyles[position],
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: '#fff',
            padding: '6px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          {text}
          <div style={{
            position: 'absolute',
            ...arrowStyles[position],
            width: '0',
            height: '0'
          }} />
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: ${position === 'top' ? 'translateX(-50%) translateY(4px)' : position === 'bottom' ? 'translateX(-50%) translateY(-4px)' : position === 'left' ? 'translateY(-50%) translateX(4px)' : 'translateY(-50%) translateX(-4px)'};
          }
          to {
            opacity: 1;
            transform: ${position === 'top' ? 'translateX(-50%) translateY(0)' : position === 'bottom' ? 'translateX(-50%) translateY(0)' : position === 'left' ? 'translateY(-50%) translateX(0)' : 'translateY(-50%) translateX(0)'};
          }
        }
      `}</style>
    </div>
  );
};

export default Tooltip;
