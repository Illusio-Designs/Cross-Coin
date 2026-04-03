import React from 'react';

/**
 * Universal Shimmer Skeleton Loader
 * Can be used for any component that needs a loading state
 * 
 * Usage:
 * <Shimmer width="100%" height="300px" borderRadius="8px" />
 * <Shimmer width="80%" height="20px" borderRadius="4px" style={{ marginBottom: '8px' }} />
 */
const Shimmer = ({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '4px',
  style = {},
  className = ''
}) => {
  return (
    <>
      <div
        className={`shimmer-skeleton ${className}`}
        style={{
          width,
          height,
          borderRadius,
          backgroundColor: '#e5e7eb',
          overflow: 'hidden',
          position: 'relative',
          ...style
        }}
      >
        <div style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.5) 50%, transparent 100%)',
          animation: 'shimmer-skeleton 1.5s infinite linear',
          transform: 'translateX(-100%)',
        }} />
      </div>
      <style jsx>{`
        @keyframes shimmer-skeleton {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </>
  );
};

export default Shimmer;
