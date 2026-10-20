// Message bubble content for the WhatsApp inbox: text with WhatsApp-style
// formatting, photos, videos, voice notes, documents, reactions and the COD
// button taps. Media is fetched through the backend proxy (signed URL when the
// server provides one) and cached as blob URLs.
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Mic01Icon, Download01Icon, File01Icon, InformationCircleIcon } from '@hugeicons/core-free-icons';
import { Skeleton } from '../ui';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

// Bounded LRU: proxyUrl → blob URL. Evicted entries are revoked so a long shift
// with hundreds of photos / voice notes can't grow memory without limit.
const MEDIA_BLOB_MAX = 60;
const mediaBlobCache = new Map();

async function fetchMediaBlob(src) {
  if (mediaBlobCache.has(src)) {
    const v = mediaBlobCache.get(src);
    mediaBlobCache.delete(src); mediaBlobCache.set(src, v);
    return v;
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  mediaBlobCache.set(src, url);
  while (mediaBlobCache.size > MEDIA_BLOB_MAX) {
    const oldest = mediaBlobCache.keys().next().value;
    const oldUrl = mediaBlobCache.get(oldest);
    mediaBlobCache.delete(oldest);
    try { URL.revokeObjectURL(oldUrl); } catch { /* ignore */ }
  }
  return url;
}

function legacyProxyUrl(mediaId, brandId) {
  if (!mediaId) return null;
  let token = '';
  try { token = localStorage.getItem('token') || ''; } catch { /* ignore */ }
  // brand '' / 0 = all brands; media auth needs a real one — the backend falls
  // back to the shared account for brand 1.
  return `${API_BASE}/api/whatsapp/media/${encodeURIComponent(mediaId)}?brandId=${brandId || 1}&token=${encodeURIComponent(token)}`;
}

// ── Voice notes ─────────────────────────────────────────────────────────────
// WhatsApp voice notes are ogg/opus: Chromium reports duration = Infinity until
// it seeks to the end (fixed below) and Safari can't decode opus at all (we
// fall back to a download link).
function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const blobUrlRef = useRef(null);
  const durationFixedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [blobType, setBlobType] = useState('');
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error | unsupported

  useEffect(() => {
    if (!src) return undefined;
    setLoadState('loading');
    setBlobUrl(null);
    durationFixedRef.current = false;
    let cancelled = false;
    fetch(src)
      .then((r) => { if (!r.ok) throw new Error('Failed'); return r.blob(); })
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobType(blob.type || '');
        setBlobUrl(url);
        let playable = true;
        if (blob.type && /^audio\//i.test(blob.type) && typeof document !== 'undefined') {
          const probe = document.createElement('audio');
          const baseType = blob.type.split(';')[0].trim();
          playable = probe.canPlayType(blob.type) !== '' || probe.canPlayType(baseType) !== '';
        }
        setLoadState(playable ? 'ready' : 'unsupported');
      })
      .catch(() => { if (!cancelled) setLoadState('error'); });
    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || loadState !== 'ready') return;
    if (playing) a.pause(); else a.play().catch(() => setLoadState('unsupported'));
  };
  const fmt = (s) => (!s || Number.isNaN(s) || !Number.isFinite(s)) ? '0:00' : `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
  const resolveDuration = () => {
    const a = audioRef.current;
    if (!a) return;
    if (Number.isFinite(a.duration) && a.duration > 0) { setDuration(a.duration); return; }
    if (durationFixedRef.current) return;
    durationFixedRef.current = true;
    const onSeeked = () => {
      a.removeEventListener('timeupdate', onSeeked);
      a.currentTime = 0;
      if (Number.isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };
    a.addEventListener('timeupdate', onSeeked);
    try { a.currentTime = 1e101; } catch { /* ignore */ }
  };
  const seek = (e) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(duration) || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };
  const bars = useMemo(() => {
    const seed = (src || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return Array.from({ length: 30 }, (_, i) => Math.max(8, Math.min(20 + ((seed * (i + 1) * 7919) % 60), 28)));
  }, [src]);
  const dlExt = /ogg|opus/i.test(blobType) ? 'ogg' : /mpeg|mp3/i.test(blobType) ? 'mp3' : /mp4|aac|m4a/i.test(blobType) ? 'm4a' : 'audio';

  if (loadState === 'error') {
    return (
      <span className="wib-media-note">
        <HugeiconsIcon icon={Mic01Icon} size={14} strokeWidth={2} aria-hidden="true" /> Voice message unavailable
      </span>
    );
  }
  if (loadState === 'unsupported' && blobUrl) {
    return (
      <a className="wib-media-dl" href={blobUrl} download={`voice-note.${dlExt}`}>
        <HugeiconsIcon icon={Download01Icon} size={16} strokeWidth={2} aria-hidden="true" /> Download voice note
      </a>
    );
  }
  return (
    <div className="wib-audio">
      {blobUrl && (
        <audio
          ref={audioRef} src={blobUrl} preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
          onError={() => setLoadState('unsupported')}
          onTimeUpdate={() => {
            const a = audioRef.current;
            if (a && Number.isFinite(a.duration) && a.duration > 0) { setCurrentTime(a.currentTime); setProgress(a.currentTime / a.duration); }
          }}
          onLoadedMetadata={resolveDuration}
          onDurationChange={resolveDuration}
          hidden
        />
      )}
      <button type="button" className="wib-audio-play" onClick={toggle} disabled={loadState !== 'ready'}
        aria-label={playing ? 'Pause voice message' : 'Play voice message'}>
        {loadState === 'loading'
          ? <span className="wib-spin" aria-hidden="true" />
          : playing
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="5,3 19,12 5,21" /></svg>}
      </button>
      <div className="wib-audio-track">
        <div className="wib-audio-bars" onClick={seek} role="presentation">
          {bars.map((h, i) => (
            <span key={i} style={{ height: h }} className={i / bars.length <= progress ? 'is-played' : ''} />
          ))}
        </div>
        <div className="wib-audio-time"><span>{fmt(currentTime)}</span><span>{fmt(duration)}</span></div>
      </div>
    </div>
  );
}

// Fixed-size shimmer box drawn where a photo / video will appear, so the
// bubble keeps its size while the file downloads (no "Loading…" text).
function MediaSkeleton({ kind }) {
  return (
    <span className={`wib-media-sk wib-media-sk--${kind}`} role="status" aria-busy="true">
      <span className="ds-sr-only">{kind === 'video' ? 'Loading video…' : 'Loading photo…'}</span>
      <Skeleton w="100%" h="100%" r={8} />
    </span>
  );
}

function ImageMsg({ src, caption }) {
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState(() => mediaBlobCache.get(src) || null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // A cached blob decodes instantly — mark it loaded without a skeleton frame.
  const imgRef = (el) => { if (el && el.complete && el.naturalWidth > 0 && !loaded) setLoaded(true); };
  useEffect(() => {
    if (!src) return undefined;
    if (mediaBlobCache.has(src)) { setBlobUrl(mediaBlobCache.get(src)); return undefined; }
    let cancelled = false;
    fetchMediaBlob(src).then((u) => { if (!cancelled) setBlobUrl(u); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [src]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (failed) return <div className="wib-media-ph">Photo unavailable</div>;
  if (!blobUrl) return <MediaSkeleton kind="photo" />;
  return (
    <>
      <div>
        {!loaded && <MediaSkeleton kind="photo" />}
        <button type="button" className={`wib-img-btn${loaded ? '' : ' is-loading'}`} onClick={() => setOpen(true)} aria-label="Open photo">
          <img ref={imgRef} src={blobUrl} alt={caption || 'Photo from chat'} className="wib-img"
            onLoad={() => setLoaded(true)} onError={() => setFailed(true)} />
        </button>
        {caption && <div className="wib-media-caption">{caption}</div>}
      </div>
      {open && (
        <div className="wib-lightbox" onClick={() => setOpen(false)} role="dialog" aria-label="Photo">
          <img src={blobUrl} alt={caption || 'Photo from chat'} />
        </div>
      )}
    </>
  );
}

function VideoMsg({ src, caption }) {
  const [blobUrl, setBlobUrl] = useState(() => mediaBlobCache.get(src) || null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!src) return undefined;
    if (mediaBlobCache.has(src)) { setBlobUrl(mediaBlobCache.get(src)); return undefined; }
    let cancelled = false;
    fetchMediaBlob(src).then((u) => { if (!cancelled) setBlobUrl(u); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, [src]);
  if (failed) return <div className="wib-media-ph wib-media-ph--wide">Video expired</div>;
  if (!blobUrl) return <MediaSkeleton kind="video" />;
  return (
    <div className="wib-video">
      <video controls src={blobUrl} />
      {caption && <div className="wib-media-caption">{caption}</div>}
    </div>
  );
}

function DocumentMsg({ src, media }) {
  const filename = media?.caption || media?.filename || 'Document';
  const isPdf = (media?.mime_type || media?.mime || '').includes('pdf') || /\.pdf$/i.test(filename);
  const download = async () => {
    if (!src) return;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { /* ignore */ }
  };
  return (
    <button type="button" className="wib-doc" onClick={download} disabled={!src}>
      <span className={`wib-doc-icon${isPdf ? ' is-pdf' : ''}`}><HugeiconsIcon icon={File01Icon} size={20} strokeWidth={2} aria-hidden="true" /></span>
      <span className="wib-doc-text">
        <span className="wib-doc-name">{filename}</span>
        <span className="wib-doc-sub"><HugeiconsIcon icon={Download01Icon} size={11} strokeWidth={2.5} aria-hidden="true" /> Download {isPdf ? 'PDF' : 'file'}</span>
      </span>
    </button>
  );
}

// COD quick-reply taps arrive as "confirm_cod_<order>" / "reject_cod_<order>".
export function codButtonLabel(body) {
  if (typeof body !== 'string') return null;
  const m = body.trim().match(/^(confirm|reject)_cod_(.+)$/i);
  if (!m) return null;
  const isConfirm = m[1].toLowerCase() === 'confirm';
  return { isConfirm, order: m[2], text: isConfirm ? 'Confirmed delivery address' : 'Reported wrong address' };
}

export function msgPreview(msg) {
  if (!msg) return '';
  if (msg.type === 'audio') return 'Voice message';
  if (msg.type === 'image') return 'Photo';
  if (msg.type === 'video') return 'Video';
  if (msg.type === 'document') return 'Document';
  if (msg.type === 'reaction') return msg.body || '👍';
  if (typeof msg.body === 'string' && msg.body.startsWith('{')) return 'Media';
  const cod = codButtonLabel(msg.body);
  if (cod) return cod.text;
  return msg.body || '';
}

// WhatsApp formatting (*bold*, _italic_, ~strike~) and bare links, rendered as
// React nodes — never as HTML.
const FMT_RE = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s<]+)/g;
function formatLine(line, keyBase) {
  const out = [];
  let last = 0;
  let m;
  FMT_RE.lastIndex = 0;
  while ((m = FMT_RE.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const t = m[0];
    const k = `${keyBase}-${m.index}`;
    if (t.startsWith('http')) out.push(<a key={k} href={t} target="_blank" rel="noopener noreferrer">{t}</a>);
    else if (t[0] === '*') out.push(<strong key={k}>{t.slice(1, -1)}</strong>);
    else if (t[0] === '_') out.push(<em key={k}>{t.slice(1, -1)}</em>);
    else out.push(<s key={k}>{t.slice(1, -1)}</s>);
    last = m.index + t.length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}
export function FormattedText({ text }) {
  const lines = String(text || '').split('\n');
  return (
    <span className="wib-text">
      {lines.map((l, i) => (
        <React.Fragment key={i}>{i > 0 && <br />}{formatLine(l, i)}</React.Fragment>
      ))}
    </span>
  );
}

export function MsgContent({ msg, brandId }) {
  const cod = codButtonLabel(msg.body);
  if (cod) {
    return (
      <span className="wib-cod">
        <span aria-hidden="true">{cod.isConfirm ? '✅' : '✏️'}</span>
        {cod.text}
        {cod.order && <span className="wib-cod-order">· #{cod.order}</span>}
      </span>
    );
  }

  let media = null;
  let type = msg.type;
  if (msg.body) {
    try {
      const parsed = JSON.parse(msg.body);
      if (parsed && typeof parsed === 'object' && parsed.url) {
        media = parsed;
        if (!type || type === 'text') {
          const mime = parsed.mime_type || parsed.mime || '';
          const txt = String(parsed.text || parsed.caption || '').toLowerCase();
          if (mime.startsWith('video') || txt.includes('video')) type = 'video';
          else if (mime.startsWith('audio') || txt.includes('voice') || txt.includes('audio')) type = 'audio';
          else if (mime.startsWith('image') || txt.includes('image') || txt.includes('photo')) type = 'image';
          else if (mime.includes('pdf') || mime.includes('document') || txt.includes('document')) type = 'document';
          else if (/fbsbx|facebook/.test(parsed.url)) type = 'video';
        }
      }
    } catch {
      if (msg.type && msg.type !== 'text') media = { url: msg.body };
    }
  }

  const rawUrl = media?.url || (typeof msg.body === 'string' && msg.body.startsWith('http') ? msg.body : null);
  const src = msg._mediaUrl
    ? (msg._mediaUrl.startsWith('http') ? msg._mediaUrl : `${API_BASE}${msg._mediaUrl}`)
    : (rawUrl ? legacyProxyUrl(rawUrl, brandId) : null);

  if (type === 'audio') {
    return src ? <AudioPlayer src={src} /> : (
      <span className="wib-media-note"><HugeiconsIcon icon={Mic01Icon} size={14} strokeWidth={2} aria-hidden="true" /> Voice message</span>
    );
  }
  if (type === 'image') return src ? <ImageMsg src={src} caption={media?.caption} /> : <span className="wib-media-note">Photo</span>;
  if (type === 'video') return src ? <VideoMsg src={src} caption={media?.caption} /> : <span className="wib-media-note">Video</span>;
  if (type === 'document') return <DocumentMsg src={src} media={media} />;
  if (type === 'reaction') return <span className="wib-reaction">{msg.body || '👍'}</span>;

  const trimmed = String(msg.body || '').trim();
  if (trimmed === '[reaction]') return <span className="wib-reaction">👍</span>;
  if (type === 'unsupported' || /^\[[a-z_]+\]$/i.test(trimmed)) {
    const kind = trimmed === '[unsupported]' || type === 'unsupported'
      ? 'Unsupported message'
      : `${trimmed.replace(/^\[|\]$/g, '').replace(/_/g, ' ')} message`;
    return (
      <span className="wib-media-note">
        <HugeiconsIcon icon={InformationCircleIcon} size={14} strokeWidth={2} aria-hidden="true" />
        {kind.charAt(0).toUpperCase() + kind.slice(1)} · view it in WhatsApp
      </span>
    );
  }
  if (trimmed.startsWith('{')) return <span className="wib-media-note">Media (unavailable)</span>;
  return <FormattedText text={msg.body} />;
}
