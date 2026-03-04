import { useState } from 'react';
import Modal from '@/components/common/Modal';
import '../../styles/dashboard/ai-image-generator.css';

const DeleteOldImages = ({ productId, productName, onSuccess }) => {
  const [showModal, setShowModal] = useState(false);
  const [variations, setVariations] = useState([]);
  const [selectedVariations, setSelectedVariations] = useState({});
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  console.log('🗑️  DeleteOldImages rendered for product:', productId, productName);

  // Fetch variations when modal opens
  const handleOpenModal = async () => {
    console.log('🗑️  === DELETE BUTTON CLICKED ===');
    console.log('Product ID:', productId);
    
    setLoading(true);
    setError(null);
    
    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
      
      const response = await fetch(
        `${apiUrl}/api/ai-images/products/${productId}/variations`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        // Process variations to ensure proper image URLs
        const processedVariations = data.data.variations.map(variation => {
          return {
            ...variation,
            images: variation.images?.map(img => {
              const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
              let imageUrl = img.image_url || img.url;
              
              if (!imageUrl.startsWith('http')) {
                if (imageUrl.startsWith('/uploads/')) {
                  imageUrl = `${baseUrl}${imageUrl}`;
                } else {
                  imageUrl = `${baseUrl}/uploads/products/${imageUrl}`;
                }
              }
              
              return {
                ...img,
                url: imageUrl,
                image_url: imageUrl
              };
            }) || []
          };
        });
        
        // Initialize selection - keep AI-generated images by default
        const initialSelection = {};
        processedVariations.forEach(variation => {
          const aiImages = variation.images.filter(img => 
            img.url.includes('ai-') || img.image_url.includes('ai-')
          );
          initialSelection[variation.id] = aiImages.map(img => img.id);
        });
        
        setVariations(processedVariations);
        setSelectedVariations(initialSelection);
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

  // Toggle image selection
  const handleImageToggle = (variationId, imageId) => {
    setSelectedVariations(prev => {
      const current = prev[variationId] || [];
      const newSelection = current.includes(imageId)
        ? current.filter(id => id !== imageId)
        : [...current, imageId];
      
      return {
        ...prev,
        [variationId]: newSelection
      };
    });
  };

  // Delete old images
  const handleDelete = async () => {
    // Count images to delete
    let totalToDelete = 0;
    variations.forEach(variation => {
      const keepIds = selectedVariations[variation.id] || [];
      const deleteCount = variation.images.length - keepIds.length;
      totalToDelete += deleteCount;
    });

    if (totalToDelete === 0) {
      setError('No images selected for deletion');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ WARNING: This will permanently delete ${totalToDelete} images!\n\n` +
      `This action cannot be undone!\n\n` +
      `Continue?`
    );

    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    setResult(null);

    try {
      const token = localStorage.getItem('token');
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
      
      const requestData = {
        productId: parseInt(productId),
        variations: Object.entries(selectedVariations).map(([varId, keepIds]) => ({
          variationId: parseInt(varId),
          keepImageIds: keepIds
        }))
      };

      console.log('🗑️  Deleting old images:', requestData);

      const response = await fetch(
        `${apiUrl}/api/ai-images/delete-old-images`,
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
        setError(data.message || 'Failed to delete images');
      }
    } catch (err) {
      console.error('❌ Error deleting images:', err);
      setError(err.message || 'Failed to delete images');
    } finally {
      setDeleting(false);
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
        className="action-btn delete-images"
        data-tooltip="Delete Old Images"
        style={{
          background: '#ef4444',
          color: 'white',
          border: 'none',
          padding: '8px 12px',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '12px',
          fontWeight: '600',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? '⏳' : '🗑️'}
      </button>

      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleClose}
          title={`Delete Old Images - ${productName}`}
          size="large"
        >
          <div className="ai-image-generator">
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}

            {!result && !deleting && (
              <>
                <div className="instructions">
                  <h4>🗑️ Delete Old Images:</h4>
                  <ol>
                    <li>Review all images for each variation</li>
                    <li>Select images to KEEP (AI-generated images are pre-selected)</li>
                    <li>Unselected images will be PERMANENTLY DELETED</li>
                    <li>Click "Delete Old Images" to confirm</li>
                  </ol>
                  <p className="warning">
                    ⚠️ <strong>Warning:</strong> Deleted images cannot be recovered!
                  </p>
                </div>

                <div className="variations-list">
                  {variations.map((variation) => {
                    const keepIds = selectedVariations[variation.id] || [];
                    const deleteCount = variation.images.length - keepIds.length;

                    return (
                      <div key={variation.id} className="variation-item">
                        <div className="variation-header">
                          <div className="variation-info">
                            <strong>Variation {variation.id}</strong>
                            <span className="attributes">
                              {Object.entries(variation.attributes || {}).map(([key, value]) => (
                                <span key={key} className="attribute-tag">
                                  {key}: {Array.isArray(value) ? value.join(', ') : value}
                                </span>
                              ))}
                            </span>
                            <span className="image-count">
                              {variation.images?.length || 0} total images | 
                              <span style={{ color: '#10B981', marginLeft: '4px' }}>
                                {keepIds.length} to keep
                              </span> | 
                              <span style={{ color: '#ef4444', marginLeft: '4px' }}>
                                {deleteCount} to delete
                              </span>
                            </span>
                          </div>
                        </div>

                        {variation.images && variation.images.length > 0 && (
                          <div className="base-image-selector">
                            <p className="selector-label">Select images to KEEP (click to toggle):</p>
                            <div className="images-grid">
                              {variation.images.map((image) => {
                                const isSelected = keepIds.includes(image.id);
                                const isAIGenerated = image.url.includes('ai-') || image.image_url.includes('ai-');
                                
                                return (
                                  <div
                                    key={image.id}
                                    className={`image-option ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleImageToggle(variation.id, image.id)}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <img
                                      src={image.url}
                                      alt={`Image ${image.id}`}
                                      onError={(e) => {
                                        e.target.style.backgroundColor = '#f0f0f0';
                                        e.target.alt = '❌ Failed';
                                      }}
                                    />
                                    <span className="image-id">
                                      ID: {image.id}
                                      {isAIGenerated && <span style={{ color: '#10B981', marginLeft: '4px' }}>🤖 AI</span>}
                                    </span>
                                    <span style={{ 
                                      position: 'absolute', 
                                      top: '4px', 
                                      right: '4px',
                                      background: isSelected ? '#10B981' : '#ef4444',
                                      color: 'white',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '10px',
                                      fontWeight: 'bold'
                                    }}>
                                      {isSelected ? 'KEEP' : 'DELETE'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="modal-actions">
                  <button onClick={handleClose} className="btn-secondary">
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn-danger"
                    style={{
                      background: '#ef4444',
                      color: 'white',
                      padding: '10px 20px',
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      fontWeight: '600'
                    }}
                  >
                    Delete Old Images
                  </button>
                </div>
              </>
            )}

            {deleting && (
              <div className="generating-status">
                <div className="spinner"></div>
                <h3>🗑️ Deleting Old Images...</h3>
                <p>Please wait...</p>
              </div>
            )}

            {result && !deleting && (
              <div className="generation-result">
                <h3>✅ Old Images Deleted Successfully!</h3>
                
                <div className="result-stats">
                  <div className="stat-card">
                    <span className="stat-value">{result.totalVariationsProcessed}</span>
                    <span className="stat-label">Variations Processed</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{result.totalImagesDeleted}</span>
                    <span className="stat-label">Images Deleted</span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button onClick={handleClose} className="btn-primary">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </>
  );
};

export default DeleteOldImages;
