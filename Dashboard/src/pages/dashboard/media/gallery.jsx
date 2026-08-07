import React, { useState, useEffect } from 'react';
import { productService } from '../../../services';
import Loader from '../../../components/common/Loader';
import { Pagination } from '../../../components/ui';
import AlertModal, { ConfirmModal } from '../../../components/common/AlertModal';
import { HugeiconsIcon } from '@hugeicons/react';
import { GridViewIcon, ListViewIcon, Upload04Icon, Delete02Icon, ViewIcon, Search01Icon, Image02Icon, Tick02Icon } from '@hugeicons/core-free-icons';

const GridIcon = () => <HugeiconsIcon icon={GridViewIcon} size={16} strokeWidth={2} />;
const ListIcon = () => <HugeiconsIcon icon={ListViewIcon} size={16} strokeWidth={2} />;
const UploadIcon = () => <HugeiconsIcon icon={Upload04Icon} size={16} strokeWidth={2} />;
const TrashIcon = () => <HugeiconsIcon icon={Delete02Icon} size={15} strokeWidth={2} />;
const EyeIcon = () => <HugeiconsIcon icon={ViewIcon} size={15} strokeWidth={2} />;
const SearchIcon = () => <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />;
const ImgIcon = () => <HugeiconsIcon icon={Image02Icon} size={28} strokeWidth={1.5} />;
const CheckIcon = () => <HugeiconsIcon icon={Tick02Icon} size={12} strokeWidth={2} />;

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
    // Images are served from ImageKit (CDN), not the API's /uploads path — mirror
    // the URL logic the Products page uses so thumbnails actually resolve.
    const ik = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/wp2oatzmf';
    if (!imagePath || typeof imagePath !== 'string') return null;
    if (imagePath.startsWith('http')) return imagePath;
    // Legacy local uploads still live on the API server
    if (imagePath.startsWith('/uploads/')) return `${baseUrl}${imagePath}`;
    // ImageKit-hosted assets (product / category / slider folders)
    if (/^\/(products|categories|sliders)/.test(imagePath)) return `${ik}${imagePath}`;
    // Bare filename → default to the products folder on ImageKit
    return `${ik}/products/${imagePath.replace(/^\/+/, '')}`;
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
            <div className="sl-table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
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
