import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Modal, Pagination, Skeleton } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { reviewService, brandService } from '../../../services';
import { API_BASE_URL } from '../../../services/api/config';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon, Tick02Icon, Cancel01Icon, StarIcon, MoreHorizontalIcon, Delete02Icon,
  Upload04Icon, Download04Icon, NoteEditIcon, PlayIcon, ArrowLeft01Icon, ArrowRight01Icon,
  ArrowTurnBackwardIcon, Message01Icon,
} from '@hugeicons/core-free-icons';

/* ──────────────────────────────────────────────────────────────
   Reviews — moderation queue.
   New reviews wait here until staff approve them: one tap per card,
   or tick several and use the bar on top. Photos open large and can
   be removed. Data: GET /api/reviews/admin/all (one call: cards, tab
   counts, approved average, review requests sent today) and
   POST /api/reviews/admin/bulk (approve / reject / feature / unfeature).

   Opened from Home's "Reviews to approve" with
     sessionStorage['obz-reviews'] = JSON.stringify({ tab: 'pending', brandId })
   ────────────────────────────────────────────────────────────── */

const HANDOFF_KEY = 'obz-reviews';
const PAGE_SIZE = 20;

const ic = (icon, size = 16) => <HugeiconsIcon icon={icon} size={size} strokeWidth={2} />;
const IC = {
  search: ic(Search01Icon), approve: ic(Tick02Icon, 15), reject: ic(Cancel01Icon, 15), star: ic(StarIcon, 15),
  more: ic(MoreHorizontalIcon, 18), trash: ic(Delete02Icon, 15), upload: ic(Upload04Icon, 15),
  download: ic(Download04Icon, 15), note: ic(NoteEditIcon, 15), play: ic(PlayIcon, 20),
  prev: ic(ArrowLeft01Icon, 20), next: ic(ArrowRight01Icon, 20), back: ic(ArrowTurnBackwardIcon, 15),
  close: ic(Cancel01Icon, 20), empty: ic(Message01Icon, 40),
};

const TABS = [
  { key: 'pending', label: 'Waiting' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'photos', label: 'With photos' },
];
const STATUS_LABEL = { pending: 'Waiting', approved: 'Approved', rejected: 'Rejected' };
const EMPTY_TEXT = {
  pending: ['Nothing waiting', 'Every review has been handled. New ones show up here first.'],
  approved: ['No approved reviews', 'Approved reviews show on the store’s product pages.'],
  rejected: ['No rejected reviews', 'Reviews you reject are kept here, hidden from the stores.'],
  photos: ['No reviews with photos', 'Reviews where the customer added a photo or video show here.'],
};

// ── Small helpers ────────────────────────────────────────────────────
const num = (n) => Number(n || 0).toLocaleString('en-IN');
const plural = (n, w) => `${num(n)} ${w}${Number(n) === 1 ? '' : 's'}`;
const mediaUrl = (u) => (!u ? null : /^https?:\/\//i.test(u) ? u : u.startsWith('/api/') ? `${API_BASE_URL}${u}` : u);
const istDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const whenText = (d) => {
  if (!d) return '';
  const days = Math.round((new Date(istDay(Date.now())) - new Date(istDay(d))) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
};

function readHandoff() {
  try {
    const raw = sessionStorage.getItem(HANDOFF_KEY);
    if (raw) { sessionStorage.removeItem(HANDOFF_KEY); return JSON.parse(raw) || {}; }
  } catch { /* storage blocked / bad JSON */ }
  return {};
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Import sample rows — the "product" column takes a product name (or id / slug).
const SAMPLE_COLS = ['product', 'rating', 'review', 'name', 'email', 'status', 'date', 'verified', 'featured'];
const SAMPLE_ROWS = [
  ['Classic Crew Socks', '5', 'Lovely fabric, true to size.', 'Aarav Shah', 'aarav@example.com', 'approved', '2025-09-14', 'yes', 'no'],
  ['Classic Crew Socks', '4', 'Good value for money.', 'Priya Nair', '', 'approved', '2025-09-20', 'no', 'no'],
  ['Ankle Socks Pack of 3', '5', 'My daughter loves it!', 'Meera Iyer', 'meera@example.com', 'approved', '', 'no', 'yes'],
];
const downloadCsvSample = () => {
  const q = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const csv = [SAMPLE_COLS.join(','), ...SAMPLE_ROWS.map((r) => r.map(q).join(','))].join('\n') + '\n';
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'review-import-template.csv');
};
const downloadExcelSample = () => {
  const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const thead = `<tr>${SAMPLE_COLS.map((c) => `<th style="border:1px solid #d1d5db;padding:6px 10px;text-align:left">${c}</th>`).join('')}</tr>`;
  const tbody = SAMPLE_ROWS.map((r) => `<tr>${r.map((c) => `<td style="border:1px solid #d1d5db;padding:6px 10px">${esc(c)}</td>`).join('')}</tr>`).join('');
  const html = `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><table>${thead}${tbody}</table></body></html>`;
  downloadBlob(new Blob(['﻿', html], { type: 'application/vnd.ms-excel' }), 'review-import-sample.xls');
};

// Popover menu that closes on outside click / Escape.
function useDismiss(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, onClose]);
  return ref;
}

function Menu({ label, items, className = '' }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  return (
    <div className={`rvw-menu ${className}`} ref={ref}>
      <button type="button" className="rvw-icon-btn" aria-label={label} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{IC.more}</button>
      {open && (
        <div className="rvw-menu-list" role="menu">
          {items.filter(Boolean).map((it) => (
            <button key={it.label} type="button" role="menuitem" className={it.danger ? 'danger' : ''}
              onClick={() => { setOpen(false); it.onClick(); }}>
              {it.icon}{it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const Stars = ({ rating }) => (
  <span className="rvw-stars" aria-label={`${rating} out of 5 stars`} title={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((i) => <span key={i} aria-hidden="true" className={i <= rating ? 'on' : ''}>★</span>)}
  </span>
);

// ── Review card ──────────────────────────────────────────────────────
function ReviewCard({ r, checked, busy, onToggle, onAct, onOpenPhoto, onSaveNote, onMoveBack, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(r.admin_notes || '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  useEffect(() => { if (!editing) setNote(r.admin_notes || ''); }, [r.admin_notes, editing]);

  const saveNote = async () => {
    setSavingNote(true);
    const ok = await onSaveNote(r, note.trim());
    setSavingNote(false);
    if (ok) setEditing(false);
  };

  return (
    <article className={`rvw-card${checked ? ' is-sel' : ''}${busy ? ' is-busy' : ''}`} aria-busy={busy || undefined}>
      <button type="button" role="checkbox" aria-checked={checked} aria-label={`Select review by ${r.customerName}`}
        className={`rvw-check${checked ? ' on' : ''}`} onClick={() => onToggle(r.id)}>
        {checked ? '✓' : ''}
      </button>

      <div className="rvw-main">
        <div className="rvw-line1">
          <Stars rating={r.rating} />
          <b className="rvw-name">{r.customerName}</b>
          {r.boughtIt
            ? <span className="rvw-chip ok" title="Has a delivered order for this product">✓ Bought it</span>
            : r.verified_purchase
              ? <span className="rvw-chip info" title="Marked as a buyer in an import sheet — no delivered order found">Marked as buyer</span>
              : <span className="rvw-chip muted" title="No delivered order for this product found for this account or email">Not a buyer</span>}
          {r.is_featured && <span className="rvw-chip feat">★ Featured</span>}
        </div>

        {r.review ? <p className="rvw-body">{r.review}</p> : <p className="rvw-body rvw-faint">Rating only — no written review.</p>}

        {r.images.length > 0 && (
          <div className="rvw-photos">
            {r.images.map((img, i) => (
              <button key={img.id} type="button" className="rvw-thumb" onClick={() => onOpenPhoto(r, i)}
                aria-label={`Open ${img.fileType === 'video' ? 'video' : 'photo'} ${i + 1} of ${r.images.length}`}>
                {img.fileType === 'video' || !img.thumb
                  ? <span className="rvw-thumb-video">{IC.play}</span>
                  : <img src={mediaUrl(img.thumb)} alt="" loading="lazy" />}
              </button>
            ))}
          </div>
        )}

        {editing ? (
          <div className="rvw-note-edit">
            <label htmlFor={`rvw-note-${r.id}`}>Staff note (only staff see this)</label>
            <textarea id={`rvw-note-${r.id}`} rows={3} value={note} maxLength={2000}
              onChange={(e) => setNote(e.target.value)} placeholder="e.g. Called the customer, sent a replacement." />
            <div className="rvw-row">
              <button type="button" className="rvw-btn primary" onClick={saveNote} disabled={savingNote}>{savingNote ? 'Saving…' : 'Save note'}</button>
              <button type="button" className="rvw-btn" onClick={() => setEditing(false)} disabled={savingNote}>Cancel</button>
            </div>
          </div>
        ) : r.admin_notes ? (
          <p className="rvw-note"><b>Note:</b> {r.admin_notes}</p>
        ) : null}

        <span className="rvw-meta">
          {r.productName}{r.brandName ? ` · ${r.brandName}` : ''} · {whenText(r.createdAt)}
          {r.guestEmail ? <span className="rvw-faint"> · {r.guestEmail}</span> : null}
        </span>

        {confirmDelete && (
          <div className="rvw-confirm" role="alertdialog" aria-label="Delete review">
            <span>Delete this review for good? Its photos are deleted too.</span>
            <div className="rvw-row">
              <button type="button" className="rvw-btn danger" onClick={() => { setConfirmDelete(false); onDelete(r); }}>Delete review</button>
              <button type="button" className="rvw-btn" onClick={() => setConfirmDelete(false)}>Keep</button>
            </div>
          </div>
        )}
      </div>

      <div className="rvw-actions">
        <span className={`rvw-status st-${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span>
        {r.status !== 'approved' && (
          <button type="button" className="rvw-btn primary" disabled={busy} onClick={() => onAct([r.id], 'approve')}>{IC.approve} Approve</button>
        )}
        {r.status !== 'rejected' && (
          <button type="button" className="rvw-btn" disabled={busy} onClick={() => onAct([r.id], 'reject')}>Reject</button>
        )}
        {r.status !== 'rejected' && (
          <button type="button" className={`rvw-btn star${r.is_featured ? ' on' : ''}`} disabled={busy} aria-pressed={r.is_featured}
            title={r.is_featured ? 'Remove from featured' : r.status === 'approved' ? 'Feature this review' : 'Approve and feature this review'}
            onClick={() => onAct([r.id], r.is_featured ? 'unfeature' : 'feature')}>
            {r.is_featured ? '★ Featured' : '☆ Feature'}
          </button>
        )}
        <Menu label="More actions for this review" items={[
          { label: r.admin_notes ? 'Edit note' : 'Add note', icon: IC.note, onClick: () => setEditing(true) },
          r.status !== 'pending' && { label: 'Move back to Waiting', icon: IC.back, onClick: () => onMoveBack(r) },
          { label: 'Delete review', icon: IC.trash, danger: true, onClick: () => setConfirmDelete(true) },
        ]} />
      </div>
    </article>
  );
}

// ── Photo viewer ─────────────────────────────────────────────────────
function PhotoViewer({ review, index, onIndex, onClose, onDeletePhoto }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const closeRef = useRef(null);
  const imgs = review.images;
  const img = imgs[index];

  useEffect(() => { setConfirming(false); }, [index]);
  useEffect(() => { closeRef.current?.focus(); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      if (e.key === 'ArrowRight' && index < imgs.length - 1) onIndex(index + 1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [index, imgs.length, onClose, onIndex]);

  if (!img) return null;
  const remove = async () => {
    setDeleting(true);
    await onDeletePhoto(review, img);
    setDeleting(false);
    setConfirming(false);
  };

  return (
    <div className="rvw-viewer" role="dialog" aria-modal="true" aria-label={`Photos from ${review.customerName}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="rvw-viewer-box">
        <div className="rvw-viewer-head">
          <span>{review.customerName} · {review.productName} · {index + 1} of {imgs.length}</span>
          <button type="button" ref={closeRef} className="rvw-icon-btn" aria-label="Close" onClick={onClose}>{IC.close}</button>
        </div>
        <div className="rvw-viewer-stage">
          {index > 0 && <button type="button" className="rvw-nav prev" aria-label="Previous" onClick={() => onIndex(index - 1)}>{IC.prev}</button>}
          {img.fileType === 'video'
            ? <video src={mediaUrl(img.full)} controls playsInline />
            : <img src={mediaUrl(img.full)} alt={`Review photo ${index + 1}`} />}
          {index < imgs.length - 1 && <button type="button" className="rvw-nav next" aria-label="Next" onClick={() => onIndex(index + 1)}>{IC.next}</button>}
        </div>
        <div className="rvw-viewer-foot">
          {confirming ? (
            <>
              <span>Delete this {img.fileType === 'video' ? 'video' : 'photo'}? It is removed from the review and the store.</span>
              <div className="rvw-row">
                <button type="button" className="rvw-btn danger" onClick={remove} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
                <button type="button" className="rvw-btn" onClick={() => setConfirming(false)} disabled={deleting}>Keep</button>
              </div>
            </>
          ) : (
            <button type="button" className="rvw-btn danger-ghost" onClick={() => setConfirming(true)}>{IC.trash} Delete {img.fileType === 'video' ? 'video' : 'photo'}</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Excel / CSV import ───────────────────────────────────────────────
function ImportModal({ open, onClose, brands, defaultBrand, onImported }) {
  const [file, setFile] = useState(null);
  const [brand, setBrand] = useState('');
  const [status, setStatus] = useState('approved');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (open) { setFile(null); setBrand(defaultBrand || ''); setStatus('approved'); setErr(null); setResult(null); }
  }, [open, defaultBrand]);

  const run = async () => {
    if (!file) { setErr('Choose an Excel or CSV file first.'); return; }
    const b = brands.find((x) => String(x.id) === brand);
    if (!b) { setErr('Pick the brand these reviews belong to.'); return; }
    setBusy(true); setErr(null);
    try {
      const res = await reviewService.bulkUpload(file, { brandSlug: b.slug, defaultStatus: status });
      setResult(res);
      onImported();
    } catch (e) {
      setErr(e?.message || 'Import failed');
    } finally {
      setBusy(false);
    }
  };

  const brandOpts = brands.map((b) => ({ value: String(b.id), label: b.display_name || b.name }));
  return (
    <Modal isOpen={open} onClose={() => { if (!busy) onClose(); }} title="Import reviews from Excel" closeOnOverlayClick={false}>
      <div className="modal-body rvw-import">
        {!result ? (
          <>
            <p className="rvw-help">
              Upload an <b>.xlsx</b>, <b>.xls</b> or <b>.csv</b> file. The first row is the column names, in any order:{' '}
              <code>product</code> (name, id or slug), <code>rating</code> (1–5), <code>review</code>, <code>name</code>, <code>email</code>,{' '}
              <code>status</code>, <code>date</code>, <code>verified</code>, <code>featured</code>.
            </p>
            <div className="rvw-row">
              <button type="button" className="rvw-btn" onClick={downloadExcelSample}>{IC.download} Sample (Excel)</button>
              <button type="button" className="rvw-btn" onClick={downloadCsvSample}>{IC.download} Sample (.csv)</button>
            </div>
            <div className="rvw-field">
              <span className="rvw-label">Brand</span>
              <Dropdown value={brand} onChange={setBrand} options={brandOpts} placeholder="Pick a brand" />
              <small>Product names are looked up in this brand. A <code>brand</code> column can override it per row.</small>
            </div>
            <div className="rvw-field">
              <span className="rvw-label">Rows without a status</span>
              <Dropdown value={status} onChange={setStatus} options={[
                { value: 'approved', label: 'Approve (show on the store)' },
                { value: 'pending', label: 'Waiting (check them here first)' },
                { value: 'rejected', label: 'Rejected' },
              ]} />
            </div>
            <div className="rvw-field">
              <label className="rvw-label" htmlFor="rvw-import-file">File</label>
              <input id="rvw-import-file" type="file" className="rvw-file"
                accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setErr(null); }} />
            </div>
            {err && <p className="rvw-error" role="alert">{err}</p>}
          </>
        ) : (
          <>
            <div className="rvw-row">
              <span className="rvw-chip ok">Imported {num(result.created)}</span>
              {!!result.skipped && <span className="rvw-chip bad">Skipped {num(result.skipped)}</span>}
              <span className="rvw-chip muted">Rows read {num(result.total)}</span>
            </div>
            <p className="rvw-help">{result.message}</p>
            {Array.isArray(result.errors) && result.errors.length > 0 && (
              <div className="rvw-import-errors">
                <b>Skipped rows</b>
                <ul>{result.errors.slice(0, 100).map((e) => <li key={e.row}><b>Row {e.row}:</b> {e.reason}</li>)}</ul>
              </div>
            )}
          </>
        )}
      </div>
      <div className="modal-footer">
        {!result ? (
          <>
            <button type="button" className="rvw-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="rvw-btn primary" onClick={run} disabled={busy || !file || !brand}>{busy ? 'Importing…' : 'Import reviews'}</button>
          </>
        ) : (
          <>
            <button type="button" className="rvw-btn" onClick={() => { setResult(null); setFile(null); }}>Import another</button>
            <button type="button" className="rvw-btn primary" onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </Modal>
  );
}

// ── Page ─────────────────────────────────────────────────────────────
export default function Reviews() {
  const qc = useQueryClient();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState('pending');
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(() => new Set());
  const [busyIds, setBusyIds] = useState(() => new Set());
  const [notice, setNotice] = useState(null); // { tone: 'ok' | 'bad', text }
  const [viewer, setViewer] = useState(null); // { id, index }
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    const h = readHandoff();
    if (TABS.some((t) => t.key === h.tab)) setTab(h.tab);
    if (h.brandId) setBrandId(String(h.brandId));
    setReady(true);
    let off = false;
    brandService.getAllBrands().then((res) => {
      if (!off) setBrands(res?.data || res?.brands || (Array.isArray(res) ? res : []));
    }).catch(() => {});
    return () => { off = true; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  // A new filter starts on page 1 with nothing ticked.
  useEffect(() => { setPage(1); }, [tab, brandId, debounced]);
  useEffect(() => { setSelected(new Set()); }, [tab, brandId, debounced, page]);

  useEffect(() => {
    if (!notice || notice.tone !== 'ok') return undefined;
    const t = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(t);
  }, [notice]);

  const { data, isLoading, isFetching, isPlaceholderData, error, refetch } = useQuery({
    queryKey: ['reviews-moderation', tab, brandId, debounced, page],
    queryFn: () => reviewService.getModerationList({ tab, brandId, search: debounced, page, limit: PAGE_SIZE }),
    enabled: ready,
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });

  const reviews = data?.reviews || [];
  const counts = data?.counts || {};
  const totalPages = data?.pagination?.totalPages || 0;

  // After approving the last cards on the last page, step back a page.
  useEffect(() => { if (totalPages > 0 && page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['reviews-moderation'] });
  const fail = (e, fallback) => setNotice({ tone: 'bad', text: e?.message || fallback });

  const act = async (ids, action) => {
    setBusyIds(new Set(ids));
    try {
      const res = await reviewService.bulkModerate(ids, action);
      setNotice({ tone: 'ok', text: res?.message || 'Done' });
      setSelected((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
      await refresh();
    } catch (e) {
      fail(e, 'Could not update the reviews. Try again.');
    } finally {
      setBusyIds(new Set());
    }
  };

  const saveNote = async (r, text) => {
    try {
      await reviewService.moderateReview(r.id, { status: r.status, is_featured: r.is_featured, admin_notes: text });
      setNotice({ tone: 'ok', text: text ? 'Note saved' : 'Note removed' });
      await refresh();
      return true;
    } catch (e) { fail(e, 'Could not save the note.'); return false; }
  };

  const moveBack = async (r) => {
    setBusyIds(new Set([r.id]));
    try {
      await reviewService.moderateReview(r.id, { status: 'pending', is_featured: false, admin_notes: r.admin_notes });
      setNotice({ tone: 'ok', text: 'Moved back to Waiting' });
      await refresh();
    } catch (e) { fail(e, 'Could not move the review.'); }
    finally { setBusyIds(new Set()); }
  };

  const deleteReview = async (r) => {
    setBusyIds(new Set([r.id]));
    try {
      await reviewService.deleteReview(r.id);
      setNotice({ tone: 'ok', text: 'Review deleted' });
      setSelected((prev) => { const n = new Set(prev); n.delete(r.id); return n; });
      await refresh();
    } catch (e) { fail(e, 'Could not delete the review.'); }
    finally { setBusyIds(new Set()); }
  };

  const deletePhoto = async (r, img) => {
    try {
      await reviewService.deleteReviewImage(img.id);
      setNotice({ tone: 'ok', text: img.fileType === 'video' ? 'Video deleted' : 'Photo deleted' });
      const left = r.images.length - 1;
      setViewer((v) => (left <= 0 ? null : { ...v, index: Math.min(v.index, left - 1) }));
      await refresh();
    } catch (e) { fail(e, 'Could not delete the photo.'); }
  };

  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOnPage = reviews.length > 0 && reviews.every((r) => selected.has(r.id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(reviews.map((r) => r.id)));
  const selIds = [...selected];
  const bulkBusy = busyIds.size > 0;

  const brandName = brands.find((b) => String(b.id) === brandId);
  const viewerReview = viewer ? reviews.find((r) => r.id === viewer.id) : null;

  const avg = data?.avgRating;
  const rr = data?.reviewRequestsToday;
  const requestsText = !data ? '' : rr == null
    ? 'Review requests: not recorded'
    : rr.enabled === false
      ? `Review requests are switched off${rr.sent ? ` · ${num(rr.sent)} sent today` : ''}`
      : `${plural(rr.sent, 'review request')} sent today · 10 am${rr.failed ? ` · ${num(rr.failed)} failed` : ''}`;

  const bulkActions = {
    pending: [['approve', 'Approve'], ['reject', 'Reject'], ['feature', 'Feature']],
    approved: [['reject', 'Reject'], ['feature', 'Feature'], ['unfeature', 'Remove feature']],
    rejected: [['approve', 'Approve']],
    photos: [['approve', 'Approve'], ['reject', 'Reject'], ['feature', 'Feature']],
  }[tab];

  return (
    <div className="dashboard-sections rvw-page">
      <PageHeader
        title={`Reviews${brandName ? ` — ${brandName.display_name || brandName.name}` : ''}`}
        subtitle="New reviews wait here until you approve them. One tap each, or select several."
        actions={
          <div className="rvw-head-tools">
            <Dropdown
              value={brandId || 'all'}
              onChange={(v) => setBrandId(v === 'all' ? '' : String(v))}
              options={[{ value: 'all', label: 'All brands' }, ...brands.map((b) => ({ value: String(b.id), label: b.display_name || b.name }))]}
              className="bset-brand-select"
            />
            <Menu label="More options" className="rvw-head-menu" items={[
              { label: 'Import reviews from Excel', icon: IC.upload, onClick: () => setImportOpen(true) },
            ]} />
          </div>
        }
      >
        {data && (
          <div className="rvw-stats">
            <span>{avg != null
              ? <><b>{avg.toFixed(1)} ★</b> average · {plural(data.approvedTotal, 'approved review')}</>
              : <>No approved reviews yet</>}</span>
            <span title="WhatsApp asks customers for a review 3 days after delivery, every day at 10 am">{requestsText}</span>
          </div>
        )}
      </PageHeader>

      <div className="rvw-toolbar">
        <div className="rvw-tabs" role="tablist" aria-label="Review status">
          {TABS.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key}
              className={`rvw-tab${tab === t.key ? ' on' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}<span className="n">{data ? num(counts[t.key]) : <Skeleton w={18} h={11} style={{ display: 'inline-block', verticalAlign: 'middle' }} />}</span>
            </button>
          ))}
        </div>
        <label className="rvw-search">
          <span className="rvw-sr">Search reviews</span>
          {IC.search}
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, product or words…" />
        </label>
      </div>

      {notice && (
        <div className={`rvw-notice ${notice.tone}`} role={notice.tone === 'bad' ? 'alert' : 'status'}>
          <span>{notice.text}</span>
          <button type="button" className="rvw-icon-btn" aria-label="Dismiss" onClick={() => setNotice(null)}>{IC.close}</button>
        </div>
      )}

      {reviews.length > 0 && (
        <div className={`rvw-selbar${selIds.length ? ' active' : ''}`}>
          <button type="button" role="checkbox" aria-checked={allOnPage} className={`rvw-check${allOnPage ? ' on' : ''}`} onClick={toggleAll}
            aria-label="Select all on this page">{allOnPage ? '✓' : ''}</button>
          {selIds.length ? (
            <>
              <span className="rvw-selcount">{selIds.length} selected</span>
              <div className="rvw-row">
                {bulkActions.map(([a, label]) => (
                  <button key={a} type="button" disabled={bulkBusy}
                    className={`rvw-btn${a === 'approve' ? ' go' : a === 'reject' ? ' bad' : ''}`}
                    onClick={() => act(selIds, a)}>{label}</button>
                ))}
                <button type="button" className="rvw-btn ghost" onClick={() => setSelected(new Set())} disabled={bulkBusy}>Clear</button>
              </div>
            </>
          ) : (
            <span className="rvw-faint">Select all on this page{isFetching && data ? ' · updating…' : ''}</span>
          )}
        </div>
      )}

      {!ready || isLoading ? (
        <section className="rvw-list" role="status" aria-busy="true">
          <span className="ds-sr-only">Loading reviews…</span>
          {Array.from({ length: 5 }, (_, i) => (
            <article key={i} className="rvw-card" aria-hidden="true">
              <Skeleton w={22} h={22} r={6} style={{ marginTop: 2, flex: 'none' }} />
              <div className="rvw-main">
                <div className="rvw-line1"><Skeleton w={78} h={14} /><Skeleton w={120 + (i % 3) * 30} h={14} /><Skeleton w={70} h={18} r={9} /></div>
                <Skeleton w={['92%', '78%', '85%'][i % 3]} h={12} />
                {i % 2 === 0 && <Skeleton w="55%" h={12} />}
                <Skeleton w="40%" h={10} />
              </div>
              <div className="rvw-actions"><Skeleton w={64} h={22} r={11} /><Skeleton w={88} h={30} r={8} /><Skeleton w={64} h={30} r={8} /></div>
            </article>
          ))}
        </section>
      ) : error && !data ? (
        <div className="rvw-state bad">
          <p>Couldn’t load reviews: {error.message || 'try again'}</p>
          <button type="button" className="rvw-btn" onClick={() => refetch()}>Try again</button>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rvw-state">
          <span className="rvw-empty-ic">{IC.empty}</span>
          <b>{debounced ? 'No reviews match' : EMPTY_TEXT[tab][0]}</b>
          <p>{debounced ? `Nothing in ${TABS.find((t) => t.key === tab).label} for “${debounced}”.` : EMPTY_TEXT[tab][1]}</p>
        </div>
      ) : (
        <section className="rvw-list" aria-label={`${TABS.find((t) => t.key === tab).label} reviews`}
          aria-busy={isPlaceholderData || undefined} style={isPlaceholderData ? { opacity: 0.6, transition: 'opacity .15s' } : undefined}>
          {reviews.map((r) => (
            <ReviewCard key={r.id} r={r} checked={selected.has(r.id)} busy={busyIds.has(r.id)}
              onToggle={toggle} onAct={act} onSaveNote={saveNote} onMoveBack={moveBack} onDelete={deleteReview}
              onOpenPhoto={(rev, index) => setViewer({ id: rev.id, index })} />
          ))}
        </section>
      )}

      {totalPages > 1 && (
        <div className="rvw-pager">
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      <p className="rvw-foot">
        “Bought it” means the reviewer has a delivered order for this product (matched by their account or email).
        Low ratings are never hidden automatically — reply in WhatsApp first if something went wrong.
        Feature also approves the review.
      </p>

      {viewerReview && viewerReview.images.length > 0 && (
        <PhotoViewer review={viewerReview} index={Math.min(viewer.index, viewerReview.images.length - 1)}
          onIndex={(i) => setViewer((v) => ({ ...v, index: i }))} onClose={() => setViewer(null)} onDeletePhoto={deletePhoto} />
      )}

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} brands={brands} defaultBrand={brandId}
        onImported={refresh} />
    </div>
  );
}
