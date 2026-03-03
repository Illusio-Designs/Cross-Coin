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

  // Fetch variations when modal opens
  const handleOpenModal = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/ai-images/products/${productId}/variations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setVariations(data.data.variations);
        setShowModal(true);
      } else {
        setError(data.message || 'Failed to load variations');
      }
    } catch (err) {
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
      `⚠️ WARNING: This will:\n\n` +
      `• Delete ${oldImagesCount} existing images\n` +
      `• Generate ${totalImages} new AI images (6 per variation)\n` +
      `• Cost: $${(totalImages * 0.00025).toFixed(4)}\n\n` +
      `This action cannot be undone!\n\n` +
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

      console.log('Generating AI images:', requestData);

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

      const data = await response.json();

      if (data.success) {
        setResult(data.data);
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(data.message || 'Failed to generate images');
      }
    } catch (err) {
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
      <Button
        onClick={handleOpenModal}
        disabled={loading}
        className="ai-generate-btn"
      >
        {loading ? '⏳ Loading...' : '🎨 Generate AI Images'}
      </Button>

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
                    <li>AI will delete all old images and generate 6 new professional images per variation</li>
                  </ol>
                  <p className="warning">
                    ⚠️ <strong>Warning:</strong> All existing images will be permanently deleted!
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
                              <strong>Variation {variation.id}</strong>
                              <span className="attributes">
                                {Object.entries(variation.attributes || {}).map(([key, value]) => (
                                  <span key={key} className="attribute-tag">
                                    {key}: {Array.isArray(value) ? value.join(', ') : value}
                                  </span>
                                ))}
                              </span>
                              <span className="image-count">
                                {variation.images?.length || 0} images
                              </span>
                            </span>
                          </label>
                        </div>

                        {isSelected && variation.images && variation.images.length > 0 && (
                          <div className="base-image-selector">
                            <p className="selector-label">Select base image for AI generation:</p>
                            <div className="images-grid">
                              {variation.images.map((image) => (
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
                                    alt={`Image ${image.id}`}
                                    onError={(e) => {
                                      e.target.src = '/placeholder-image.png';
                                    }}
                                  />
                                  <span className="image-id">ID: {image.id}</span>
                                </label>
                              ))}
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
