import React, { useState, useEffect } from 'react';

const ImageDebugger = ({ testUrl = "https://api.crosscoin.in/uploads/products/variation_0_image-1752745582906-960261465.png" }) => {
  const [imageStatus, setImageStatus] = useState('testing');
  const [imageInfo, setImageInfo] = useState({});

  useEffect(() => {
    const testImage = () => {
      console.log('Testing image URL:', testUrl);
      
      const img = new Image();
      
      img.onload = () => {
        console.log('✅ Image loaded successfully');
        setImageStatus('success');
        setImageInfo({
          width: img.naturalWidth,
          height: img.naturalHeight,
          src: img.src
        });
      };
      
      img.onerror = (error) => {
        console.error('❌ Image failed to load:', error);
        setImageStatus('error');
        setImageInfo({ error: 'Failed to load image' });
      };
      
      img.src = testUrl;
    };

    testImage();
  }, [testUrl]);

  const testFetch = async () => {
    try {
      console.log('Testing fetch for:', testUrl);
      const response = await fetch(testUrl, { method: 'HEAD' });
      console.log('Fetch response:', response.status, response.statusText);
      console.log('Response headers:', [...response.headers.entries()]);
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #ccc', 
      margin: '20px',
      backgroundColor: '#f9f9f9'
    }}>
      <h3>Image Debug Test</h3>
      <p><strong>URL:</strong> {testUrl}</p>
      <p><strong>Status:</strong> {imageStatus}</p>
      
      {imageStatus === 'success' && (
        <div>
          <p><strong>Dimensions:</strong> {imageInfo.width} x {imageInfo.height}</p>
          <img 
            src={testUrl} 
            alt="Test" 
            style={{ maxWidth: '200px', maxHeight: '200px', objectFit: 'contain' }}
          />
        </div>
      )}
      
      {imageStatus === 'error' && (
        <div style={{ color: 'red' }}>
          <p>❌ Image failed to load</p>
          <p>{imageInfo.error}</p>
        </div>
      )}
      
      <button onClick={testFetch} style={{ marginTop: '10px', padding: '5px 10px' }}>
        Test Fetch
      </button>
      
      <div style={{ marginTop: '10px' }}>
        <p><strong>Environment:</strong></p>
        <p>NEXT_PUBLIC_API_URL: {process.env.NEXT_PUBLIC_API_URL || 'Not set'}</p>
      </div>
    </div>
  );
};

export default ImageDebugger;