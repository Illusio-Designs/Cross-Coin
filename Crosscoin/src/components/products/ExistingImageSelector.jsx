import React, { useState, useEffect, useCallback } from 'react';
import Modal from '@/components/common/Modal';
import { productService } from '@/services';

const ExistingImageSelector = ({ isOpen, onClose, onSelectImages, productId = null }) => {
  const [existingImages, setExistingImages] = useState([]);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [imageSource, setImageSource] = useState('products'); // Always default to 'products' to show all images

  const fetchExistingImages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('=== Fetching Existing Images ===');
      console.log('Image Source:', imageSource);
      console.log('Product ID:', productId);
      console.log('API URL:', process.env.NEXT_PUBLIC_API_URL);
      
      // Check if user is authenticated
      const token = localStorage.getItem('token');
      console.log('Auth Token:', token ? 'Present' : 'Missing');
      
      let data;
      if (imageSource === 'current_product' && productId) {
        // Get images for specific product
        console.log('Fetching images for specific product:', productId);
        data = await productService.getExistingImages('products', productId);
      } else {
        // Get all images from selected source
        console.log('Fetching all images from source:', imageSource);
        data = await productService.getExistingImages(imageSource);
      }
      
      console.log('API Response:', data);
      console.log('Images found:', data.images?.length || 0);
      
      if (data.images && data.images.length > 0) {
        console.log('Sample image paths:', data.images.slice(0, 3));
      }
      
      setExistingImages(data.images || []);
    } catch (err) {
      console.error('Error fetching existing images:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        url: err.config?.url
      });
      
      let errorMessage = 'Failed to fetch existing images';
      
      if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please login again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'Access denied. Admin privileges required.';
      } else if (err.response?.status === 404) {
        errorMessage = 'API endpoint not found.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      } else if (err.code === 'NETWORK_ERROR' || err.message.includes('Network Error')) {
        errorMessage = 'Network error. Check your internet connection.';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [imageSource, productId]);

  useEffect(() => {
    if (isOpen) {
      fetchExistingImages();
    }
  }, [isOpen, fetchExistingImages]);

  const toggleImageSelection = (imagePath) => {
    setSelectedImages(prev => {
      if (prev.includes(imagePath)) {
        return prev.filter(path => path !== imagePath);
      } else {
        return [...prev, imagePath];
      }
    });
  };

  const handleSelectImages = () => {
    const selectedImageObjects = selectedImages.map(imagePath => ({
      name: imagePath.split('/').pop(),
      image_url: imagePath,
      url: imagePath,
      type: 'image/jpeg',
      existing: false, // These are new selections, not existing product images
      fromLibrary: true // Flag to identify library images
    }));
    
    onSelectImages(selectedImageObjects);
    setSelectedImages([]);
    onClose();
  };

  const getImageUrl = (imagePath) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // If it already starts with /uploads/, just prepend the base URL
    if (imagePath.startsWith('/uploads/')) {
      return `${baseUrl}${imagePath}`;
    }
    
    // For relative paths, construct the full URL based on the source
    if (imageSource === 'current_product') {
      // Current product images are already stored with full paths
      return imagePath.startsWith('/') ? `${baseUrl}${imagePath}` : `${baseUrl}/uploads/products/${imagePath}`;
    } else if (imageSource === 'uploads') {
      // For general uploads, the path should already be complete from backend
      return `${baseUrl}${imagePath.startsWith('/') ? imagePath : `/${imagePath}`}`;
    } else {
      // For product images, always use /uploads/products/
      return `${baseUrl}/uploads/products/${imagePath}`;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Existing Images"
      size="large"
    >
      <div className="existing-image-selector">
        {loading && <div className="loading">Loading existing images...</div>}
        
        {error && (
          <div className="error-message" style={{ 
            color: 'red', 
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px'
          }}>
            <strong>Error:</strong> {error}
            <br />
            <div style={{ marginTop: '8px' }}>
              <button
                onClick={fetchExistingImages}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                Retry
              </button>
              <small>Check the browser console for more details.</small>
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Image Source Selector */}
            <div className="source-selector" style={{
              marginBottom: '20px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '600',
                color: '#495057'
              }}>
                Select Image Source:
              </label>
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                {productId && (
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}>
                    <input
                      type="radio"
                      name="imageSource"
                      value="current_product"
                      checked={imageSource === 'current_product'}
                      onChange={(e) => {
                        setImageSource(e.target.value);
                        setSelectedImages([]);
                      }}
                      style={{ marginRight: '8px' }}
                    />
                    Current Product Images
                  </label>
                )}
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  <input
                    type="radio"
                    name="imageSource"
                    value="products"
                    checked={imageSource === 'products'}
                    onChange={(e) => {
                      setImageSource(e.target.value);
                      setSelectedImages([]);
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  All Product Images (uploads/products)
                </label>
                <label style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>
                  <input
                    type="radio"
                    name="imageSource"
                    value="uploads"
                    checked={imageSource === 'uploads'}
                    onChange={(e) => {
                      setImageSource(e.target.value);
                      setSelectedImages([]);
                    }}
                    style={{ marginRight: '8px' }}
                  />
                  All Upload Images (uploads/)
                </label>
              </div>
            </div>

            <div className="image-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
              marginBottom: '20px'
            }}>
              {existingImages.map((imagePath, index) => (
                <div
                  key={index}
                  className={`image-item ${selectedImages.includes(imagePath) ? 'selected' : ''}`}
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    border: selectedImages.includes(imagePath) ? '3px solid #007bff' : '1px solid #ddd',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                  onClick={() => toggleImageSelection(imagePath)}
                >
                  <img
                    src={getImageUrl(imagePath)}
                    alt={`Existing image ${index + 1}`}
                    style={{
                      width: '100%',
                      height: '120px',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  {selectedImages.includes(imagePath) && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      background: '#007bff',
                      color: 'white',
                      borderRadius: '50%',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px'
                    }}>
                      ✓
                    </div>
                  )}
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    background: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '4px',
                    fontSize: '10px',
                    textAlign: 'center'
                  }}>
                    {imagePath.split('/').pop()}
                  </div>
                </div>
              ))}
            </div>

            {existingImages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
                {imageSource === 'current_product' 
                  ? 'No images found for this product.' 
                  : `No existing images found in the ${imageSource === 'products' ? 'uploads/products' : 'uploads'} folder.`
                }
              </div>
            )}

            <div className="modal-actions" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid #eee',
              paddingTop: '16px'
            }}>
              <div style={{ color: '#666' }}>
                {selectedImages.length} image(s) selected
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    background: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSelectImages}
                  disabled={selectedImages.length === 0}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    background: selectedImages.length > 0 ? '#007bff' : '#ccc',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: selectedImages.length > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  Add Selected Images
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default ExistingImageSelector;