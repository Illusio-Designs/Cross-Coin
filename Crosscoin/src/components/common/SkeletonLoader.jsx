import React from 'react';

/**
 * Skeleton loader for list/table items
 * Shows a placeholder while data is loading
 */
export const TableSkeleton = ({ rows = 5, columns = 5 }) => {
  return (
    <div style={{ width: '100%', borderCollapse: 'collapse' }}>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '12px 0' }}>
          {Array.from({ length: columns }).map((_, colIdx) => (
            <div
              key={colIdx}
              style={{
                flex: 1,
                height: '16px',
                background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 2s infinite',
                borderRadius: '4px',
                marginRight: '16px',
              }}
            />
          ))}
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

/**
 * Skeleton loader for a single item
 */
export const ItemSkeleton = () => {
  return (
    <div style={{ padding: '16px' }}>
      {Array.from({ length: 4 }).map((_, idx) => (
        <div
          key={idx}
          style={{
            height: '20px',
            background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

/**
 * Skeleton loader for card
 */
export const CardSkeleton = () => {
  return (
    <div style={{ padding: '16px', border: '1px solid #e5e7eb', borderRadius: '8px' }}>
      <div
        style={{
          height: '24px',
          background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 2s infinite',
          borderRadius: '4px',
          marginBottom: '16px',
          width: '60%',
        }}
      />
      {Array.from({ length: 3 }).map((_, idx) => (
        <div
          key={idx}
          style={{
            height: '16px',
            background: 'linear-gradient(90deg, #f3f4f6 25%, #e5e7eb 50%, #f3f4f6 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s infinite',
            borderRadius: '4px',
            marginBottom: '12px',
          }}
        />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default TableSkeleton;
