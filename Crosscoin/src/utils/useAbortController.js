import { useEffect, useRef } from 'react';

/**
 * Hook to manage AbortController for cancelling async requests on unmount
 * Prevents memory leaks from orphaned requests
 */
export const useAbortController = () => {
  const abortControllerRef = useRef(null);

  useEffect(() => {
    // Create new AbortController on mount
    abortControllerRef.current = new AbortController();

    // Cleanup: abort all ongoing requests on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const getSignal = () => abortControllerRef.current?.signal;

  const abort = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  return { signal: getSignal(), abort };
};

export default useAbortController;
