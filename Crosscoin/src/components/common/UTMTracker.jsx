import { useEffect } from 'react';
import { captureUTMParameters, sendUTMToBackend } from '@/utils/utmTracker';

export default function UTMTracker() {
  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      // Capture UTM parameters on component mount
      const utmData = captureUTMParameters();
      
      if (utmData) {
        // Send to backend immediately
        sendUTMToBackend(utmData).then(response => {
          if (response?.success) {
            } else {
            }
        });
      } else {
        }
      }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
}

