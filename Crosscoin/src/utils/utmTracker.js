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

  // Only store if at least one UTM parameter exists
  const hasUTMParams = Object.entries(utmData)
    .filter(([key]) => key.startsWith('utm_'))
    .some(([, value]) => value !== null);

  if (hasUTMParams) {
    localStorage.setItem('utm_data', JSON.stringify(utmData));
    return utmData;
  }
  
  return null;
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
    const response = await fetch(`${apiUrl}/api/utm/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(utmData),
    });
    
    const result = await response.json();
    console.log('UTM tracking response:', result);
    return result;
  } catch (error) {
    console.error('Error sending UTM data:', error);
    return null;
  }
};
