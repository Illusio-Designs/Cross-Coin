import { useEffect } from 'react';
import { captureUTMParameters, sendUTMToBackend } from '@/utils/utmTracker';

export default function UTMTracker() {
  useEffect(() => {
    // Fire once per browser session — record every visit for the traffic
    // report, not just campaign links. The backend dedupes per session_id too.
    try {
      if (sessionStorage.getItem('visit_tracked')) return;
    } catch { /* sessionStorage unavailable — fall through and still track */ }

    const timer = setTimeout(() => {
      const utmData = captureUTMParameters();
      sendUTMToBackend(utmData).then(() => {
        try { sessionStorage.setItem('visit_tracked', '1'); } catch { /* ignore */ }
      });
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
}

