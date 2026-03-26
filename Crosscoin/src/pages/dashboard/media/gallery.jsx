import React, { useState, useEffect } from 'react';
import { productService } from '../../../services';
import Loader from '../../../components/common/Loader';
import { Pagination } from '../../../components/ui';
import AlertModal, { ConfirmModal } from '../../../components/common/AlertModal';

const GridIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
  </svg>
);
const ListIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
    <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
    <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);
const UploadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const TrashIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);
const EyeIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);
const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const ImgIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const MediaGallery = () => {
  const [images, setImages] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [alertMsg, setAlertMsg] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [imagesPerPage] = useState(24);

  useEffect(() => { fetchImages(); }, []);

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
    if (!imagePath || typeof imagePath !== 'string') return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/uploads/')) return `${baseUrl}${imagePath}`;
    return `${baseUrl}/uploads/products/${imagePath.replace(/^\/+/, '')}`;
  };

  const getImageName = (imagePath) => imagePath.split('/').pop();

  const isValidImageUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string' || imagePath.length < 5) return false;
    return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'].some(ext => imagePath.toLowerCase().includes(ext));
  };

  const toggleImageSelection = (imagePath) => {
    setSelectedImages(prev =>
      prev.includes(imagePath) ? prev.filter(p => p !== imagePath) : [...prev, imagePath]
    );
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
        setAlertMsg(`Successfully uploaded ${result.totalUploaded} image(s)${result.totalFailed > 0 ? `. Failed: ${result.totalFailed}.` : '.'}`);
        await fetchImages();
      } else {
        setAlertMsg('Failed to upload images: ' + result.message);
      }
    } catch (error) {
      setAlertMsg('Failed to upload images: ' + (error.message || 'Unknown error'));
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const deleteSelectedImages = () => {
    if (selectedImages.length === 0) return;
    setConfirmState({ message: `Delete ${selectedImages.length} selected image(s)? This cannot be undone.`, onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        const result = await productService.deleteImages(selectedImages);
        if (result.success) {
          let msg = `Deleted ${result.totalDeleted} image(s)`;
          if (result.totalFailed > 0) msg += `. Failed: ${result.totalFailed}`;
          if (result.totalProtected > 0) msg += `. Protected (in use): ${result.totalProtected}`;
          setAlertMsg(msg);
          await fetchImages();
          setSelectedImages([]);
        } else {
          setAlertMsg('Failed to delete: ' + result.message);
        }
      } catch (error) {
        setAlertMsg('Failed to delete: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }});
  };

  const deleteSingleImage = (e, imagePath) => {
    e.stopPropagation();
    setConfirmState({ message: 'Delete this image? This cannot be undone.', onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        const result = await productService.deleteImages([imagePath]);
        if (result.success) {
          if (result.totalProtected > 0) {
            setAlertMsg('Image is in use by products and cannot be deleted.');
          } else {
            await fetchImages();
            setSelectedImages(prev => prev.filter(p => p !== imagePath));
          }
        } else {
          setAlertMsg('Failed to delete: ' + result.message);
        }
      } catch (error) {
        setAlertMsg('Failed to delete: ' + (error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    }});
  };

  const filteredImages = images
    .filter(p => isValidImageUrl(p) && getImageName(p).toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => getImageName(a).toLowerCase().localeCompare(getImageName(b).toLowerCase()));

  const totalPages = Math.ceil(filteredImages.length / imagesPerPage);
  const startIndex = (currentPage - 1) * imagesPerPage;
  const paginatedImages = filteredImages.slice(startIndex, startIndex + imagesPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const allPageSelected = paginatedImages.length > 0 && paginatedImages.every(p => selectedImages.includes(p));

  return (
    <>
    <AlertModal message={alertMsg} onClose={() => setAlertMsg(null)} />
    <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
    <div className="dashboard-page">
      {/* Page Header */}
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div className="sl-header-icon">
            <ImgIcon />
          </div>
          <div>
            <h1 className="sl-page-title">Media Gallery</h1>
            <p className="sl-page-sub">{images.length} image{images.length !== 1 ? 's' : ''} in library</p>
          </div>
        </div>
        <div className="sl-header-right">
          <div className="sl-search-wrap">
            <span className="sl-search-icon"><SearchIcon /></span>
            <input type="text" className="sl-search-input" placeholder="Search images..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <input type="file" id="mg-upload" multiple accept="image/*"
            onChange={handleFileUpload} className="mg-file-input" disabled={uploading} />
          <label htmlFor="mg-upload" className={`sl-add-btn${uploading ? ' sl-add-btn--disabled' : ''}`}>
            <span className="sl-add-btn-icon"><UploadIcon /></span>
            {uploading ? 'Uploading...' : 'Upload'}
          </label>
        </div>
      </div>

      {error && (
        <div className="mg-error-banner">{error}</div>
      )}

      {/* Toolbar */}
      <div className="mg-toolbar">
        <div className="mg-toolbar-left">
          <label className="mg-select-all">
            <input type="checkbox" checked={allPageSelected} onChange={selectAllOnPage}
              className="mg-checkbox" />
            <span>{allPageSelected ? 'Deselect Page' : 'Select Page'}</span>
          </label>
          {selectedImages.length > 0 && (
            <button className="mg-delete-btn" onClick={deleteSelectedImages}>
              <TrashIcon />
              Delete Selected ({selectedImages.length})
            </button>
          )}
        </div>
        <div className="mg-toolbar-right">
          <span className="mg-count-text">
            {filteredImages.length > 0
              ? `${startIndex + 1}–${Math.min(startIndex + imagesPerPage, filteredImages.length)} of ${filteredImages.length}`
              : '0 images'}
            {selectedImages.length > 0 && ` · ${selectedImages.length} selected`}
          </span>
          <div className="mg-view-toggle">
            <button className={`mg-view-btn${viewMode === 'grid' ? ' active' : ''}`} onClick={() => setViewMode('grid')} title="Grid view">
              <GridIcon />
            </button>
            <button className={`mg-view-btn${viewMode === 'list' ? ' active' : ''}`} onClick={() => setViewMode('list')} title="List view">
              <ListIcon />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="sl-loader-wrap"><Loader /></div>
      ) : filteredImages.length === 0 ? (
        <div className="sl-table-wrap">
          <div className="sl-empty">
            <div className="sl-empty-icon"><ImgIcon /></div>
            <p>{searchTerm ? 'No images match your search.' : 'No images found in the library.'}</p>
          </div>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="mg-grid">
              {paginatedImages.map((imagePath, index) => {
                const imageUrl = getImageUrl(imagePath);
                const isSelected = selectedImages.includes(imagePath);
                return (
                  <div key={index} className={`mg-card${isSelected ? ' mg-card--selected' : ''}`}
                    onClick={() => toggleImageSelection(imagePath)}>
                    <div className="mg-card-img-wrap">
                      {imageUrl ? (
                        <img src={imageUrl} alt={getImageName(imagePath)} className="mg-card-img"
                          onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                      ) : null}
                      <div className="mg-card-img-error" style={{ display: imageUrl ? 'none' : 'flex' }}>
                        <ImgIcon />
                        <span>Not found</span>
                      </div>
                      {isSelected && (
                        <div className="mg-card-check"><CheckIcon /></div>
                      )}
                      <div className="mg-card-overlay">
                        <button className="mg-overlay-btn" title="View full size"
                          onClick={(e) => { e.stopPropagation(); window.open(imageUrl, '_blank'); }}>
                          <EyeIcon />
                        </button>
                        <button className="mg-overlay-btn mg-overlay-btn--delete" title="Delete"
                          onClick={(e) => deleteSingleImage(e, imagePath)}>
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                    <div className="mg-card-info">
                      <span className="mg-card-name">{getImageName(imagePath)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="sl-table-wrap">
              <table className="mg-list-table">
                <thead>
                  <tr>
                    <th className="mg-list-th mg-list-check-col">
                      <input type="checkbox" checked={allPageSelected} onChange={selectAllOnPage} className="mg-checkbox" />
                    </th>
                    <th className="mg-list-th">Preview</th>
                    <th className="mg-list-th">Name</th>
                    <th className="mg-list-th">Path</th>
                    <th className="mg-list-th mg-list-actions-col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedImages.map((imagePath, index) => {
                    const imageUrl = getImageUrl(imagePath);
                    return (
                      <tr key={index} className={`mg-list-row${selectedImages.includes(imagePath) ? ' mg-list-row--selected' : ''}`}>
                        <td className="mg-list-td mg-list-check-col">
                          <input type="checkbox" checked={selectedImages.includes(imagePath)}
                            onChange={() => toggleImageSelection(imagePath)} className="mg-checkbox" />
                        </td>
                        <td className="mg-list-td">
                          <div className="mg-list-thumb">
                            {imageUrl ? (
                              <img src={imageUrl} alt={getImageName(imagePath)} className="mg-list-thumb-img"
                                onError={(e) => { e.target.style.display = 'none'; }} />
                            ) : (
                              <div className="mg-list-thumb-empty"><ImgIcon /></div>
                            )}
                          </div>
                        </td>
                        <td className="mg-list-td mg-list-name">{getImageName(imagePath)}</td>
                        <td className="mg-list-td mg-list-path">{imagePath}</td>
                        <td className="mg-list-td">
                          <div className="sl-actions">
                            <button className="sl-btn-edit" title="View full size"
                              onClick={(e) => { e.stopPropagation(); window.open(imageUrl, '_blank'); }}>
                              <EyeIcon />
                            </button>
                            <button className="sl-btn-delete" title="Delete"
                              onClick={(e) => deleteSingleImage(e, imagePath)}>
                              <TrashIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="sl-pagination">
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            </div>
          )}
        </>
      )}

      {/* Stats bar */}
      <div className="mg-stats">
        <div className="mg-stat-item">
          <span className="mg-stat-value">{images.length}</span>
          <span className="mg-stat-label">Total Images</span>
        </div>
        <div className="mg-stat-sep" />
        <div className="mg-stat-item">
          <span className="mg-stat-value">{filteredImages.length}</span>
          <span className="mg-stat-label">Filtered</span>
        </div>
        <div className="mg-stat-sep" />
        <div className="mg-stat-item">
          <span className="mg-stat-value">{selectedImages.length}</span>
          <span className="mg-stat-label">Selected</span>
        </div>
      </div>
    </div>
    </>
  );
};

export default MediaGallery;
