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
          background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer-skeleton 1.5s infinite linear',
          ...style
        }}
      />
      <style jsx>{`
        @keyframes shimmer-skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
};

export default Shimmer;
