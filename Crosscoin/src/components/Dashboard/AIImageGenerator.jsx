import { useState } from 'react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import '../../styles/dashboard/ai-image-generator.css';

const AIImageGenerator = ({ productId, productName, onSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [variations, setVariations] = useState([]);
  const [selectedVariations, setSelectedVariations] = useState({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  console.log('🎨 AIImageGenerator rendered for product:', productId, productName);

  // Fetch variations when modal opens
  const handleOpenModal = async () => {
    console.log('🎨 === BUTTON CLICKED ===');
    console.log('Product ID:', productId);
    console.log('Product Name:', productName);
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
      
      console.log('🔍 Fetching variations for product:', productId);
      console.log('API URL:', apiUrl);
      
      const response = await fetch(
        `${apiUrl}/api/ai-images/products/${productId}/variations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      console.log('📥 Variations Response:', data);
      
      if (data.success) {
        // Process variations to ensure proper image URLs (same as products page)
        const processedVariations = data.data.variations.map(variation => {
          console.log('Processing variation:', variation.id, 'Images:', variation.images);
          
          return {
            ...variation,
            images: variation.images?.map(img => {
              console.log('Raw image from backend:', img);
              
              // Get the base URL
              const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
              
              // Construct the proper image URL (same logic as products page)
              let imageUrl = img.image_url || img.url;
              if (!imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('/uploads/')) {
                  imageUrl = `${baseUrl}${imageUrl}`;
                } else {
                  imageUrl = `${baseUrl}/uploads/products/${imageUrl}`;
                }
              }
              
              const processedImage = {
                id: img.id,
                url: imageUrl,
                image_url: imageUrl,
                altText: img.alt_text || img.altText,
                isPrimary: img.is_primary || img.isPrimary,
                displayOrder: img.display_order || img.displayOrder
              };
              
              console.log('Processed image:', processedImage);
              return processedImage;
            }) || []
          };
        });
        
        console.log('✅ Processed variations:', processedVariations);
        setVariations(processedVariations);
        setShowModal(true);
      } else {
        setError(data.message || 'Failed to load variations');
      }
    } catch (err) {
      console.error('❌ Error loading variations:', err);
      setError(err.message || 'Failed to load variations');
    } finally {
      setLoading(false);
    }
  };

  // Handle variation selection
  const handleVariationToggle = (variationId) => {
    setSelectedVariations(prev => {
      const newSelected = { ...prev };
      if (newSelected[variationId]) {
        delete newSelected[variationId];
      } else {
        // Initialize with first image if available
        const variation = variations.find(v => v.id === variationId);
        if (variation && variation.images && variation.images.length > 0) {
          newSelected[variationId] = variation.images[0].id;
        }
      }
      return newSelected;
    });
  };

  // Handle base image selection
  const handleBaseImageSelect = (variationId, imageId) => {
    setSelectedVariations(prev => ({
      ...prev,
      [variationId]: imageId
    }));
  };

  // Generate AI images
  const handleGenerate = async () => {
    // Validate selection
    const selectedCount = Object.keys(selectedVariations).length;
    if (selectedCount === 0) {
      setError('Please select at least one variation');
      return;
    }

    // Check if all selected variations have base images
    const missingBaseImage = Object.entries(selectedVariations).some(
      ([varId, imgId]) => !imgId
    );
    if (missingBaseImage) {
      setError('Please select a base image for each selected variation');
      return;
    }

    // Confirm action
    const totalImages = selectedCount * 6;
    const oldImagesCount = Object.keys(selectedVariations).reduce((sum, varId) => {
      const variation = variations.find(v => v.id === parseInt(varId));
      return sum + (variation?.images?.length || 0);
    }, 0);

    const confirmed = window.confirm(
      `✅ This will:\n\n` +
      `• Keep all ${oldImagesCount} existing images\n` +
      `• Generate ${totalImages} NEW AI images (6 per variation)\n` +
      `• Total images after: ${oldImagesCount + totalImages}\n` +
      `• Cost: $${(totalImages * 0.00025).toFixed(4)}\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      
      // Prepare request data
      const requestData = {
        productId: parseInt(productId),
        variations: Object.entries(selectedVariations).map(([varId, imgId]) => ({
          variationId: parseInt(varId),
          baseImageId: parseInt(imgId)
        }))
      };

      console.log('🎨 === AI IMAGE GENERATION REQUEST ===');
      console.log('Request Data:', requestData);
      console.log('API URL:', `${process.env.NEXT_PUBLIC_API_URL}/api/ai-images/generate`);
      console.log('Token:', token ? 'Present' : 'Missing');

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai-images/generate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        }
      );

      console.log('📥 Response Status:', response.status);
      console.log('📥 Response OK:', response.ok);

      const data = await response.json();

      console.log('📥 === AI IMAGE GENERATION RESPONSE ===');
      console.log('Full Response:', data);
      console.log('Success:', data.success);
      console.log('Message:', data.message);
      console.log('Data:', data.data);
      console.log('Error:', data.error);
      console.log('=== END RESPONSE ===');

      if (data.success) {
        console.log('✅ Generation successful!');
        setResult(data.data);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        console.error('❌ Generation failed:', data.message);
        setError(data.message || 'Failed to generate images');
      }
    } catch (err) {
      console.error('❌ === AI IMAGE GENERATION ERROR ===');
      console.error('Error:', err);
      console.error('Error Message:', err.message);
      console.error('Error Stack:', err.stack);
      console.error('=== END ERROR ===');
      setError(err.message || 'Failed to generate images');
    } finally {
      setGenerating(false);
    }
  };

  // Close modal
  const handleClose = () => {
    setShowModal(false);
    setSelectedVariations({});
    setResult(null);
    setError(null);
  };

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={loading}
        className="action-btn ai-generate"
        data-tooltip="Generate AI Images"
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          padding: '8px',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: loading ? 0.6 : 1,
          width: '32px',
          height: '32px'
        }}
      >
        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleClose}
          title={`Generate AI Images - ${productName}`}
          size="large"
        >
          <div className="ai-image-generator">
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            {!result && !generating && (
              <>
                <div className="instructions">
                  <h4>📋 Instructions:</h4>
                  <ol>
                    <li>Select which variations to process (checkbox)</li>
                    <li>Choose a base image for each selected variation (radio button)</li>
                    <li>Click "Generate AI Images"</li>
                    <li>AI will generate 6 new professional images per variation (existing images will be kept)</li>
                  </ol>
                  <p className="info-note">
                    ℹ️ <strong>Note:</strong> Your existing images will be kept. New AI images will be added.
                  </p>
                </div>

                <div className="variations-list">
                  {variations.map((variation) => {
                    const isSelected = selectedVariations.hasOwnProperty(variation.id);
                    const selectedImageId = selectedVariations[variation.id];

                    return (
                      <div
                        key={variation.id}
                        className={`variation-item ${isSelected ? 'selected' : ''}`}
                      >
                        <div className="variation-header">
                          <label className="variation-checkbox">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleVariationToggle(variation.id)}
                            />
                            <span className="variation-info">
                              <strong>{productName}</strong>
                              <span className="attributes">
                                {Object.entries(variation.attributes || {}).map(([key, value]) => (
                                  <span key={key} className="attribute-tag">
                                    {key}: {Array.isArray(value) ? value.join(', ') : value}
                                  </span>
                                ))}
                              </span>
                              <span className="image-count">
                                ({variation.images?.length || 0} existing images)
                              </span>
                            </span>
                          </label>
                        </div>

                        {isSelected && variation.images && variation.images.length > 0 && (
                          <div className="base-image-selector">
                            <p className="selector-label">📸 Select ONE base image for AI to use as reference:</p>
                            <div className="images-grid">
                              {variation.images.map((image, index) => {
                                console.log('Rendering image:', image.id, 'URL:', image.url);
                                return (
                                  <label
                                    key={image.id}
                                    className={`image-option ${selectedImageId === image.id ? 'selected' : ''}`}
                                  >
                                    <input
                                      type="radio"
                                      name={`base-image-${variation.id}`}
                                      value={image.id}
                                      checked={selectedImageId === image.id}
                                      onChange={() => handleBaseImageSelect(variation.id, image.id)}
                                    />
                                    <img
                                      src={image.url}
                                      alt={`Image ${index + 1}`}
                                      onError={(e) => {
                                        console.error('Failed to load image:', image.url);
                                        e.target.style.backgroundColor = '#f0f0f0';
                                        e.target.style.display = 'flex';
                                        e.target.style.alignItems = 'center';
                                        e.target.style.justifyContent = 'center';
                                        e.target.alt = '❌ Failed';
                                      }}
                                      onLoad={() => {
                                        console.log('✅ Image loaded successfully:', image.url);
                                      }}
                                    />
                                    <span className="image-id">#{index + 1}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {isSelected && (!variation.images || variation.images.length === 0) && (
                          <div className="no-images-warning">
                            ⚠️ This variation has no images. Cannot generate AI images.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="modal-actions">
                  <Button onClick={handleClose} variant="secondary">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={Object.keys(selectedVariations).length === 0}
                    variant="primary"
                  >
                    Generate AI Images ({Object.keys(selectedVariations).length} variations)
                  </Button>
                </div>
              </>
            )}

            {generating && (
              <div className="generating-status">
                <div className="spinner"></div>
                <h3>🎨 Generating AI Images...</h3>
                <p>This may take 1-2 minutes per variation.</p>
                <p>Please don't close this window.</p>
              </div>
            )}

            {result && !generating && (
              <div className="generation-result">
                <h3>✅ AI Images Generated Successfully!</h3>
                
                <div className="result-stats">
                  <div className="stat-card">
                    <span className="stat-value">{result.totalVariationsProcessed}</span>
                    <span className="stat-label">Variations Processed</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{result.totalImagesDeleted}</span>
                    <span className="stat-label">Old Images Deleted</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{result.totalImagesGenerated}</span>
                    <span className="stat-label">New Images Generated</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">${(result.totalImagesGenerated * 0.00025).toFixed(4)}</span>
                    <span className="stat-label">Cost</span>
                  </div>
                </div>

                <div className="result-details">
                  {result.results.map((varResult) => {
                    const variation = variations.find(v => v.id === varResult.variationId);
                    return (
                      <div key={varResult.variationId} className="variation-result">
                        <h4>
                          Variation {varResult.variationId}
                          {variation && (
                            <span className="attributes-inline">
                              ({Object.entries(variation.attributes || {}).map(([k, v]) => 
                                `${k}: ${Array.isArray(v) ? v.join(', ') : v}`
                              ).join(', ')})
                            </span>
                          )}
                        </h4>
                        {varResult.success ? (
                          <div className="success-info">
                            <p>✅ Deleted: {varResult.imagesDeleted} images</p>
                            <p>✅ Generated: {varResult.imagesGenerated} new images</p>
                            <div className="new-images-preview">
                              {varResult.newImages.map((img) => (
                                <div key={img.id} className="preview-image">
                                  <img src={img.url} alt={img.type} />
                                  <span className="image-type">{img.type}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="error-info">
                            ❌ Error: {varResult.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="modal-actions">
                  <Button onClick={handleClose} variant="primary">
                    Done
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default AIImageGenerator;
