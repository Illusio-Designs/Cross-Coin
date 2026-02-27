import React from 'react';

/**
 * Product Card Skeleton Loader
 * Shows while products are loading
 */
const ProductSkeleton = () => {
  return (
    <div className="product-card" style={{ pointerEvents: 'none' }}>
      <div className="product-image" style={{ position: 'relative' }}>
        <div
          style={{
            width: '100%',
            height: '400px',
            background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer-skeleton 1.5s infinite linear'
          }}
        />
      </div>
      <div className="product-info">
        <div className="product-main-info">
          <div
            style={{
              width: '80%',
              height: '20px',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-skeleton 1.5s infinite linear',
              borderRadius: '4px',
              marginBottom: '8px'
            }}
          />
          <div
            style={{
              width: '60%',
              height: '16px',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-skeleton 1.5s infinite linear',
              borderRadius: '4px'
            }}
          />
        </div>
        <div className="product-meta" style={{ marginTop: '12px' }}>
          <div
            style={{
              width: '40%',
              height: '24px',
              background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer-skeleton 1.5s infinite linear',
              borderRadius: '4px'
            }}
          />
        </div>
      </div>
      <style jsx>{`
        @keyframes shimmer-skeleton {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default ProductSkeleton;
