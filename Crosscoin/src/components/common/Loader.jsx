import React from "react";

/**
 * Lightweight loader (no remote assets).
 * This avoids long FCP/LCP on slow mobile connections where the previous
 * remote Lottie animation could delay the first contentful paint.
 */
const Loader = ({ className = "" }) => {
  return (
    <div
      className={className}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "50px 20px",
        minHeight: "200px",
      }}
    >
      <div
        aria-label="Loading"
        role="status"
        style={{
          width: 42,
          height: 42,
          borderRadius: "50%",
          border: "3px solid rgba(24, 13, 62, 0.12)",
          borderTopColor: "#180D3E",
          animation: "cc-spin 0.9s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes cc-spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
};

export default Loader;