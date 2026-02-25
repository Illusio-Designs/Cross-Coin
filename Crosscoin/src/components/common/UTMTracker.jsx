import { useEffect } from 'react';
import { captureUTMParameters, sendUTMToBackend } from '@/utils/utmTracker';

export default function UTMTracker() {
  useEffect(() => {
    // Add a small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      console.log('=== UTM TRACKER START ===');
      console.log('🔍 UTM Tracker initialized');
      console.log('📍 Current URL:', window.location.href);
      console.log('🔗 Search params:', window.location.search);
      
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
      console.log('=== UTM TRACKER END ===');
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
}
