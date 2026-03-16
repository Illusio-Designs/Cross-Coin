import React from 'react';

const DashboardSkeleton = () => {
  return (
    <div className="dashboard-skeleton">
      {/* Header Skeleton */}
      <div className="skeleton-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-subtitle"></div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="skeleton-stats-grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-card-header"></div>
            <div className="skeleton-card-value"></div>
            <div className="skeleton-card-footer"></div>
          </div>
        ))}
      </div>

      {/* Recent Orders Skeleton */}
      <div className="skeleton-section">
        <div className="skeleton-section-title"></div>
        <div className="skeleton-table">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="skeleton-table-row">
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
              <div className="skeleton-cell"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Badges Section Skeleton */}
      <div className="skeleton-section">
        <div className="skeleton-section-title"></div>
        <div className="skeleton-badges-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton-badge"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
