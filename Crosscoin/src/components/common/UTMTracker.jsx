'use client';

import { useEffect } from 'react';
import { captureUTMParameters, sendUTMToBackend } from '@/utils/utmTracker';

export default function UTMTracker() {
  useEffect(() => {
    // Capture UTM parameters on component mount
    const utmData = captureUTMParameters();
    
    if (utmData) {
      console.log('UTM parameters captured:', utmData);
      // Send to backend immediately
      sendUTMToBackend(utmData).then(response => {
        if (response?.success) {
          console.log('UTM data sent to backend successfully');
        }
      });
    }
  }, []);

  return null; // This component doesn't render anything
}
