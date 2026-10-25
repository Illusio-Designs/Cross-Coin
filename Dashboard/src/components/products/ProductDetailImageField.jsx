import { useState } from 'react';
import { productService } from '../../services';

export default function ProductDetailImageField({ image, onChange, onUploadingChange, disabled }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const upload = async event => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) { setError('Choose a JPG, PNG or WebP image up to 5 MB.'); return; }
    setError(''); setBusy(true); onUploadingChange(true);
    try {
      const result = await productService.uploadImages([file]);
      const uploaded = result.uploadedImages?.[0];
      if (!uploaded?.url) throw new Error('The image could not be uploaded.');
      onChange({ url: uploaded.url, alt: image?.alt || '' });
    } catch (err) { setError(err?.message || 'Could not upload the image.'); }
    finally { setBusy(false); onUploadingChange(false); }
  };
  return <section className="pst-panel pst-sec">
    <h2>Product section image</h2>
    <p className="pst-help">Add an image after the benefits section on the product page. Save the product to publish your changes.</p>
    <label className="pst-btn pst-video-upload">{busy ? 'Uploading…' : image ? 'Replace section image' : 'Upload section image'}
      <input aria-label="Upload product section image" type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled || busy} onChange={upload} />
    </label>
    {error && <p role="alert" className="pst-video-error">{error}</p>}
    {image && <div className="pst-detail-image">
      <img src={image.url} alt={image.alt || 'Product section image preview'} />
      <label>Image description<input aria-label="Section image description" className="pst-input" value={image.alt || ''} maxLength={300} disabled={disabled || busy} onChange={event => onChange({ ...image, alt: event.target.value })} /></label>
      <button type="button" className="pst-btn pst-btn--sm pst-btn--danger" disabled={disabled || busy} onClick={() => onChange(null)}>Remove section image</button>
    </div>}
  </section>;
}
