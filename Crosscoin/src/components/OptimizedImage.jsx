import Image from 'next/image';
import { useState } from 'react';

/**
 * Optimized Image Component with lazy loading and blur placeholder
 * Reduces LCP and improves performance
 */
export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  objectFit = 'cover',
  quality = 75,
  sizes,
  ...props
}) {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width, height }}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        quality={quality}
        sizes={sizes || '100vw'}
        className={`
          duration-300 ease-in-out
          ${isLoading ? 'scale-105 blur-sm' : 'scale-100 blur-0'}
        `}
        style={{ objectFit }}
        onLoadingComplete={() => setIsLoading(false)}
        loading={priority ? 'eager' : 'lazy'}
        {...props}
      />
    </div>
  );
}
