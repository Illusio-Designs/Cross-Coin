import React from 'react';
import '../styles/skeleton.css';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  aspectRatio?: string;
}

/**
 * Skeleton component with shimmer animation
 * Displays a placeholder while content is loading
 * Smooth fade-in transition when content loads
 */
const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '100%',
  className = '',
  style = {},
  aspectRatio = '1 / 1'
}) => {
  const normalizedWidth = typeof width === 'number' ? `${width}px` : width;
  const normalizedHeight = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: normalizedWidth,
        height: normalizedHeight,
        aspectRatio,
        backgroundColor: '#f0f0f0',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
        ...style
      }}
    >
      <div className="skeleton-shimmer" />
    </div>
  );
};

export default Skeleton;
