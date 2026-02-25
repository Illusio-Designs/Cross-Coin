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
    console.log('✅ UTM Parameters Captured:', utmData);
    localStorage.setItem('utm_data', JSON.stringify(utmData));
    return utmData;
  } else {
    console.log('ℹ️ No UTM parameters found in URL');
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
    console.log('📤 Sending UTM data to backend...', utmData);
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    const url = `${apiUrl}/api/utm/track`;
    
    console.log('🔗 API URL:', url);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(utmData),
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      console.log('✅ UTM data successfully sent to backend:', result);
      console.log('📊 Stored with ID:', result.data?.id);
    } else {
      console.error('❌ Failed to send UTM data:', result);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending UTM data to backend:', error);
    return null;
  }
};
