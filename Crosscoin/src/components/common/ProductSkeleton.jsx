/**
 * Skeleton loader for product cards
 * Prevents layout shift while content loads
 */
export default function ProductSkeleton({ count = 1 }) {
  return (
    <>
      {[...Array(count)].map((_, index) => (
        <div key={index} className="animate-pulse">
          {/* Image skeleton */}
          <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
          
          {/* Title skeleton */}
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          
          {/* Price skeleton */}
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          
          {/* Button skeleton */}
          <div className="h-10 bg-gray-200 rounded w-full mt-4"></div>
        </div>
      ))}
    </>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image gallery skeleton */}
        <div>
          <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 w-20 h-20 rounded"></div>
            ))}
          </div>
        </div>
        
        {/* Product info skeleton */}
        <div>
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
          <div className="h-12 bg-gray-200 rounded w-full"></div>
        </div>
      </div>
    </div>
  );
}
