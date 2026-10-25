import { useId, useState } from 'react';
import { productService } from '../../services';
import ExistingProductVideoPicker from './ExistingProductVideoPicker';

const MAX_VIDEOS = 4;
const MAX_BYTES = 50 * 1024 * 1024;

export default function ProductVideoFields({ productId, videos = [], onChange, onUploadingChange, disabled = false }) {
  const fieldId = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (index, patch) => onChange(videos.map((video, i) => i === index ? { ...video, ...patch } : video));

  const upload = async (event, index = null) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    setError('');
    const isCover = index !== null;
    if (!isCover && videos.length + files.length > MAX_VIDEOS) { setError('Add up to 4 videos per product.'); return; }
    if (files.some((file) => isCover
      ? !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024
      : !['video/mp4', 'video/webm'].includes(file.type) || file.size > MAX_BYTES)) {
      setError(isCover ? 'Choose a JPG, PNG or WebP cover up to 5 MB.' : 'Choose MP4 or WebM videos up to 50 MB each.');
      return;
    }
    setBusy(true);
    onUploadingChange(true);
    try {
      const result = isCover ? await productService.uploadImages(files) : await productService.uploadVideos(files);
      const uploaded = result.uploadedImages || [];
      if (uploaded.length !== files.length || uploaded.some((file) => !file.url)) throw new Error('Upload incomplete. Please try again.');
      if (isCover) update(index, { poster: uploaded[0].url });
      else onChange([...videos, ...uploaded.map((file) => ({ url: file.url, caption: '', poster: '' }))]);
    } catch (err) { setError(err?.message || 'Upload failed. Please try again.'); }
    finally { setBusy(false); onUploadingChange(false); }
  };
  const locked = busy || disabled;

  return (
    <section id="pst-sec-videos" className="pst-panel pst-sec">
      <h2>Product videos</h2>
      <p className="pst-help">Add up to 4 portrait videos (MP4 or WebM, 50 MB each). They appear as playable cards on Morbix and Soxbae product pages. Save the product to publish your changes.</p>
      <label className="pst-btn pst-video-upload">
        {busy ? 'Uploading…' : 'Upload videos'}
        <input aria-label="Upload product videos" type="file" accept="video/mp4,video/webm" multiple disabled={locked || videos.length >= MAX_VIDEOS} onChange={upload} />
      </label>
      <button type="button" className="pst-btn" disabled={locked || videos.length >= MAX_VIDEOS} onClick={() => setPickerOpen(value => !value)}>Choose from another product</button>
      {pickerOpen && <ExistingProductVideoPicker productId={productId} videos={videos} disabled={locked}
        onClose={() => setPickerOpen(false)}
        onAdd={(selected) => { onChange([...videos, ...selected]); setPickerOpen(false); }} />}
      {error && <p role="alert" className="pst-video-error">{error}</p>}
      {!videos.length && <p className="pst-help">No videos added. The video section stays hidden until you add one.</p>}
      <div className="pst-video-grid">
        {videos.map((video, index) => (
          <div className="pst-video-card" key={`${video.url}-${index}`}>
            <video src={video.url} poster={video.poster || undefined} controls playsInline preload="metadata" aria-label={`Product video ${index + 1}`} />
            <div className="pst-field"><label htmlFor={`${fieldId}-${index}-caption`}>Caption</label>
              <textarea id={`${fieldId}-${index}-caption`} value={video.caption || ''} maxLength={300} rows={3} disabled={locked} onChange={(event) => update(index, { caption: event.target.value })} placeholder="Add a caption beneath this video" />
            </div>
            <label className="pst-btn pst-btn--sm pst-video-upload">{video.poster ? 'Replace cover' : 'Upload cover (optional)'}
              <input aria-label={`Upload cover for video ${index + 1}`} type="file" accept="image/jpeg,image/png,image/webp" disabled={locked} onChange={(event) => upload(event, index)} />
            </label>
            {video.poster && <button type="button" className="pst-link" disabled={locked} onClick={() => update(index, { poster: '' })}>Remove cover</button>}
            <div className="pst-video-actions">
              <button type="button" className="pst-btn pst-btn--sm" disabled={locked || index === 0} onClick={() => { const next = [...videos]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }}>Move earlier</button>
              <button type="button" className="pst-btn pst-btn--sm pst-btn--danger" disabled={locked} onClick={() => onChange(videos.filter((_, i) => i !== index))}>Remove video</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
