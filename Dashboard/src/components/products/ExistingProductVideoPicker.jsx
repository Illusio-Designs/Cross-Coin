import { useEffect, useState } from 'react';
import { productService } from '../../services';
import { videosForProduct } from './productVideoData';

export default function ExistingProductVideoPicker({ productId, videos, onAdd, onClose, disabled }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [products, setProducts] = useState([]);
  const [pages, setPages] = useState(1);
  const [sourceId, setSourceId] = useState('');
  const [available, setAvailable] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      productService.getAllProducts(page, 20, search.trim(), controller.signal, true, '', true)
        .then(result => {
          if (controller.signal.aborted) return;
          setProducts((result.products || result.data || []).filter(product => String(product.id) !== String(productId)));
          setPages(Math.max(1, Number(result.pages) || 1));
          setError('');
        })
        .catch(err => { if (!controller.signal.aborted) setError(err?.message || 'Could not load products.'); })
        .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [page, search, productId]);

  useEffect(() => {
    setAvailable([]);
    setSelected([]);
    if (!sourceId) { setLoadingVideos(false); return; }
    const controller = new AbortController();
    setLoadingVideos(true);
    setError('');
    productService.getProduct(sourceId, controller.signal)
      .then(product => { if (!controller.signal.aborted) setAvailable(videosForProduct(product).filter((video, index, all) => all.findIndex(other => other.url === video.url) === index)); })
      .catch(err => { if (!controller.signal.aborted) setError(err?.message || 'Could not load videos.'); })
      .finally(() => { if (!controller.signal.aborted) setLoadingVideos(false); });
    return () => controller.abort();
  }, [sourceId]);

  const remaining = Math.max(0, 4 - videos.length);
  const add = () => {
    const chosen = available.filter(video => selected.includes(video.url) && !videos.some(existing => existing.url === video.url));
    const unique = chosen.filter((video, index) => chosen.findIndex(other => other.url === video.url) === index);
    if (!unique.length) return;
    if (unique.length > remaining) { setError('A product can have up to 4 videos.'); return; }
    onAdd(unique.map(video => ({ ...video })));
  };

  return (
    <div className="pst-video-picker">
      <div className="pst-sec-head"><h3>Use videos from another product</h3><button type="button" className="pst-btn pst-btn--sm" onClick={onClose} disabled={disabled}>Close video picker</button></div>
      <label className="pst-field">Search products
        <input className="pst-input" type="search" aria-label="Search products for videos" value={search} disabled={disabled} onChange={event => { setSearch(event.target.value); setPage(1); setSourceId(''); }} placeholder="Search by product name" />
      </label>
      <label className="pst-field">Source product
        <select aria-label="Source product" className="pst-input" value={sourceId} disabled={disabled || loading} onChange={event => setSourceId(event.target.value)}>
          <option value="">{loading ? 'Loading products…' : 'Choose a product'}</option>
          {products.map(product => <option key={product.id} value={product.id}>{product.name} (#{product.id})</option>)}
        </select>
      </label>
      {pages > 1 && <div className="pst-video-actions">
        <button type="button" className="pst-btn pst-btn--sm" disabled={disabled || loading || page === 1} onClick={() => { setPage(value => value - 1); setSourceId(''); }}>Previous products</button>
        <span>Page {page} of {pages}</span>
        <button type="button" className="pst-btn pst-btn--sm" disabled={disabled || loading || page >= pages} onClick={() => { setPage(value => value + 1); setSourceId(''); }}>Next products</button>
      </div>}
      {error && <p role="alert" className="pst-video-error">{error}</p>}
      {loadingVideos && <p role="status">Loading product videos…</p>}
      {sourceId && !loadingVideos && !error && !available.length && <p className="pst-help">This product has no saved videos. Choose another product.</p>}
      <div className="pst-video-grid">
        {available.map((video, index) => {
          const alreadyAdded = videos.some(existing => existing.url === video.url);
          const checked = selected.includes(video.url);
          return <div className="pst-video-card" key={`${video.url}-${index}`}>
            <video src={video.url} poster={video.poster || undefined} controls playsInline preload="none" aria-label={`Existing video ${index + 1}`} />
            <label><input type="checkbox" checked={checked} disabled={disabled || alreadyAdded || (!checked && selected.length >= remaining)} onChange={event => setSelected(previous => event.target.checked ? [...previous, video.url] : previous.filter(url => url !== video.url))} /> {video.caption || `Video ${index + 1}`}{alreadyAdded ? ' — already added' : ''}</label>
          </div>;
        })}
      </div>
      <p className="pst-help">Selected videos keep their captions and covers. Save this product to publish them. Changes to the source product will not change this selection.</p>
      <button type="button" className="pst-btn pst-btn--primary" disabled={disabled || loadingVideos || !selected.length || !remaining} onClick={add}>Add selected videos ({selected.length})</button>
    </div>
  );
}
