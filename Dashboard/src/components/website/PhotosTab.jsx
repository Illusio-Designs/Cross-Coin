// Website → Photos: every picture the site stores, where it is used, and
// which ones are used nowhere (safe to delete).
import { useEffect, useState } from 'react';
import { websiteService } from '../../services';
import { showSuccess, showError, showWarning } from '../../utils/toastNotification';
import ConfirmBar from '../ui/ConfirmBar';
import EmptyState from '../ui/EmptyState';
import { WebChips, WebBody, WebGridState, WebCard, WebPager, WebPanel } from './webParts';
import { useLoad, errText, fmtDay, fmtBytes, plural, goToView } from './webUtil';

const LIMIT = 24;
const INPUT_ID = 'web-photo-input';
const KINDS = [
  ['products', 'product', 'Products'],
  ['slides', 'slide', 'Slides'],
  ['posts', 'blog post', 'Blog posts'],
  ['categories', 'category', 'Categories'],
  ['pages', 'SEO page', 'SEO pages'],
  ['brands', 'store logo', 'Store logos'],
  ['policies', 'policy', 'Policies'],
];

function usedText(m) {
  if (!m.use_count) return 'Not used anywhere — safe to delete';
  const parts = KINDS.filter(([k]) => m.uses[k]?.length).map(([k, one]) => plural(m.uses[k].length, one, one === 'category' ? 'categories' : `${one}s`));
  return `Used on ${parts.join(' · ')}`;
}

export default function PhotosTab({ q, registerAction }) {
  const [usage, setUsage] = useState('all');
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [confirm, setConfirm] = useState(null); // 'one' | 'page'
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => { setPage(1); }, [q, usage]);
  const list = useLoad(() => websiteService.listMedia({ search: q || undefined, usage, page, limit: LIMIT }), [q, usage, page]);
  const items = list.data?.items || [];
  const counts = list.data?.counts || {};
  const complete = list.data ? list.data.complete !== false : true;

  useEffect(() => {
    registerAction({ label: uploading ? 'Uploading…' : 'Upload photos', htmlFor: INPUT_ID, busy: uploading });
  }, [registerAction, uploading]);
  useEffect(() => () => registerAction(null), [registerAction]);

  const onFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    setUploading(true);
    try {
      const r = await websiteService.uploadMedia(files);
      const ok = r?.uploaded?.length || 0;
      const bad = r?.failed?.length || 0;
      if (ok) showSuccess('uploadSuccess', `${plural(ok, 'photo')} uploaded${bad ? ` · ${bad} failed` : ''}`);
      else showError('uploadFailed', 'No photo could be uploaded.');
      setUsage('all'); setPage(1);
      list.reload(true);
    } catch (err) {
      showError('uploadFailed', errText(err, 'Upload failed.'));
    } finally { setUploading(false); }
  };

  const del = async (keys) => {
    setBusy(true);
    try {
      const r = await websiteService.deleteMedia(keys);
      const n = r?.deleted?.length || 0;
      if (n) showSuccess('deleteSuccess', `${plural(n, 'photo')} deleted`);
      const kept = (r?.kept?.length || 0) + (r?.failed?.length || 0);
      if (kept) showWarning('partial', `${plural(kept, 'photo')} not deleted — ${(r.kept?.[0] || r.failed?.[0]).reason}`);
      setConfirm(null);
      if (sel && keys.includes(sel.key) && (r?.deleted || []).includes(sel.key)) setSel(null);
      list.reload(true);
    } catch (e) {
      showError('deleteFailed', errText(e, 'Could not delete.'));
    } finally { setBusy(false); }
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(sel.url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  const openUse = (kind, id) => {
    if (kind === 'products') return goToView('products', `edit=${id}`);
    if (kind === 'slides') return goToView('slider');
    if (kind === 'posts') return goToView('blogs');
    if (kind === 'pages') return goToView('seo-pages');
    if (kind === 'categories') return goToView('categories');
    if (kind === 'brands') return goToView('brands');
    if (kind === 'policies') return goToView('policies');
    return undefined;
  };

  const unusedOnPage = items.filter((m) => !m.use_count);
  const chips = [
    { id: 'all', label: 'All', count: counts.all },
    { id: 'used', label: 'In use', count: counts.used },
    { id: 'unused', label: 'Not used', count: counts.unused },
    { id: 'products', label: 'On products', count: counts.products },
    { id: 'slides', label: 'On slides', count: counts.slides },
    { id: 'posts', label: 'On blog', count: counts.posts },
  ];

  const current = sel ? (items.find((m) => m.key === sel.key) || sel) : null;
  const panel = (
    <WebPanel
      open={!!current}
      title={current?.name || 'Photo'}
      pill={current ? (current.use_count ? { label: 'In use', tone: 'done' } : { label: 'Not used', tone: 'neutral' }) : null}
      onClose={() => { setSel(null); setConfirm(null); }}
      hint="Pick a photo to see where it is used. Photos used nowhere can be deleted."
      actions={current && (confirm === 'one' ? (
        <ConfirmBar message={<>Delete <b>{current.name}</b>? It is not used anywhere. This can’t be undone.</>} confirmLabel="Delete" cancelLabel="Keep" busy={busy} onConfirm={() => del([current.key])} onCancel={() => setConfirm(null)} />
      ) : (
        <>
          <a className="web-btn web-btn--primary" href={current.url} target="_blank" rel="noopener noreferrer">Open full size ↗</a>
          <button type="button" className="web-btn" onClick={copy}>{copied ? 'Link copied' : 'Copy link'}</button>
          {!current.use_count && <button type="button" className="web-btn web-btn--danger" disabled={!complete || busy} onClick={() => setConfirm('one')}>Delete</button>}
        </>
      ))}
    >
      {current && (
        <>
          <div className="web-preview web-preview--photo"><img src={current.preview || current.url} alt={current.name} /></div>
          <dl className="web-facts">
            <dt>File</dt><dd className="web-mono">{current.file}</dd>
            {current.uploaded_at && <><dt>Added</dt><dd>{fmtDay(current.uploaded_at, true)}</dd></>}
            {current.size_bytes && <><dt>Size</dt><dd>{fmtBytes(current.size_bytes)}</dd></>}
          </dl>
          {current.use_count ? (
            <div className="web-uses">
              <h3 className="web-h3">Where it’s used</h3>
              {KINDS.filter(([k]) => current.uses[k]?.length).map(([k, , label]) => (
                <div key={k} className="web-use-group">
                  <span className="web-label">{label}</span>
                  <ul>
                    {current.uses[k].slice(0, 12).map((u) => (
                      <li key={u.id}><button type="button" className="web-link" onClick={() => openUse(k, u.id)}>{u.label || `#${u.id}`}</button></li>
                    ))}
                    {current.uses[k].length > 12 && <li className="web-muted">and {current.uses[k].length - 12} more</li>}
                  </ul>
                </div>
              ))}
              <p className="web-note">To delete this photo, first remove it from the places above.</p>
            </div>
          ) : (
            <p className="web-note">Not used on any product, slide, post, category, SEO page, logo or policy.</p>
          )}
        </>
      )}
    </WebPanel>
  );

  return (
    <>
      <input id={INPUT_ID} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="web-hidden-input" onChange={onFiles} disabled={uploading} />
      <WebChips chips={chips} value={usage} onChange={setUsage} />
      {!complete && <p className="web-warn" role="status">Some places could not be checked just now, so deleting is paused. Reload in a minute.</p>}
      {usage === 'unused' && unusedOnPage.length > 1 && complete && (
        confirm === 'page'
          ? <ConfirmBar message={<>Delete all <b>{unusedOnPage.length}</b> unused photos on this page? This can’t be undone.</>} confirmLabel="Delete all" cancelLabel="Keep" busy={busy} onConfirm={() => del(unusedOnPage.map((m) => m.key))} onCancel={() => setConfirm(null)} />
          : <div className="web-bulk"><span>{plural(unusedOnPage.length, 'photo')} on this page are not used anywhere.</span><button type="button" className="web-btn web-btn--danger web-btn--sm" onClick={() => setConfirm('page')}>Delete these {unusedOnPage.length}</button></div>
      )}
      <WebBody panel={panel}>
        <WebGridState
          loading={list.loading} error={list.error} onRetry={() => list.reload()} count={items.length}
          empty={<EmptyState title={q || usage !== 'all' ? 'No photos match' : 'No photos yet'} description={q || usage !== 'all' ? 'Try another search or filter.' : 'Upload photos here, or add them to products, slides and posts.'} action={!q && usage === 'all' ? <label htmlFor={INPUT_ID} className="web-btn web-btn--primary">Upload photos</label> : null} />}
        />
        {!list.loading && !list.error && items.length > 0 && (
          <>
            <div className="web-grid web-grid--photos">
              {items.map((m) => (
                <WebCard
                  key={m.key}
                  selected={current?.key === m.key}
                  onOpen={() => { setSel(m); setConfirm(null); }}
                  media={m.preview || m.url}
                  mediaAlt={m.name}
                  wide
                  title={<span className="web-ellipsis" title={m.name}>{m.name}</span>}
                  pill={m.use_count ? { label: 'In use', tone: 'done' } : { label: 'Not used', tone: 'neutral' }}
                  meta={usedText(m)}
                />
              ))}
            </div>
            <WebPager page={page} limit={LIMIT} total={list.data?.total || 0} onPage={setPage} />
          </>
        )}
      </WebBody>
    </>
  );
}
