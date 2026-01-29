import React, { useState, useEffect } from 'react';
import { productService } from '@/services';
import Loader from '@/components/Loader';
import '../../../styles/dashboard/media.css';

const MediaGallery = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'date', 'size'
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await productService.getExistingImages('products');
      setImages(data.images || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch images');
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imagePath) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    if (imagePath.startsWith('/uploads/')) {
      return `${baseUrl}${imagePath}`;
    }
    return `${baseUrl}/uploads/products/${imagePath}`;
  };

  const getImageName = (imagePath) => {
    return imagePath.split('/').pop();
  };

  const toggleImageSelection = (imagePath) => {
    setSelectedImages(prev => {
      if (prev.includes(imagePath)) {
        return prev.filter(path => path !== imagePath);
      } else {
        return [...prev, imagePath];
      }
    });
  };

  const selectAllImages = () => {
    if (selectedImages.length === filteredImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(filteredImages.map(img => img));
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const result = await productService.uploadImages(files);
      
      if (result.success) {
        alert(`Successfully uploaded ${result.totalUploaded} image(s)${result.totalFailed > 0 ? `. Failed to upload ${result.totalFailed} image(s).` : '.'}`);
        await fetchImages(); // Refresh the images list
      } else {
        alert('Failed to upload images: ' + result.message);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload images: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const deleteSelectedImages = async () => {
    if (selectedImages.length === 0) return;
    
    if (window.confirm(`Are you sure you want to delete ${selectedImages.length} selected image(s)? This action cannot be undone.`)) {
      try {
        setLoading(true);
        const result = await productService.deleteImages(selectedImages);
        
        if (result.success) {
          let message = `Successfully deleted ${result.totalDeleted} image(s)`;
          if (result.totalFailed > 0) {
            message += `. Failed to delete ${result.totalFailed} image(s)`;
          }
          if (result.totalProtected > 0) {
            message += `. ${result.totalProtected} image(s) were protected because they are being used in products`;
          }
          alert(message);
          
          // Show details about protected images
          if (result.protectedImages && result.protectedImages.length > 0) {
            const protectedDetails = result.protectedImages.map(img => 
              `• ${img.path.split('/').pop()}: ${img.reason}`
            ).join('\n');
            alert(`Protected images:\n${protectedDetails}`);
          }
          
          // Refresh the images list
          await fetchImages();
          setSelectedImages([]);
        } else {
          alert('Failed to delete images: ' + result.message);
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete images: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }
  };

  const deleteSingleImage = async (imagePath) => {
    if (window.confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      try {
        setLoading(true);
        const result = await productService.deleteImages([imagePath]);
        
        if (result.success) {
          let message = 'Image deleted successfully';
          if (result.totalProtected > 0) {
            message = 'Image cannot be deleted because it is being used in products';
            if (result.protectedImages && result.protectedImages.length > 0) {
              message += `:\n${result.protectedImages[0].reason}`;
            }
          }
          alert(message);
          
          if (result.totalDeleted > 0) {
            await fetchImages();
            // Remove from selected images if it was selected
            setSelectedImages(prev => prev.filter(path => path !== imagePath));
          }
        } else {
          alert('Failed to delete image: ' + result.message);
        }
      } catch (error) {
        console.error('Delete error:', error);
        alert('Failed to delete image: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter and sort images
  const filteredImages = images
    .filter(imagePath => {
      const imageName = getImageName(imagePath).toLowerCase();
      return imageName.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const nameA = getImageName(a).toLowerCase();
      const nameB = getImageName(b).toLowerCase();
      
      switch (sortBy) {
        case 'name':
          return nameA.localeCompare(nameB);
        case 'date':
          // For now, sort by name as we don't have date info
          return nameA.localeCompare(nameB);
        case 'size':
          // For now, sort by name as we don't have size info
          return nameA.localeCompare(nameB);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="media-gallery">
        <div className="media-gallery-header">
          <h1>Media Gallery</h1>
        </div>
        <Loader />
      </div>
    );
  }

  return (
    <div className="media-gallery">
      <div className="media-gallery-header">
        <h1>Media Gallery</h1>
        <p className="media-gallery-subtitle">
          Manage all your product images from uploads/products folder
        </p>
      </div>

      {error && (
        <div className="error-message" style={{ 
          color: 'red', 
          marginBottom: '20px',
          padding: '10px',
          backgroundColor: '#fee',
          borderRadius: '4px',
          border: '1px solid #fcc'
        }}>
          {error}
        </div>
      )}

      {/* Controls */}
      <div className="media-gallery-controls">
        <div className="media-gallery-controls-left">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search images..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                width: '250px'
              }}
            />
          </div>
          
          <div className="sort-dropdown">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginLeft: '10px'
              }}
            >
              <option value="name">Sort by Name</option>
              <option value="date">Sort by Date</option>
              <option value="size">Sort by Size</option>
            </select>
          </div>
        </div>

        <div className="media-gallery-controls-right">
          <div className="upload-section" style={{ marginRight: '15px' }}>
            <input
              type="file"
              id="image-upload"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
            <label
              htmlFor="image-upload"
              style={{
                padding: '8px 16px',
                backgroundColor: uploading ? '#6c757d' : '#28a745',
                color: 'white',
                borderRadius: '4px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'inline-block',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              {uploading ? 'Uploading...' : 'Upload Images'}
            </label>
          </div>
          
          <div className="view-mode-toggle">
            <button
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'active' : ''}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                backgroundColor: viewMode === 'grid' ? '#007bff' : 'white',
                color: viewMode === 'grid' ? 'white' : 'black',
                borderRadius: '4px 0 0 4px',
                cursor: 'pointer'
              }}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'active' : ''}
              style={{
                padding: '8px 12px',
                border: '1px solid #ddd',
                backgroundColor: viewMode === 'list' ? '#007bff' : 'white',
                color: viewMode === 'list' ? 'white' : 'black',
                borderRadius: '0 4px 4px 0',
                cursor: 'pointer',
                borderLeft: 'none'
              }}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Selection Controls */}
      {filteredImages.length > 0 && (
        <div className="selection-controls" style={{
          padding: '15px 0',
          borderBottom: '1px solid #eee',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <button
                onClick={selectAllImages}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                {selectedImages.length === filteredImages.length ? 'Deselect All' : 'Select All'}
              </button>
              
              {selectedImages.length > 0 && (
                <button
                  onClick={deleteSelectedImages}
                  style={{
                    padding: '6px 12px',
                    border: 'none',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Delete Selected ({selectedImages.length})
                </button>
              )}
            </div>
            
            <div style={{ color: '#666' }}>
              {selectedImages.length} of {filteredImages.length} selected
            </div>
          </div>
        </div>
      )}

      {/* Images Display */}
      {filteredImages.length === 0 ? (
        <div className="no-images" style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#666'
        }}>
          <h3>No images found</h3>
          <p>No images found in the uploads/products folder.</p>
        </div>
      ) : (
        <div className={`media-gallery-content ${viewMode}`}>
          {viewMode === 'grid' ? (
            <div className="media-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '20px'
            }}>
              {filteredImages.map((imagePath, index) => (
                <div
                  key={index}
                  className={`media-item ${selectedImages.includes(imagePath) ? 'selected' : ''}`}
                  style={{
                    position: 'relative',
                    border: selectedImages.includes(imagePath) ? '3px solid #007bff' : '1px solid #ddd',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    backgroundColor: 'white'
                  }}
                  onClick={() => toggleImageSelection(imagePath)}
                >
                  <div className="media-item-image" style={{ position: 'relative' }}>
                    <img
                      src={getImageUrl(imagePath)}
                      alt={getImageName(imagePath)}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    {selectedImages.includes(imagePath) && (
                      <div style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
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
                  </div>
                  <div className="media-item-info" style={{
                    padding: '12px',
                    borderTop: '1px solid #eee'
                  }}>
                    <div className="media-item-name" style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      marginBottom: '4px',
                      wordBreak: 'break-all'
                    }}>
                      {getImageName(imagePath)}
                    </div>
                    <div className="media-item-path" style={{
                      fontSize: '12px',
                      color: '#666',
                      wordBreak: 'break-all'
                    }}>
                      {imagePath}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="media-list">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>
                      <input
                        type="checkbox"
                        checked={selectedImages.length === filteredImages.length}
                        onChange={selectAllImages}
                      />
                    </th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Preview</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Name</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Path</th>
                    <th style={{ padding: '12px', textAlign: 'left', border: '1px solid #ddd' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredImages.map((imagePath, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        <input
                          type="checkbox"
                          checked={selectedImages.includes(imagePath)}
                          onChange={() => toggleImageSelection(imagePath)}
                        />
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        <img
                          src={getImageUrl(imagePath)}
                          alt={getImageName(imagePath)}
                          style={{
                            width: '60px',
                            height: '60px',
                            objectFit: 'cover',
                            borderRadius: '4px'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', fontWeight: '500' }}>
                        {getImageName(imagePath)}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd', color: '#666' }}>
                        {imagePath}
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(getImageUrl(imagePath), '_blank');
                          }}
                          style={{
                            padding: '4px 8px',
                            border: '1px solid #ddd',
                            backgroundColor: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            marginRight: '5px'
                          }}
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSingleImage(imagePath);
                          }}
                          style={{
                            padding: '4px 8px',
                            border: 'none',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="media-gallery-stats" style={{
        marginTop: '30px',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <div>
            <strong>{images.length}</strong>
            <div style={{ color: '#666', fontSize: '14px' }}>Total Images</div>
          </div>
          <div>
            <strong>{filteredImages.length}</strong>
            <div style={{ color: '#666', fontSize: '14px' }}>Filtered Results</div>
          </div>
          <div>
            <strong>{selectedImages.length}</strong>
            <div style={{ color: '#666', fontSize: '14px' }}>Selected</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaGallery;