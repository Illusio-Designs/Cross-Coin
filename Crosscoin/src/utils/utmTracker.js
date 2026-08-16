// Capture UTM parameters from URL
export const captureUTMParameters = () => {
  const urlParams = new URLSearchParams(window.location.search);
  
  const utmData = {
    utm_source: urlParams.get('utm_source'),
    utm_medium: urlParams.get('utm_medium'),
    utm_campaign: urlParams.get('utm_campaign'),
    utm_term: urlParams.get('utm_term'),
    utm_content: urlParams.get('utm_content'),
    landing_page: window.location.href,
    referrer: document.referrer,
    timestamp: new Date().toISOString()
  };

  // Persist campaign params for conversion attribution only when present.
  const hasUTMParams = Object.entries(utmData)
    .filter(([key]) => key.startsWith('utm_'))
    .some(([, value]) => value !== null);
  if (hasUTMParams) {
    localStorage.setItem('utm_data', JSON.stringify(utmData));
  }

  // Always return the visit data (referrer + landing page) so EVERY visit is
  // tracked for the traffic report — not just campaign links. The backend
  // dedupes to one row per session and classifies referrer-only visits.
  return utmData;
};

// Retrieve stored UTM data
export const getStoredUTMData = () => {
  const stored = localStorage.getItem('utm_data');
  return stored ? JSON.parse(stored) : null;
};

// Clear UTM data (after conversion)
export const clearUTMData = () => {
  localStorage.removeItem('utm_data');
};

// Send UTM data to backend
export const sendUTMToBackend = async (utmData) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    const url = `${apiUrl}/api/utm/track`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Brand-Name': process.env.NEXT_PUBLIC_BRAND_NAME || 'crosscoin',
      },
      credentials: 'include',
      body: JSON.stringify(utmData),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Store session_id in localStorage for order tracking
      if (result.data?.session_id) {
        localStorage.setItem('utm_session_id', result.data.session_id);
        }
    } else {
      }
    
    return result;
  } catch (error) {
    return null;
  }
};

// Get session ID for order tracking
export const getUTMSessionId = () => {
  return localStorage.getItem('utm_session_id');
};

