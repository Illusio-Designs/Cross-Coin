'use client';

import { useEffect } from 'react';
import { captureUTMParameters, sendUTMToBackend } from '@/utils/utmTracker';

export default function UTMTracker() {
  useEffect(() => {
    console.log('🔍 UTM Tracker initialized');
    console.log('📍 Current URL:', window.location.href);
    
    // Capture UTM parameters on component mount
    const utmData = captureUTMParameters();
    
    if (utmData) {
      console.log('✅ UTM parameters captured, sending to backend...');
      // Send to backend immediately
      sendUTMToBackend(utmData).then(response => {
        if (response?.success) {
          console.log('✅ UTM tracking complete!');
        } else {
          console.error('❌ UTM tracking failed');
        }
      });
    } else {
      console.log('ℹ️ No UTM parameters to track');
    }
  }, []);

  return null; // This component doesn't render anything
}
