import React from "react";

// Simple SVG Spinner
function LoadingSpinner({ size = "md", color = "text-blue-500" }) {
  // default size medium
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${color}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status" // Accessibility: indicate loading status
      aria-live="polite"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
      <span className="sr-only">Loading...</span>{" "}
      {/* Accessibility: screen reader text */}
    </svg>
  );
}

export default LoadingSpinner;
