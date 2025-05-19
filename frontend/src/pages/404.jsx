import React from 'react';
import Link from 'next/link';

const NotFound = () => {
  return (
    <div className="error-page">
      <div className="error-content">
        <h1 className="error-code">404</h1>
        <h2 className="error-title">Page Not Found</h2>
        <p className="error-message">
          The page you are looking for might have been removed, had its name changed,
          or is temporarily unavailable.
        </p>
        <Link href="/dashboard" className="error-button">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
};

export default NotFound; 