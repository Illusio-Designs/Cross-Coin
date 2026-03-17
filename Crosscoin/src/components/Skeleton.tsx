import React from 'react';

interface SkeletonProps {
  type?: 'product' | 'featured' | 'hero' | 'dashboard' | 'generic' | 'text' | 'circle' | 'rectangle';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  aspectRatio?: string;
  count?: number; // For rendering multiple skeletons
  variant?: 'shimmer' | 'pulse'; // Animation type
}

/**
 * Generic Skeleton Loader Component
 * Replaces all specific skeleton components (ProductSkeleton, FeaturedProductSkeleton, etc.)
 * 
 * Usage:
 * <Skeleton type="product" />
 * <Skeleton type="featured" />
 * <Skeleton type="hero" />
 * <Skeleton type="dashboard" />
 * <Skeleton type="text" width="80%" height="20px" />
 * <Skeleton type="circle" width="40px" height="40px" />
 */
const Skeleton: React.FC<SkeletonProps> = ({
  type = 'generic',
  width = '100%',
  height = '100%',
  className = '',
  style = {},
  aspectRatio,
  count = 1,
  variant = 'shimmer'
}) => {
  const normalizedWidth = typeof width === 'number' ? `${width}px` : width;
  const normalizedHeight = typeof height === 'number' ? `${height}px` : height;

  // Skeleton configurations for different types
  const skeletonConfigs = {
    product: {
      render: () => (
        <div className="skeleton-product" style={{ pointerEvents: 'none' }}>
          <div className="skeleton-product-image">
            <SkeletonBase width="100%" height="400px" variant={variant} />
          </div>
          <div className="skeleton-product-info">
            <SkeletonBase width="80%" height="20px" style={{ marginBottom: '8px' }} variant={variant} />
            <SkeletonBase width="60%" height="16px" style={{ marginBottom: '12px' }} variant={variant} />
            <SkeletonBase width="40%" height="24px" variant={variant} />
          </div>
        </div>
      )
    },
    featured: {
      render: () => (
        <div className="skeleton-featured">
          <div className="skeleton-featured-images">
            <SkeletonBase width="100%" height="500px" style={{ marginBottom: '16px', borderRadius: '8px' }} variant={variant} />
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
              {[1, 2, 3, 4].map((i) => (
                <SkeletonBase key={i} width="80px" height="80px" style={{ borderRadius: '4px' }} variant={variant} />
              ))}
            </div>
          </div>
          <div className="skeleton-featured-info">
            <SkeletonBase width="80%" height="32px" style={{ marginBottom: '16px' }} variant={variant} />
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <SkeletonBase width="100px" height="28px" variant={variant} />
              <SkeletonBase width="80px" height="28px" variant={variant} />
              <SkeletonBase width="150px" height="28px" variant={variant} />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <SkeletonBase width="100px" height="24px" style={{ marginBottom: '12px' }} variant={variant} />
              {[1, 2, 3].map((i) => (
                <SkeletonBase key={i} width="100%" height="20px" style={{ marginBottom: '8px' }} variant={variant} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <SkeletonBase width="100%" height="48px" style={{ flex: 1 }} variant={variant} />
              <SkeletonBase width="100%" height="48px" style={{ flex: 1 }} variant={variant} />
            </div>
          </div>
        </div>
      )
    },
    hero: {
      render: () => (
        <div className="skeleton-hero">
          <SkeletonBase width="100%" height="600px" style={{ borderRadius: '8px' }} variant={variant} />
        </div>
      )
    },
    dashboard: {
      render: () => (
        <div className="skeleton-dashboard">
          <div style={{ marginBottom: '24px' }}>
            <SkeletonBase width="200px" height="32px" style={{ marginBottom: '8px' }} variant={variant} />
            <SkeletonBase width="300px" height="16px" variant={variant} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[1, 2, 3, 4].map((i) => (
              <div key={i} style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
                <SkeletonBase width="100%" height="20px" style={{ marginBottom: '8px' }} variant={variant} />
                <SkeletonBase width="60%" height="28px" style={{ marginBottom: '8px' }} variant={variant} />
                <SkeletonBase width="80%" height="16px" variant={variant} />
              </div>
            ))}
          </div>
          <div>
            <SkeletonBase width="150px" height="24px" style={{ marginBottom: '12px' }} variant={variant} />
            {[1, 2, 3, 4, 5].map((i) => (
              <SkeletonBase key={i} width="100%" height="40px" style={{ marginBottom: '8px' }} variant={variant} />
            ))}
          </div>
        </div>
      )
    },
    text: {
      render: () => <SkeletonBase width={normalizedWidth} height={normalizedHeight} variant={variant} />
    },
    circle: {
      render: () => (
        <SkeletonBase 
          width={normalizedWidth} 
          height={normalizedHeight} 
          style={{ borderRadius: '50%' }} 
          variant={variant}
        />
      )
    },
    rectangle: {
      render: () => <SkeletonBase width={normalizedWidth} height={normalizedHeight} variant={variant} />
    },
    generic: {
      render: () => (
        <SkeletonBase 
          width={normalizedWidth} 
          height={normalizedHeight} 
          style={{ aspectRatio }} 
          variant={variant}
        />
      )
    }
  };

  const config = skeletonConfigs[type] || skeletonConfigs.generic;

  // Render multiple skeletons if count > 1
  if (count > 1 && type !== 'generic') {
    return (
      <div className={`skeleton-container ${className}`} style={style}>
        {Array.from({ length: count }).map((_, idx) => (
          <div key={idx} className="skeleton-item">
            {config.render()}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`skeleton-wrapper ${className}`} style={style}>
      {config.render()}
    </div>
  );
};

/**
 * Base skeleton element with animation
 */
interface SkeletonBaseProps {
  width?: string | number;
  height?: string | number;
  style?: React.CSSProperties;
  variant?: 'shimmer' | 'pulse';
}

const SkeletonBase: React.FC<SkeletonBaseProps> = ({
  width = '100%',
  height = '100%',
  style = {},
  variant = 'shimmer'
}) => {
  const normalizedWidth = typeof width === 'number' ? `${width}px` : width;
  const normalizedHeight = typeof height === 'number' ? `${height}px` : height;

  const animationStyle = variant === 'shimmer' 
    ? {
        background: 'linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.5s infinite linear'
      }
    : {
        backgroundColor: '#e0e0e0',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite'
      };

  return (
    <div
      className="skeleton-base"
      style={{
        width: normalizedWidth,
        height: normalizedHeight,
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
        ...animationStyle,
        ...style
      }}
    >
      <style jsx>{`
        @keyframes skeleton-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Skeleton;
