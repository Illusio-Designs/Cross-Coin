import React from 'react';

const FeaturedProductSkeleton = () => {
  return (
    <div className="featured-product-card skeleton-card">
      <div className="product-images">
        {/* Main image skeleton */}
        <div className="skeleton-main-image" style={{
          width: '100%',
          height: '500px',
          backgroundColor: '#e0e0e0',
          borderRadius: '8px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        
        {/* Thumbnails skeleton */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 16 }}>
          {[1, 2, 3, 4].map((idx) => (
            <div key={idx} style={{
              width: 80,
              height: 80,
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${idx * 0.1}s`
            }} />
          ))}
        </div>
      </div>
      
      <div className="product-info">
        {/* Title skeleton */}
        <div style={{
          width: '80%',
          height: '32px',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          marginBottom: '16px',
          animation: 'pulse 1.5s ease-in-out infinite'
        }} />
        
        {/* Price row skeleton */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            width: '100px',
            height: '28px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{
            width: '80px',
            height: '28px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.1s'
          }} />
          <div style={{
            width: '150px',
            height: '28px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.2s'
          }} />
        </div>
        
        {/* Details section skeleton */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            width: '100px',
            height: '24px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            marginBottom: '12px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          {[1, 2, 3].map((idx) => (
            <div key={idx} style={{
              width: '100%',
              height: '20px',
              backgroundColor: '#e0e0e0',
              borderRadius: '4px',
              marginBottom: '8px',
              animation: 'pulse 1.5s ease-in-out infinite',
              animationDelay: `${idx * 0.1}s`
            }} />
          ))}
        </div>
        
        {/* Color selection skeleton */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            width: '120px',
            height: '20px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            marginBottom: '12px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{ display: 'flex', gap: '12px' }}>
            {[1, 2, 3].map((idx) => (
              <div key={idx} style={{
                width: '80px',
                height: '60px',
                backgroundColor: '#e0e0e0',
                borderRadius: '8px',
                animation: 'pulse 1.5s ease-in-out infinite',
                animationDelay: `${idx * 0.1}s`
              }} />
            ))}
          </div>
        </div>
        
        {/* Quantity skeleton */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            width: '100px',
            height: '20px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            marginBottom: '12px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{
            width: '120px',
            height: '40px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
        </div>
        
        {/* Action buttons skeleton */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
          <div style={{
            flex: 1,
            height: '48px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite'
          }} />
          <div style={{
            flex: 1,
            height: '48px',
            backgroundColor: '#e0e0e0',
            borderRadius: '4px',
            animation: 'pulse 1.5s ease-in-out infinite',
            animationDelay: '0.1s'
          }} />
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>
    </div>
  );
};

export default FeaturedProductSkeleton;
