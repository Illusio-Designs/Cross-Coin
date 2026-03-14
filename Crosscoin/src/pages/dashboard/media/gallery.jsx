import React, { useState, useEffect } from 'react';
import { productService } from '@/services';
import Loader from '@/components/Loader';
import { Pagination } from '@/components/ui';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPerPage] = useState(24); // Show 24 images per page

  useEffect(() => {
    fetchImages();
  }, []); // Only fetch once on mount

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
    
    if (!imagePath || typeof imagePath !== 'string') {
      return null;
    }
    
    if (imagePath.startsWith('http')) {
      return imagePath;
    } else if (imagePath.startsWith('/uploads/')) {
      return `${baseUrl}${imagePath}`;
    } else {
      const cleanPath = imagePath.replace(/^\/+/, '');
      return `${baseUrl}/uploads/products/${cleanPath}`;
    }
  };

  const getImageName = (imagePath) => {
    return imagePath.split('/').pop();
  };

  const isValidImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') return false;
    if (imagePath.length < 5) return false;
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    return imageExtensions.some(ext => imagePath.toLowerCase().includes(ext));
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
    if (selectedImages.length === paginatedImages.length) {
      setSelectedImages([]);
    } else {
      setSelectedImages(paginatedImages.map(img => img));
    }
  };

  const selectAllOnPage = () => {
    const pageImagePaths = paginatedImages.map(img => img);
    const allSelected = pageImagePaths.every(path => selectedImages.includes(path));
    
    if (allSelected) {
      setSelectedImages(prev => prev.filter(path => !pageImagePaths.includes(path)));
    } else {
      setSelectedImages(prev => [...new Set([...prev, ...pageImagePaths])]);
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
        alert('Failed to delete image: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }
  };

  // Filter and sort images
  const filteredImages = images
    .filter(imagePath => {
      if (!isValidImageUrl(imagePath)) return false;
      const imageName = getImageName(imagePath).toLowerCase();
      return imageName.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      const nameA = getImageName(a).toLowerCase();
      const nameB = getImageName(b).toLowerCase();
      return nameA.localeCompare(nameB);
    });

  // Pagination logic
  const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const endIndex = startIndex + imagesPerPage;
  const paginatedImages = filteredImages.slice(startIndex, endIndex);

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortBy]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
              {uploading ? <div className="loading-spinner"></div> : 'Upload Images'}
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
          padding: '15px 20px',
          backgroundColor: 'white',
          borderRadius: '8px',
          marginBottom: '20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <button
                onClick={selectAllOnPage}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #ddd',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                {paginatedImages.every(path => selectedImages.includes(path)) ? 'Deselect Page' : 'Select Page'}
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
            
            <div style={{ color: '#666', fontSize: '14px' }}>
              Showing {startIndex + 1}-{Math.min(endIndex, filteredImages.length)} of {filteredImages.length} images
              {selectedImages.length > 0 && ` • ${selectedImages.length} selected`}
            </div>
          </div>
        </div>
      )}

      {/* Images Display */}
      {filteredImages.length === 0 ? (
        <div className="no-images" style={{
          textAlign: 'center',
          padding: '60px 20px',
          color: '#666',
          backgroundColor: 'white',
          borderRadius: '8px'
        }}>
          <h3>No images found</h3>
          <p>No images found in the uploads/products folder.</p>
        </div>
      ) : (
        <>
          <div className={`media-gallery-content ${viewMode}`}>
            {viewMode === 'grid' ? (
              <div className="media-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '20px'
              }}>
                {paginatedImages.map((imagePath, index) => (
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
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: '#f5f5f5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#999',
                      fontSize: '12px',
                      zIndex: 1
                    }}>
                      <div className="loading-spinner" style={{ width: '20px', height: '20px' }}></div>
                    </div>
                    {(() => {
                      const imageUrl = getImageUrl(imagePath);
                      if (!imageUrl) {
                        return (
                          <div style={{
                            width: '100%',
                            height: '200px',
                            backgroundColor: '#f5f5f5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#999',
                            fontSize: '12px',
                            position: 'relative',
                            zIndex: 2
                          }}>
                            Invalid image path
                          </div>
                        );
                      }
                      
                      return (
                        <img
                          src={imageUrl}
                          alt={getImageName(imagePath)}
                          style={{
                            width: '100%',
                            height: '200px',
                            objectFit: 'cover',
                            backgroundColor: '#f5f5f5',
                            position: 'relative',
                            zIndex: 2
                          }}
                          onError={(e) => {
                            const loadingDiv = e.target.previousElementSibling;
                            if (loadingDiv) loadingDiv.style.display = 'none';
                            
                            e.target.style.display = 'none';
                            const errorDiv = document.createElement('div');
                            errorDiv.style.cssText = `
                              width: 100%;
                              height: 200px;
                              background-color: #f5f5f5;
                              display: flex;
                              align-items: center;
                              justify-content: center;
                              color: #999;
                              font-size: 12px;
                              position: relative;
                              z-index: 2;
                              flex-direction: column;
                              gap: 4px;
                            `;
                            errorDiv.innerHTML = `
                              <div>Image not found</div>
                              <div style="font-size: 10px; opacity: 0.7;">${getImageName(imagePath)}</div>
                            `;
                            e.target.parentNode.appendChild(errorDiv);
                          }}
                          onLoad={(e) => {
                            const loadingDiv = e.target.previousElementSibling;
                            if (loadingDiv) loadingDiv.style.display = 'none';
                          }}
                        />
                      );
                    })()}
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
                  {paginatedImages.map((imagePath, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        <input
                          type="checkbox"
                          checked={selectedImages.includes(imagePath)}
                          onChange={() => toggleImageSelection(imagePath)}
                        />
                      </td>
                      <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                        {(() => {
                          const imageUrl = getImageUrl(imagePath);
                          if (!imageUrl) {
                            return (
                              <div style={{
                                width: '60px',
                                height: '60px',
                                backgroundColor: '#f5f5f5',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#999',
                                fontSize: '10px',
                                borderRadius: '4px'
                              }}>
                                Invalid
                              </div>
                            );
                          }
                          
                          return (
                            <img
                              src={imageUrl}
                              alt={getImageName(imagePath)}
                              style={{
                                width: '60px',
                                height: '60px',
                                objectFit: 'cover',
                                borderRadius: '4px',
                                backgroundColor: '#f5f5f5'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const errorDiv = document.createElement('div');
                                errorDiv.style.cssText = `
                                  width: 60px;
                                  height: 60px;
                                  background-color: #f5f5f5;
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  color: #999;
                                  font-size: 10px;
                                  border-radius: 4px;
                                `;
                                errorDiv.textContent = 'Not found';
                                e.target.parentNode.appendChild(errorDiv);
                              }}
                            />
                          );
                        })()}
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'center' }}>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
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


