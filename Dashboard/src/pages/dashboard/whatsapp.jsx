// When accessed directly, render full dashboard shell
export { default } from './index';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Button } from '../../components/ui';
import Dropdown from '../../components/ui/Dropdown';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandService, whatsappService } from '../../services';
import { inlineHtml } from '../../utils/sanitizeHtml';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  WhatsappIcon, SentIcon, Add01Icon, Copy01Icon, Tick02Icon, RefreshIcon,
  Call02Icon, Message01Icon, File01Icon, ViewIcon, Tag01Icon,
  InformationCircleIcon, DashboardSquare01Icon, Analytics01Icon, FilterIcon,
  CheckmarkCircle02Icon, DeliveryTruck01Icon, DeliveryTruck02Icon, PackageDeliveredIcon,
  ShoppingCartRemove01Icon, CreditCardIcon, StarIcon, ArrowReloadHorizontalIcon, Coins01Icon,
  Mic01Icon, Download01Icon, ArrowLeft01Icon, ArrowTurnBackwardIcon, Clock01Icon,
  ShoppingBag01Icon, FlashIcon, SmileIcon, Attachment01Icon,
} from '@hugeicons/core-free-icons';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IC = {
  wa:      <HugeiconsIcon icon={WhatsappIcon} size={16} strokeWidth={2} />,
  send:    <HugeiconsIcon icon={SentIcon} size={16} strokeWidth={2} />,
  add:     <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />,
  copy:    <HugeiconsIcon icon={Copy01Icon} size={16} strokeWidth={2} />,
  check:   <HugeiconsIcon icon={Tick02Icon} size={16} strokeWidth={2} />,
  refresh: <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={2} />,
  phone:   <HugeiconsIcon icon={Call02Icon} size={16} strokeWidth={2} />,
  msg:     <HugeiconsIcon icon={Message01Icon} size={16} strokeWidth={2} />,
  tpl:     <HugeiconsIcon icon={File01Icon} size={16} strokeWidth={2} />,
  eye:     <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={2} />,
  tag:     <HugeiconsIcon icon={Tag01Icon} size={16} strokeWidth={2} />,
  info:    <HugeiconsIcon icon={InformationCircleIcon} size={16} strokeWidth={2} />,
  dash:    <HugeiconsIcon icon={DashboardSquare01Icon} size={16} strokeWidth={2} />,
  bar:     <HugeiconsIcon icon={Analytics01Icon} size={16} strokeWidth={2} />,
  filter:  <HugeiconsIcon icon={FilterIcon} size={16} strokeWidth={2} />,
};

// ─── Template data ────────────────────────────────────────────────────────────
const TPL_ICONS = {
  order_confirm:    <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} />,
  order_shipped:    <HugeiconsIcon icon={DeliveryTruck01Icon} size={16} strokeWidth={2} />,
  out_for_delivery: <HugeiconsIcon icon={DeliveryTruck02Icon} size={16} strokeWidth={2} />,
  order_delivered:  <HugeiconsIcon icon={PackageDeliveredIcon} size={16} strokeWidth={2} />,
  cart_abandon:     <HugeiconsIcon icon={ShoppingCartRemove01Icon} size={16} strokeWidth={2} />,
  cod_confirm:      <HugeiconsIcon icon={CreditCardIcon} size={16} strokeWidth={2} />,
  review_request:   <HugeiconsIcon icon={StarIcon} size={16} strokeWidth={2} />,
  return_initiated: <HugeiconsIcon icon={ArrowReloadHorizontalIcon} size={16} strokeWidth={2} />,
  refund_update:    <HugeiconsIcon icon={Coins01Icon} size={16} strokeWidth={2} />,
};

const TEMPLATES = {
  order_confirm:    { name:'order_confirmation',     title:'Order Confirmed',    icon:'order_confirm',    category:'UTILITY',   body:'Hi! Your *Cross Coin* order *#{{1}}* has been placed successfully.\n\nItems: {{2}}\nTotal: Rs. {{3}}\nEstimated delivery: {{4}}\n\nThank you for shopping with us!', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  order_shipped:    { name:'order_shipped',          title:'Order Shipped',      icon:'order_shipped',    category:'UTILITY',   body:'Great news! Your *Cross Coin* order *#{{1}}* has been shipped.\n\nAWB Number: {{2}}\nTrack your order: {{3}}\n\nExpect delivery in 2-5 business days.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  out_for_delivery: { name:'order_out_for_delivery', title:'Out for Delivery',   icon:'out_for_delivery', category:'UTILITY',   body:'Your *Cross Coin* order *#{{1}}* is out for delivery today!\n\nCourier: {{2}}\n\nPlease keep your phone handy.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  order_delivered:  { name:'order_delivered',        title:'Order Delivered',    icon:'order_delivered',  category:'UTILITY',   body:'Your *Cross Coin* order *#{{1}}* has been delivered!\n\nWe hope you love your purchase.\n\nHave an issue? Just reply to this message.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  cart_abandon:     { name:'cart_abandoned',         title:'Cart Abandoned',     icon:'cart_abandon',     category:'MARKETING', body:'Hey {{1}}!\n\nYour {{2}} is still waiting in your Cross Coin cart.\n\nUse code {{3}} for an extra 10% OFF!', footer:'Cross Coin - crosscoin.in', btn1:{type:'URL',text:'Complete Purchase',val:'https://crosscoin.in/cart'}, btn2:'' },
  cod_confirm:      { name:'cod_order_confirmation', title:'COD Confirmation',   icon:'cod_confirm',      category:'UTILITY',   body:'Hi! We received your COD order #{{1}} for Rs. {{2}} from Cross Coin.\n\nDelivery to: {{3}}\n\nPlease keep the amount ready.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  review_request:   { name:'review_request',         title:'Review Request',     icon:'review_request',   category:'MARKETING', body:'Hi {{1}}!\n\nWe hope you are loving your {{2}} from Cross Coin.\n\nA quick review takes 30 seconds!\n\n{{3}}', footer:'Cross Coin - Thank You!', btn1:{type:'URL',text:'Write a Review',val:'https://crosscoin.in/review'}, btn2:'' },
  return_initiated: { name:'order_cancelled',        title:'Return / Cancelled', icon:'return_initiated', category:'UTILITY',   body:'Your Cross Coin order #{{1}} has been cancelled.\n\nRefund info: {{2}}\n\nQuestions? Reply to this message.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  refund_update:    { name:'refund_processed',       title:'Refund Processed',   icon:'refund_update',    category:'UTILITY',   body:'Good news! Your refund of Rs. {{2}} for order #{{1}} has been processed.\n\nRefund to: {{3}}\nExpected: 5-7 working days.', footer:'Cross Coin - Happy to Help', btn1:{type:'',text:'',val:''}, btn2:'' },
};

const SIDEBAR_GROUPS = [
  { label:'Order Templates', keys:['order_confirm','order_shipped','out_for_delivery','order_delivered'] },
  { label:'Cart & Recovery',  keys:['cart_abandon','cod_confirm'] },
  { label:'Post-Order',       keys:['review_request','return_initiated','refund_update'] },
];

const SAMPLES = ['CC-20240601-0042','3 items','1,299','BlueDart','BD9812345678','SAVE10','Surat, Gujarat - 395006','https://crosscoin.in/track','CrossCoin Ankle Socks'];
const EMPTY_FORM = { name:'', category:'UTILITY', language:'en', body:'', footer:'', btn1Type:'', btn1Text:'', btn1Val:'', btn2Text:'' };

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#0a0a0a','#3f3f46','#52525b','#6b6b73','#8a8a92','#9a9aa2','#b8b8bf'];
function avatarColor(str) { let h = 0; for (const c of (str||'')) h = (h*31 + c.charCodeAt(0)) & 0xffffffff; return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]; }
function initials(name) { return (name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2); }
function timeAgo(date) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  return new Date(date).toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}
function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });
}
function catLabel(c) { return { MARKETING:'Marketing', UTILITY:'Utility', marketing:'Marketing', utility:'Utility', otp:'OTP/Auth' }[c] || c; }

// The stats API only returns days that actually had outbound messages, so the
// "last 7 days" chart came back with gaps (e.g. 5 bars, unevenly spaced). Build
// a full 7-day window and fill missing days with 0 so it's always a clean,
// evenly-spaced 7-bar chart. Additive — never drops a returned day.
function fillLast7Days(rows) {
  const pad = (n) => String(n).padStart(2, '0');
  const counts = new Map();
  (rows || []).forEach((r) => {
    const key = String(r.day || '').slice(0, 10);
    if (key) counts.set(key, parseInt(r.count) || 0);
  });
  const out = [];
  const seen = new Set();
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    out.push({ day: key, count: counts.get(key) || 0 });
    seen.add(key);
  }
  (rows || []).forEach((r) => {
    const key = String(r.day || '').slice(0, 10);
    if (key && !seen.has(key)) out.push({ day: key, count: parseInt(r.count) || 0 });
  });
  out.sort((a, b) => (a.day < b.day ? -1 : 1));
  return out;
}

// Meta returns rejected_reason as an enum (e.g. INVALID_FORMAT, ABUSIVE_CONTENT).
// Turn it into a human sentence with a hint on how to fix it.
function normalizeRejectReason(reason) {
  if (!reason || reason === 'NONE') return '';
  const MAP = {
    ABUSIVE_CONTENT: 'Content flagged as abusive/spammy. Remove promotional or aggressive wording.',
    INVALID_FORMAT: 'Formatting invalid — check variables ({{1}}), no trailing spaces, and matched braces.',
    SCAM: 'Flagged as potential scam. Avoid urgency/payment-bait language.',
    PROMOTIONAL: 'Too promotional for its category. Move to MARKETING or soften the copy.',
    TAG_CONTENT_MISMATCH: 'Copy does not match the chosen category (Utility vs Marketing).',
    INCORRECT_CATEGORY: 'Wrong category — Meta expects a different one for this content.',
    NONE: '',
  };
  return MAP[reason] || reason.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());
}

// ─── WhatsApp 3-dot loader ────────────────────────────────────────────────────
// Monochrome, theme-aware typing-style loader used across the WhatsApp page
// instead of the storefront's purple spinner.
function WaLoad({ label }) {
  return (
    <div className="wa-loader" role="status" aria-label={label || 'Loading'}>
      <span /><span /><span />
    </div>
  );
}

// ─── Phone Preview ────────────────────────────────────────────────────────────
function PhonePreview({ tpl }) {
  if (!tpl) return (
    <div className="was-pp-empty">
      <div style={{ width:40, height:40, color:'var(--ds-color-text-faint)' }}>{IC.tpl}</div>
      <p>Select a template to preview</p>
    </div>
  );
  const html = (tpl.body||'')
    .replace(/\{\{(\d+)\}\}/g, (_, n) => `<strong style="color:#0e241d">${SAMPLES[n-1]||`{{${n}}}`}</strong>`)
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  return (
    <div className="was-phone-shell">
      <div className="was-phone-notch" />
      <div className="was-phone-screen">
        <div className="was-ph-sb"><span>9:41</span></div>
        <div className="was-ph-hd">
          <div className="was-ph-av">CC</div>
          <div><div className="was-ph-name">CrossCoin</div><div className="was-ph-status">Business Account</div></div>
        </div>
        <div className="was-ph-msgs">
          <div className="was-ph-bubble">
            <div className="was-ph-btext" {...inlineHtml(html)} />
            {tpl.footer && <div className="was-ph-bfooter">{tpl.footer}</div>}
            <div className="was-ph-bmeta"><span>Just now</span><span style={{color:'#8a95a3'}}>✓✓</span></div>
          </div>
          {tpl.btn1?.text && <div className="was-ph-btn">{tpl.btn1.text}</div>}
        </div>
        <div className="was-ph-input"><span>Message</span></div>
      </div>
    </div>
  );
}

// ─── Message Content Renderer ─────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

// Module-level cache: proxyUrl → blobUrl
// Persists across re-renders and polling so media never disappears
const mediaBlobCache = new Map();

async function fetchMediaBlob(src) {
  if (mediaBlobCache.has(src)) return mediaBlobCache.get(src);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  mediaBlobCache.set(src, url);
  return url;
}

function getProxyUrl(mediaId, brandId = 1) {
  if (!mediaId) return null;
  // brandId 0 = "All Brands" filter — media auth needs a real brand; the backend
  // falls back to the shared account, so send 1 rather than 0.
  if (!brandId) brandId = 1;
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
  // Always proxy through backend — whether it's a media ID or a full Facebook URL
  // The backend media proxy handles both cases
  const encoded = encodeURIComponent(mediaId);
  return `${API_BASE}/api/whatsapp/media/${encoded}?brandId=${brandId}&token=${encodeURIComponent(token)}`;
}

// WhatsApp-style audio player — fetches as blob so the auth token works, plays
// inline. WhatsApp voice notes are audio/ogg;codecs=opus, which has two quirks:
//   1) Chrome/Firefox report duration = Infinity until you seek to the end
//      (the "seek-to-end" trick below forces a real duration + working seekbar).
//   2) Safari/iOS can't decode opus at all — we detect that and fall back to a
//      download link so the note is never a silent dead end.
function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadState, setLoadState] = useState('loading'); // loading | ready | error | unsupported
  const [blobType, setBlobType] = useState('');

  const blobUrlRef = useRef(null);
  const durationFixedRef = useRef(false);

  useEffect(() => {
    if (!src) return;
    setLoadState('loading');
    setBlobUrl(null);
    durationFixedRef.current = false;
    let cancelled = false;
    fetch(src)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.blob(); })
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobType(blob.type || '');
        setBlobUrl(url);
        // Can this browser actually decode the audio? (Safari/iOS can't do opus.)
        let playable = true;
        if (blob.type && typeof document !== 'undefined') {
          const probe = document.createElement('audio');
          playable = probe.canPlayType(blob.type) !== '';
        }
        setLoadState(playable ? 'ready' : 'unsupported');
      })
      .catch(() => { if (!cancelled) setLoadState('error'); });
    return () => {
      cancelled = true;
      // Don't revoke here — let the audio keep playing if it started
    };
  }, [src]);

  // Revoke only on unmount
  useEffect(() => {
    return () => { if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current); };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a || loadState !== 'ready') return;
    playing ? a.pause() : a.play().catch(() => setLoadState('unsupported'));
  };

  const fmt = s => (!s || isNaN(s) || !isFinite(s)) ? '0:00' : `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;

  // Opus-in-ogg often reports duration=Infinity in Chromium. Seeking to a huge
  // time forces the browser to scan the file and compute the true duration,
  // then we snap back to 0. Runs once per clip.
  const resolveDuration = () => {
    const a = audioRef.current;
    if (!a) return;
    if (isFinite(a.duration) && a.duration > 0) { setDuration(a.duration); return; }
    if (durationFixedRef.current) return;
    durationFixedRef.current = true;
    const onSeeked = () => {
      a.removeEventListener('timeupdate', onSeeked);
      a.currentTime = 0;
      if (isFinite(a.duration) && a.duration > 0) setDuration(a.duration);
    };
    a.addEventListener('timeupdate', onSeeked);
    try { a.currentTime = 1e101; } catch { /* ignore */ }
  };

  const seek = e => {
    const a = audioRef.current;
    if (!a || !isFinite(duration) || duration <= 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const bars = useMemo(() => {
    const seed = (src||'').split('').reduce((a,c) => a + c.charCodeAt(0), 0);
    return Array.from({length:30}, (_,i) => Math.max(8, Math.min(20 + ((seed*(i+1)*7919)%60), 28)));
  }, [src]);

  const dlExt = /ogg|opus/i.test(blobType) ? 'ogg' : /mpeg|mp3/i.test(blobType) ? 'mp3' : /mp4|aac|m4a/i.test(blobType) ? 'm4a' : 'audio';

  if (loadState === 'error') return (
    <div style={{fontSize:12, color:'#9ca3af', fontStyle:'italic', display:'flex', alignItems:'center', gap:6}}>
      <HugeiconsIcon icon={Mic01Icon} size={14} strokeWidth={2} />
      Voice message unavailable
    </div>
  );

  // Browser can't decode this codec (Safari/iOS + opus) — offer a download so
  // the note can be opened in an app that supports it.
  if (loadState === 'unsupported' && blobUrl) return (
    <a href={blobUrl} download={`voice-note.${dlExt}`}
       style={{display:'inline-flex', alignItems:'center', gap:8, fontSize:12, color:'var(--ds-color-text-muted)', textDecoration:'none',
               background:'#f0f1f3', border:'1px solid #d7d9dd', borderRadius:8, padding:'8px 12px'}}>
      <HugeiconsIcon icon={Download01Icon} size={16} strokeWidth={2} />
      Download voice note
    </a>
  );

  return (
    <div style={{display:'flex', alignItems:'center', gap:8, minWidth:220, maxWidth:280}}>
      {blobUrl && (
        <audio ref={audioRef} src={blobUrl} preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
          onError={() => setLoadState('unsupported')}
          onTimeUpdate={() => { const a = audioRef.current; if (a && isFinite(a.duration) && a.duration > 0) { setCurrentTime(a.currentTime); setProgress(a.currentTime/a.duration); } }}
          onLoadedMetadata={resolveDuration}
          onDurationChange={resolveDuration}
          style={{display:'none'}}
        />
      )}
      <button onClick={toggle} disabled={loadState !== 'ready'} style={{
        width:36, height:36, borderRadius:'50%', border:'none',
        cursor: loadState === 'ready' ? 'pointer' : 'wait',
        background:'#0d1117', display:'flex', alignItems:'center', justifyContent:'center',
        flexShrink:0, boxShadow:'0 1px 3px rgba(0,0,0,0.2)', opacity: loadState === 'loading' ? 0.6 : 1,
      }}>
        {loadState === 'loading'
          ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><circle cx="12" cy="12" r="9" strokeDasharray="28" strokeDashoffset="10"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/></circle></svg>
          : playing
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><polygon points="5,3 19,12 5,21"/></svg>
        }
      </button>
      <div style={{flex:1, display:'flex', flexDirection:'column', gap:4}}>
        <div onClick={seek} style={{display:'flex', alignItems:'center', gap:1.5, height:28, cursor:'pointer'}}>
          {bars.map((h,i) => (
            <div key={i} style={{width:3, height:h, borderRadius:2, flexShrink:0, background: i/bars.length <= progress ? '#0d1117' : '#d1d5db', transition:'background 0.1s'}}/>
          ))}
        </div>
        <div style={{fontSize:10, color:'#9ca3af', display:'flex', justifyContent:'space-between'}}>
          <span>{fmt(currentTime)}</span>
          <span>{fmt(duration)}</span>
        </div>
      </div>
    </div>
  );
}
// Lightbox for images — fetches as blob to handle auth
function ImageMsg({ src, caption }) {
  const [open, setOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);

  useEffect(() => {
    if (!src) return;
    if (mediaBlobCache.has(src)) { setBlobUrl(mediaBlobCache.get(src)); return; }
    let cancelled = false;
    fetchMediaBlob(src)
      .then(url => { if (!cancelled) setBlobUrl(url); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [src]);

  if (!blobUrl) return <div style={{width:120,height:80,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af',fontSize:11}}>Loading...</div>;

  return (
    <>
      <div>
        <img
          src={blobUrl}
          alt={caption || 'image'}
          onClick={() => setOpen(true)}
          style={{ maxWidth:220, maxHeight:220, borderRadius:8, display:'block', cursor:'zoom-in', objectFit:'cover' }}
          onError={e => { e.target.style.display='none'; }}
        />
        {caption && <div style={{ fontSize:12, marginTop:4, color:'var(--ds-color-text-muted)' }}>{caption}</div>}
      </div>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', zIndex:9999,
            display:'flex', alignItems:'center', justifyContent:'center', cursor:'zoom-out'
          }}
        >
          <img src={blobUrl} alt={caption || 'image'} style={{ maxWidth:'90vw', maxHeight:'90vh', borderRadius:8, objectFit:'contain' }} />
        </div>
      )}
    </>
  );
}

function VideoMsg({ src, caption }) {
  const [blobUrl, setBlobUrl] = useState(() => mediaBlobCache.get(src) || null);
  const [loadState, setLoadState] = useState(() => mediaBlobCache.has(src) ? 'ready' : 'loading');
  const blobRef = useRef(null);

  useEffect(() => {
    if (!src) return;
    if (mediaBlobCache.has(src)) { setBlobUrl(mediaBlobCache.get(src)); setLoadState('ready'); return; }
    let cancelled = false;
    setLoadState('loading');
    fetchMediaBlob(src)
      .then(url => { if (!cancelled) { blobRef.current = url; setBlobUrl(url); setLoadState('ready'); } })
      .catch(() => { if (!cancelled) setLoadState('error'); });
    return () => { cancelled = true; };
  }, [src]);

  if (!blobUrl) return (
    <div style={{width:220,height:80,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af',fontSize:12,gap:6}}>
      {loadState === 'error'
        ? <><span>🎥</span> Video expired</>
        : <><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⏳</span> Loading...</>
      }
    </div>
  );

  return (
    <div style={{width:220}}>
      <video controls style={{width:'100%', maxHeight:160, borderRadius:8, display:'block', background:'#000', objectFit:'contain'}} src={blobUrl}/>
      {caption && <div style={{fontSize:12,marginTop:4,color:'var(--ds-color-text-muted)'}}>{caption}</div>}
    </div>
  );
}

// Curated quick-emoji set for the composer picker (no external library — keeps
// the bundle lean and CSP-safe). Ordered by how often support agents reach for them.
const QUICK_EMOJIS = [
  '😊','🙏','👍','🙌','🎉','❤️','😍','🔥','✅','💯',
  '😀','😄','😅','😉','😎','🤝','👏','💪','🙂','😇',
  '🛍️','📦','🚚','💳','🎁','⭐','🏷️','📸','⏰','📍',
  '😢','😔','😟','🙇','🤗','💚','✨','👋','☑️','❗',
];

function msgPreview(msg) {
  if (!msg) return '';
  if (msg.type === 'audio') return 'Voice message';
  if (msg.type === 'image') return 'Photo';
  if (msg.type === 'video') return 'Video';
  if (msg.type === 'document') return 'Document';
  if (msg.type === 'reaction') return msg.body || '👍';
  if (msg.body?.startsWith('{')) return 'Media';
  return msg.body || '';
}

function MsgContent({ msg, brandId = 1 }) {
  // Try to parse JSON body (media messages store metadata as JSON)
  let media = null;
  let effectiveType = msg.type;

  if (msg.body) {
    try {
      const parsed = JSON.parse(msg.body);
      if (parsed && typeof parsed === 'object' && parsed.url) {
        media = parsed;
        // If type is 'text' but body is JSON media, detect real type from mime or text field
        if (msg.type === 'text' || msg.type === '' || !msg.type) {
          const mime = parsed.mime_type || parsed.mime || '';
          const txt = (parsed.text || parsed.caption || '').toLowerCase();
          if (mime.startsWith('video') || txt.includes('video')) effectiveType = 'video';
          else if (mime.startsWith('audio') || txt.includes('voice') || txt.includes('audio')) effectiveType = 'audio';
          else if (mime.startsWith('image') || txt.includes('image') || txt.includes('photo')) effectiveType = 'image';
          else if (mime.includes('pdf') || mime.includes('document') || txt.includes('document')) effectiveType = 'document';
          // Has a Facebook CDN URL but no mime — treat as video (most common)
          else if (parsed.url && (parsed.url.includes('fbsbx') || parsed.url.includes('facebook'))) effectiveType = 'video';
        }      }
    } catch (_) {
      if (msg.type !== 'text') media = { url: msg.body };
    }
  }

  // Resolve the media URL
  const rawUrl = media?.url;
  const effectiveUrl = rawUrl || (msg.body?.startsWith('http') ? msg.body : null);
  const proxyUrl = effectiveUrl ? getProxyUrl(effectiveUrl, brandId) : null;

  if (process.env.NODE_ENV !== 'production') {
    // Debug removed
  }

  if (effectiveType === 'audio') {
    return proxyUrl
      ? <AudioPlayer src={proxyUrl} />
      : (
        <div style={{ display:'flex', alignItems:'center', gap:8, color:'#6b7280', fontSize:13 }}>
          <HugeiconsIcon icon={Mic01Icon} size={16} strokeWidth={2} />
          <span style={{ fontStyle:'italic' }}>🎤 Voice message</span>
        </div>
      );
  }

  if (effectiveType === 'image') {
    return proxyUrl
      ? <ImageMsg src={proxyUrl} caption={media?.caption} />
      : <span style={{ fontSize:13, color:'#6b7280', fontStyle:'italic' }}>📷 Image</span>;
  }

  if (effectiveType === 'video') {
    return proxyUrl
      ? <VideoMsg src={proxyUrl} caption={media?.caption} />
      : <span style={{ fontSize:13, color:'#6b7280', fontStyle:'italic' }}>🎥 Video</span>;
  }

  if (effectiveType === 'reaction') {
    const emoji = msg.body || '👍';
    return <span style={{ fontSize: 32, lineHeight: 1.2 }}>{emoji}</span>;
  }

  if (effectiveType === 'document') {
    const filename = media?.caption || 'Document';
    const isPdf = (media?.mime_type || media?.mime || '').includes('pdf') || filename.endsWith('.pdf');
    const handleDownload = async () => {
      if (!proxyUrl) return;
      try {
        const res = await fetch(proxyUrl);
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch { }
    };
    return (
      <div
        onClick={handleDownload}
        style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', minWidth:200 }}
      >
        <div style={{
          width:44, height:44, borderRadius:10,
          background: isPdf ? '#fef2f2' : '#eff6ff',
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
        }}>
          <HugeiconsIcon icon={File01Icon} size={22} strokeWidth={2} color={isPdf ? '#0a0a0a' : '#6b6b73'} />
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'var(--ds-color-text)', wordBreak:'break-all', marginBottom:2 }}>{filename}</div>
          <div style={{ fontSize:11, color:'#6b7280', display:'flex', alignItems:'center', gap:4 }}>
            <HugeiconsIcon icon={Download01Icon} size={11} strokeWidth={2.5} />
            Download {isPdf ? 'PDF' : 'file'}
          </div>
        </div>
      </div>
    );
  }

  // Default: plain text — but first check if it looks like raw JSON media (old format)
  if (msg.body) {
    const trimmed = msg.body.trim();
    if (trimmed === '[reaction]') {
      return <span style={{ fontSize: 32, lineHeight: 1.2 }}>👍</span>;
    }
    // WhatsApp sends type:"unsupported" (and we store "[unsupported]") when the
    // customer sends a format the Cloud API can't deliver — polls, view-once,
    // newer interactive types, etc. Show a clean note instead of the raw token.
    if (effectiveType === 'unsupported' || /^\[[a-z_]+\]$/i.test(trimmed)) {
      const kind = trimmed === '[unsupported]' || effectiveType === 'unsupported'
        ? 'Unsupported message'
        : trimmed.replace(/^\[|\]$/g, '').replace(/_/g, ' ') + ' message';
      return (
        <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:13, color:'#6b7280', fontStyle:'italic' }}>
          <HugeiconsIcon icon={InformationCircleIcon} size={14} strokeWidth={2} />
          {kind.charAt(0).toUpperCase() + kind.slice(1)} · view it in WhatsApp
        </span>
      );
    }
    if (trimmed.startsWith('{')) {
      // It's JSON that wasn't detected as a known media type — show generic media unavailable
      return <span style={{ fontSize:13, color:'#9ca3af', fontStyle:'italic' }}>📎 Media (unavailable)</span>;
    }
  }
  const formatted = (msg.body || '')
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~(.*?)~/g, '<s>$1</s>')
    .replace(/\n/g, '<br>');
  return <span style={{ fontSize:14, lineHeight:1.5 }} {...inlineHtml(formatted)} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function WhatsAppManager() {
  const [page, setPage] = useState('dashboard');
  const [brands, setBrands] = useState([]);
  // One shared verified number serves every brand, so there is no brand filter.
  // brandId 0 = "all brands" for the inbox; template/stats calls coerce 0 -> the
  // WABA owner (CrossCoin, brand 1) via `brandId || 1`. `brands` is still loaded
  // to label each conversation with its brand chip.
  const [brandId] = useState(0);
  // Stats
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  // Templates
  const [activeKey, setActiveKey] = useState('order_confirm');
  const [tplFilter, setTplFilter] = useState('all');
  const [tplSearch, setTplSearch] = useState('');
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formResponse, setFormResponse] = useState(null);
  const [copied, setCopied] = useState(false);
  // Library
  const [templateList, setTemplateList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  // Persistent seed result (so Meta's rejection reasons stay on screen instead
  // of vanishing with a 1.5s toast).
  const [seedResult, setSeedResult] = useState(null);
  // Template manager (SaaS-style: seed / update one or a selected batch)
  const [defaultTpls, setDefaultTpls] = useState([]);
  const [selectedTpls, setSelectedTpls] = useState(() => new Set());
  const [tplBusy, setTplBusy] = useState(() => new Set()); // template names mid-action
  const [viewTpl, setViewTpl] = useState(null); // template open in the full-view modal
  // Inbox
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, body, direction, type }
  const [rightPanelTab, setRightPanelTab] = useState('customer'); // 'customer' | 'notes'
  // On mobile/tablet (<1200px) the right panel is hidden; this opens it as a
  // slide-over so brand reassignment, notes and stats stay reachable there too.
  const [showInfo, setShowInfo] = useState(false);
  const [convNote, setConvNote] = useState('');
  const [convLoading, setConvLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('open');
  const [convSearch, setConvSearch] = useState('');
  // Test
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [syncCatalogLoading, setSyncCatalogLoading] = useState(false);
  // Canned Responses
  const [cannedResponses, setCannedResponses] = useState([]);
  const [cannedLoading, setCannedLoading] = useState(false);
  const [cannedForm, setCannedForm] = useState({ shortcut: '', title: '', body: '' });
  const [cannedEditId, setCannedEditId] = useState(null);
  const [cannedModal, setCannedModal] = useState(false);
  // Broadcasts
  const [broadcasts, setBroadcasts] = useState([]);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastForm, setBroadcastForm] = useState({ name: '', templateName: '', audienceFilter: '' });
  const [broadcastModal, setBroadcastModal] = useState(false);
  const [broadcastRunning, setBroadcastRunning] = useState(null);
  // SLA Analytics
  const [slaStats, setSlaStats] = useState(null);
  const [slaLoading, setSlaLoading] = useState(false);
  // Product / Catalogue send
  const [productModal, setProductModal] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productList, setProductList] = useState([]);
  const [productBrand, setProductBrand] = useState(1); // brand whose products we browse/send
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [sendingProduct, setSendingProduct] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [productSearchAbort, setProductSearchAbort] = useState(null);

  const [hasMoreMsgs, setHasMoreMsgs] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);
  // Mirror activeConv so the long-poll stream loop always sees the latest one
  // without restarting the loop on every conversation switch.
  const activeConvRef = useRef(null);
  useEffect(() => { activeConvRef.current = activeConv; }, [activeConv]);
  // Per-conversation message cache — reopening a chat shows instantly while we
  // refresh in the background, so the spinner only appears on a true first load.
  const messagesCacheRef = useRef(new Map());

  // Merge messages by id (keeps optimistic + server copies from duplicating,
  // avoids the wholesale-replace flicker), sorted chronologically.
  const mergeMessages = (existing, incoming) => {
    const byId = new Map();
    for (const m of existing) byId.set(m.id, m);
    for (const m of incoming) byId.set(m.id, { ...byId.get(m.id), ...m });
    return Array.from(byId.values()).sort((a, b) => (a.id || 0) - (b.id || 0));
  };

  useEffect(() => {
    brandService.getAllBrands(true).then(r => { if (r.success) setBrands(r.data); }).catch(() => {});
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await whatsappService.getStats(brandId || 1);
      if (data.success) setStats(data.stats);
      else setStats(null);
    } catch (err) {
      setStats(null);
    }
    setStatsLoading(false);
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fetchTemplates = async () => {
    setListLoading(true);
    try {
      const data = await whatsappService.listTemplates(brandId || 1);
      if (data.success) setTemplateList(data.templates || []);
      else setTemplateList([]);
    } catch (err) {
      setTemplateList([]);
    }
    setListLoading(false);
  };

  const seedTemplates = async () => {
    setSeedLoading(true);
    setSeedResult(null);
    try {
      const data = await whatsappService.seedTemplates(brandId || 1);
      if (data.success) {
        const { created = 0, skipped = 0, failed = 0 } = data.summary || {};
        // Keep Meta's actual per-template rejection reasons visible on the page.
        const errors = (data.results || [])
          .filter(r => r.status === 'error')
          .map(r => ({ name: r.name, error: r.error || 'Unknown error' }));
        setSeedResult({ created, skipped, failed, errors });
        if (failed > 0) showError('loadingFailed', `${failed} template(s) failed — see details below`);
        else showSuccess('templateCreated', `Created: ${created} · Skipped: ${skipped}`);
        fetchTemplates();
      } else {
        setSeedResult({ created:0, skipped:0, failed:0, errors:[{ name:'Request failed', error: data.message || 'Failed to seed templates' }] });
        showError('loadingFailed', data.message || 'Failed to seed templates');
      }
    } catch (e) {
      const msg = e?.response?.data?.message || e.message || 'Failed to seed templates';
      setSeedResult({ created:0, skipped:0, failed:0, errors:[{ name:'Request failed', error: msg }] });
      showError('loadingFailed', msg);
    }
    setSeedLoading(false);
  };

  // Canonical default template definitions (for the manager cards).
  const fetchDefaultTemplates = async () => {
    try {
      const data = await whatsappService.listDefaultTemplates(brandId || 1);
      setDefaultTpls(data.success ? (data.defaults || []) : []);
    } catch { setDefaultTpls([]); }
  };

  const markBusy = (names, on) => setTplBusy(prev => {
    const s = new Set(prev);
    names.forEach(n => on ? s.add(n) : s.delete(n));
    return s;
  });

  // Seed one template or a selected batch (never forces all-at-once).
  const seedNames = async (names) => {
    const arr = (Array.isArray(names) ? names : [names]).filter(Boolean);
    if (!arr.length) return;
    markBusy(arr, true);
    try {
      const data = await whatsappService.seedTemplates(brandId || 1, arr);
      if (data.success) {
        const { created = 0, skipped = 0, failed = 0 } = data.summary || {};
        const errs = (data.results || []).filter(r => r.status === 'error');
        if (failed > 0 && errs.length) {
          // Show Meta's actual rejection so it's clear WHY nothing was created.
          showError('loadingFailed', `Meta rejected ${failed}: ${errs.map(e => `${e.name} — ${e.error}`).join(' | ')}`);
        } else if (skipped > 0 && created === 0) {
          showError('loadingFailed', `Already exist on Meta (${skipped}) — nothing new created. Use "Re-submit" to push changed copy.`);
        } else {
          showSuccess('templateCreated', `Created ${created} · Already existed ${skipped} · Failed ${failed}`);
        }
        setSelectedTpls(new Set());
        fetchTemplates();
      } else showError('loadingFailed', data.message || 'Failed to seed');
    } catch (e) { showError('loadingFailed', e?.response?.data?.message || e.message || 'Failed to seed'); }
    markBusy(arr, false);
  };

  // Re-submit one/selected templates to Meta (delete + recreate → PENDING).
  const updateNames = async (names) => {
    const arr = (Array.isArray(names) ? names : [names]).filter(Boolean);
    if (!arr.length) return;
    if (!window.confirm(`Re-submit ${arr.length} template${arr.length>1?'s':''} to Meta for approval? The current version is replaced and re-enters review (usually approved within minutes).`)) return;
    markBusy(arr, true);
    try {
      const data = await whatsappService.syncAllTemplates(brandId || 1, arr);
      if (data.success) {
        const { updated = 0, failed = 0 } = data.summary || {};
        const errs = (data.results || []).filter(r => r.status === 'error');
        if (failed > 0 && errs.length) {
          showError('updateFailed', `Meta rejected ${failed}: ${errs.map(e => `${e.name} — ${e.error}`).join(' | ')}`);
        } else {
          showSuccess('saved', `Re-submitted ${updated} for approval · Failed ${failed}`);
        }
        setSelectedTpls(new Set());
        fetchTemplates();
      } else showError('updateFailed', data.message || 'Failed to update');
    } catch (e) { showError('updateFailed', e?.response?.data?.message || e.message || 'Failed to update'); }
    markBusy(arr, false);
  };

  const deleteOneTpl = async (name) => {
    if (!window.confirm(`Delete template "${name}" from Meta? You can seed it again afterwards.`)) return;
    markBusy([name], true);
    try {
      await whatsappService.deleteTemplate(name, brandId || 1);
      showSuccess('deleted', `Deleted "${name}"`);
      fetchTemplates();
    } catch (e) { showError('deleteFailed', e.message || 'Failed to delete'); }
    markBusy([name], false);
  };

  const toggleTplSelect = (name) => setSelectedTpls(prev => {
    const s = new Set(prev); s.has(name) ? s.delete(name) : s.add(name); return s;
  });

  const syncProductsCatalog = async () => {
    setSyncCatalogLoading(true);
    try {
      const data = await whatsappService.syncProductsCatalog(brandId || 1);
      if (data.success) {
        const { synced, skipped, errors } = data;
        if (errors.length > 0) {
          showError('syncFailed', `Synced: ${synced} · Skipped: ${skipped} · Failed: ${errors.length}`);
        } else {
          showSuccess('synced', `Synced: ${synced} · Skipped: ${skipped}`);
        }
      } else {
        showError('syncFailed', data.message || 'Failed to sync products');
      }
    } catch (e) { showError('syncFailed', e.message || 'Failed to sync products to WhatsApp catalog'); }
    setSyncCatalogLoading(false);
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showError('fieldRequired', 'Template name is required'); return; }
    if (!form.body.trim()) { showError('fieldRequired', 'Template body is required'); return; }
    if (form.body.length < 20) { showError('fieldRequired', 'Template body must be at least 20 characters'); return; }
    setFormLoading(true); setFormResponse(null);
    try {
      const components = [{ type:'BODY', text: form.body }];
      if (form.footer) components.push({ type:'FOOTER', text: form.footer });
      const buttons = [];
      if (form.btn1Type && form.btn1Text) {
        const b = { type: form.btn1Type, text: form.btn1Text };
        if (form.btn1Type === 'URL') {
          if (!form.btn1Val || !form.btn1Val.startsWith('http')) {
            setFormResponse({ type:'error', text: 'Button URL must be a valid link starting with http://' });
            setFormLoading(false);
            return;
          }
          b.url = form.btn1Val;
        }
        if (form.btn1Type === 'PHONE_NUMBER') {
          if (!form.btn1Val || form.btn1Val.replace(/\D/g,'').length < 10) {
            setFormResponse({ type:'error', text: 'Phone number must be valid (10+ digits)' });
            setFormLoading(false);
            return;
          }
          b.phone_number = form.btn1Val;
        }
        buttons.push(b);
      }
      if (form.btn2Text) buttons.push({ type:'QUICK_REPLY', text: form.btn2Text });
      if (buttons.length) components.push({ type:'BUTTONS', buttons });
      const data = await whatsappService.createTemplate({
        brandId: brandId || 1, name: form.name, category: form.category, language: form.language, components
      });
      if (data.success) { showSuccess('templateCreated', 'Template submitted. Approval takes 5 min - a few hours'); setCreateModal(false); fetchTemplates(); }
      else setFormResponse({ type:'error', text: data.message || JSON.stringify(data) });
    } catch (err) { setFormResponse({ type:'error', text: err.message || 'Failed to create template' }); }
    setFormLoading(false);
  };

  const copyJSON = () => {
    const t = TEMPLATES[activeKey]; if (!t) return;
    navigator.clipboard.writeText(JSON.stringify({ name:t.name, category:t.category, language:'en' }, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  const fetchConversations = async () => {
    setConvLoading(true);
    try {
      const data = await whatsappService.getConversations(brandId, statusFilter);
      if (data.success) setConversations(data.conversations || []);
      else setConversations([]);
    } catch (err) {
      setConversations([]);
    }
    setConvLoading(false);
  };

  // Warm the message cache in the background (on hover) so opening the chat is
  // instant — the fetchMessages spinner only shows on a genuine cold open.
  const prefetchingRef = useRef(new Set());
  const prefetchMessages = (conv) => {
    if (!conv || messagesCacheRef.current.has(conv.id) || prefetchingRef.current.has(conv.id)) return;
    prefetchingRef.current.add(conv.id);
    whatsappService.getMessages(conv.id)
      .then(data => { if (data?.success) messagesCacheRef.current.set(conv.id, data.messages || []); })
      .catch(() => {})
      .finally(() => prefetchingRef.current.delete(conv.id));
  };

  const fetchMessages = async (conv) => {
    setActiveConv(conv);
    // Show cached messages instantly if we've opened this chat before; only
    // show the spinner on a genuine first load.
    const cached = messagesCacheRef.current.get(conv.id);
    if (cached) {
      setMessages(cached);
      isNearBottomRef.current = true;
      setMsgLoading(false);
    } else {
      setMessages([]);
      setMsgLoading(true);
    }
    try {
      const data = await whatsappService.getMessages(conv.id);
      if (data.success) {
        const msgs = data.messages || [];
        messagesCacheRef.current.set(conv.id, msgs);
        setMessages(msgs);
        setHasMoreMsgs(!!data.hasMore);
        isNearBottomRef.current = true; // jump to newest on open
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count:0 } : c));
      } else if (!cached) {
        setMessages([]); setHasMoreMsgs(false);
        showError('loadingFailed', 'Failed to load messages');
      }
    } catch (err) {
      if (!cached) {
        setMessages([]); setHasMoreMsgs(false);
        showError('loadingFailed', 'Failed to load messages');
      }
    }
    setMsgLoading(false);
  };

  // "Load older messages" — fetches the page before the oldest loaded message
  // and prepends it (WhatsApp-style history), without disturbing the scroll.
  const loadOlderMessages = async () => {
    if (!activeConv || loadingOlder || !messages.length) return;
    setLoadingOlder(true);
    const oldestId = messages[0]?.id;
    try {
      const data = await whatsappService.getMessages(activeConv.id, oldestId);
      if (data.success) {
        isNearBottomRef.current = false; // keep position when prepending
        setMessages(prev => mergeMessages(data.messages || [], prev));
        setHasMoreMsgs(!!data.hasMore);
      }
    } catch (_) { /* ignore */ }
    setLoadingOlder(false);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !activeConv) return;
    const fullMessage = reply.trim();
    const quotedWaId = replyTo?.wa_message_id || null;
    const quoted = replyTo || null;
    const convId = activeConv.id;
    const tempId = `tmp-${Date.now()}`;

    // Optimistic UX: show the bubble and clear the composer immediately so the
    // send feels instant, instead of the button spinning until Meta responds.
    // We reconcile with the server copy (or mark it failed) when the call ends.
    const optimistic = {
      id: tempId, _optimistic: true, conversation_id: convId,
      direction: 'outbound', type: 'text', body: fullMessage,
      status: 'sending', sent_at: new Date().toISOString(), _quotedMsg: quoted,
    };
    setMessages(prev => [...prev, optimistic]);
    setReply(''); setReplyTo(null); setShowEmoji(false); isNearBottomRef.current = true;
    setSending(true);
    try {
      const data = await whatsappService.sendReply(convId, fullMessage, activeConv?.brand_id || brandId || 1, quotedWaId);
      if (data.success) {
        const savedMsg = { ...data.message, _quotedMsg: quoted };
        setMessages(prev => prev.map(m => m.id === tempId ? savedMsg : m));
      } else {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
        showError('sendFailed', data.message || 'Failed to send message');
      }
    } catch (err) {
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'failed' } : m));
      showError('sendFailed', err?.response?.data?.message || err.message || 'Failed to send message');
    }
    setSending(false);
  };

  const fileInputRef = useRef(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);

  const insertEmoji = (emoji) => {
    setReply(prev => (prev || '') + emoji);
  };

  const sendMediaFile = async (file) => {
    if (!file || !activeConv || uploadingMedia) return;
    // Guard the 25 MB server limit up-front with a friendly message.
    if (file.size > 25 * 1024 * 1024) {
      showError('sendFailed', 'File is larger than 25 MB. Please send a smaller file.');
      return;
    }
    setUploadingMedia(true);
    try {
      const data = await whatsappService.sendMedia(activeConv.id, file, activeConv?.brand_id || brandId || 1, '');
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        isNearBottomRef.current = true;
      } else {
        showError('sendFailed', data.message || 'Failed to send file');
      }
    } catch (err) {
      showError('sendFailed', err?.response?.data?.message || err.message || 'Failed to send file');
    }
    setUploadingMedia(false);
  };

  // NOTE: no window.confirm() here — Chrome suppresses repeat dialogs ("prevent
  // this page from creating more dialogs"), which silently made the button do
  // nothing. Resolve is reversible (Re-open below), so a direct action is safe.
  const resolveConv = async (id) => {
    try {
      const data = await whatsappService.resolveConversation(id, 'resolved');
      if (data && data.success === false) throw new Error(data.message || 'Failed to resolve');
      showSuccess('resolved', 'Conversation marked as resolved');
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConv?.id === id) { setActiveConv(null); setMessages([]); }
    } catch (err) {
      showError('updateFailed', err?.response?.data?.message || err.message || 'Failed to resolve');
    }
  };

  // Move a resolved conversation back to Open.
  const reopenConv = async (id) => {
    try {
      const data = await whatsappService.resolveConversation(id, 'open');
      if (data && data.success === false) throw new Error(data.message || 'Failed to re-open');
      showSuccess('saved', 'Conversation re-opened');
      setActiveConv(prev => prev && prev.id === id ? { ...prev, status: 'open' } : prev);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, status: 'open' } : c)
                                     .filter(c => statusFilter === 'all' || c.status === statusFilter));
    } catch (err) {
      showError('updateFailed', err?.response?.data?.message || err.message || 'Failed to re-open');
    }
  };

  // Manually set the brand shown on a conversation's badge (shared number can't
  // always auto-detect it). Updates the open chat and the list in place.
  const changeConvBrand = async (id, newBrandId) => {
    const brandId = parseInt(newBrandId);
    if (!brandId) return;
    try {
      await whatsappService.setConversationBrand(id, brandId);
      setActiveConv(prev => prev && prev.id === id ? { ...prev, brand_id: brandId } : prev);
      setConversations(prev => prev.map(c => c.id === id ? { ...c, brand_id: brandId } : c));
      showSuccess('saved', 'Brand updated');
    } catch (err) { showError('updateFailed', err.message || 'Failed to update brand'); }
  };

  const saveConvNote = async () => {
    if (!activeConv || !convNote.trim()) return;
    setSavingNote(true);
    try {
      await whatsappService.updateConversationNote(activeConv.id, convNote.trim(), activeConv?.brand_id || brandId || 1);
      showSuccess('saved', 'Note saved successfully');
    } catch (err) { showError('saveFailed', err.message); }
    setSavingNote(false);
  };

  const sendTest = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) { showError('fieldRequired', 'Phone number is required'); return; }
    if (testPhone.replace(/\D/g,'').length < 10) { showError('fieldRequired', 'Phone number must be 10 digits'); return; }
    setTestLoading(true);
    try {
      const data = await whatsappService.testConnection(testPhone, brandId || 1);
      if (data.success) {
        showSuccess('messageSent', 'Test message sent! Check your WhatsApp inbox.');
        setTestPhone('');
      } else {
        showError('sendFailed', data.message || 'Failed to send test message');
      }
    } catch (err) { showError('sendFailed', err.message || 'Failed to send test message'); }
    setTestLoading(false);
  };

  const messagesContainerRef = useRef(null);
  const isNearBottomRef = useRef(true);

  // Track if user is near bottom
  const handleMessagesScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Silent refresh of the open chat — MERGES new messages (no wholesale replace,
  // so a just-sent optimistic reply never flickers). Keeps scroll position.
  const refreshActiveMessages = async (conv) => {
    try {
      const data = await whatsappService.getMessages(conv.id);
      if (data.success) setMessages(prev => mergeMessages(prev, data.messages || []));
    } catch { }
  };

  // Only auto-scroll if user is near bottom and a new message was sent
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  useEffect(() => { if (page === 'inbox') fetchConversations(); }, [page, statusFilter, brandId]);
  useEffect(() => {
    if (page === 'library') { fetchTemplates(); fetchDefaultTemplates(); }
  }, [page, brandId]);
  useEffect(() => { if (page === 'dashboard') fetchStats(); }, [page, brandId]);

  // ── Live inbox + chat via long-poll (WhatsApp-SaaS style) ──────────────────
  // One held request per tab: the server returns the instant a new inbound
  // message arrives (or after ~25s), then we reconnect. Updates the conversation
  // list live, and if the OPEN chat got a new message, merges it in — no 8/10s
  // polling, near-instant, and cPanel-safe (plain HTTP, no WebSocket).
  useEffect(() => {
    if (page !== 'inbox') return;
    let alive = true; let controller = null; let backoff = null;
    const sinceRef = { current: null };
    // Floor between reconnects. The stream is meant to long-poll (~25s), but if
    // the server returns quickly/empty, reconnecting with zero delay turns this
    // into an unthrottled fetch loop that saturates the browser's 6-connection
    // budget and starves every other request (stats, messages, media) — the
    // "WhatsApp loads slowly" symptom. Guarantee a minimum spacing so a fast
    // response can never hot-loop; a genuine long-poll (>floor) reconnects at once.
    const MIN_INTERVAL = 3000;
    const loop = async () => {
      if (!alive) return;
      controller = new AbortController();
      const startedAt = Date.now();
      const reconnect = () => {
        if (!alive) return;
        const wait = Math.max(0, MIN_INTERVAL - (Date.now() - startedAt));
        backoff = setTimeout(() => { if (alive) loop(); }, wait);
      };
      try {
        const data = await whatsappService.streamUpdates(brandId, statusFilter, sinceRef.current, controller.signal);
        if (alive && data?.success) {
          const convs = data.conversations || [];
          sinceRef.current = convs[0]?.last_message_at || data.serverTime || sinceRef.current;
          const open = activeConvRef.current;
          if (open) {
            const updated = convs.find(c => c.id === open.id);
            if (updated && (!open.last_message_at || new Date(updated.last_message_at) > new Date(open.last_message_at))) {
              refreshActiveMessages(open);
              activeConvRef.current = { ...open, last_message_at: updated.last_message_at };
            }
          }
          setConversations(convs);
        }
        reconnect(); // wait out the floor (if any) before reconnecting
      } catch (e) {
        if (!alive) return;
        // Aborted by cleanup (tab/filter/brand change or unmount) — the fresh
        // effect will start its own loop, so don't reconnect here.
        if (e?.name === 'CanceledError' || e?.name === 'AbortError' || e?.code === 'ERR_CANCELED') return;
        backoff = setTimeout(() => { if (alive) loop(); }, 5000); // network error — back off
      }
    };
    loop();
    return () => { alive = false; clearTimeout(backoff); if (controller) { try { controller.abort(); } catch (_) {} } };
  }, [page, brandId, statusFilter]);

  // Fetch canned responses
  const fetchCannedResponses = async () => {
    setCannedLoading(true);
    try {
      const data = await whatsappService.getCannedResponses(brandId || 1);
      if (data.success) setCannedResponses(data.cannedResponses || []);
      else setCannedResponses([]);
    } catch (err) {
      setCannedResponses([]);
    }
    setCannedLoading(false);
  };

  const saveCannedResponse = async (e) => {
    e.preventDefault();
    if (!cannedForm.shortcut?.trim()) { showError('fieldRequired', 'Shortcut is required (e.g., /track)'); return; }
    if (!cannedForm.title?.trim()) { showError('fieldRequired', 'Title is required'); return; }
    if (!cannedForm.body?.trim()) { showError('fieldRequired', 'Message body is required'); return; }
    if (cannedForm.shortcut && !cannedForm.shortcut.startsWith('/')) { showError('fieldRequired', 'Shortcut must start with /'); return; }
    try {
      if (cannedEditId) {
        await whatsappService.updateCannedResponse(cannedEditId, cannedForm);
        showSuccess('updated', 'Canned response updated');
      } else {
        await whatsappService.createCannedResponse({ ...cannedForm, brandId: brandId || 1 });
        showSuccess('saved', 'Canned response created');
      }
      setCannedModal(false);
      setCannedEditId(null);
      setCannedForm({ shortcut: '', title: '', body: '' });
      fetchCannedResponses();
    } catch (err) { showError('saveFailed', err.message); }
  };

  const deleteCannedResponse = async (id) => {
    if (!window.confirm('Delete this canned response? This cannot be undone.')) return;
    try {
      await whatsappService.deleteCannedResponse(id);
      showSuccess('deleted', 'Canned response deleted');
      fetchCannedResponses();
    } catch (err) { showError('deleteFailed', err.message); }
  };

  // Fetch broadcasts
  const fetchBroadcasts = async () => {
    setBroadcastLoading(true);
    try {
      const data = await whatsappService.getBroadcasts(brandId);
      if (data.success) setBroadcasts(data.broadcasts || []);
      else setBroadcasts([]);
    } catch (err) {
      setBroadcasts([]);
    }
    setBroadcastLoading(false);
  };

  const createBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.name?.trim()) { showError('fieldRequired', 'Campaign name is required'); return; }
    if (!broadcastForm.templateName?.trim()) { showError('fieldRequired', 'Template name is required'); return; }
    try {
      await whatsappService.createBroadcast({ ...broadcastForm, brandId });
      showSuccess('broadcastCreated', 'Broadcast campaign created. You can now run it.');
      setBroadcastModal(false);
      setBroadcastForm({ name: '', templateName: '', audienceFilter: '' });
      fetchBroadcasts();
    } catch (err) { showError('saveFailed', err.message || 'Failed to create broadcast'); }
  };

  const runBroadcast = async (id) => {
    if (!window.confirm('Start this broadcast? It will be sent to all opted-in customers.')) return;
    setBroadcastRunning(id);
    try {
      const data = await whatsappService.runBroadcast(id);
      if (data.success) { showSuccess('broadcastStarted', 'Broadcast started. Check status below'); fetchBroadcasts(); }
      else showError('sendFailed', data.message || 'Failed to start broadcast');
    } catch (err) { showError('sendFailed', err.message || 'Failed to start broadcast'); }
    setBroadcastRunning(null);
  };

  // Fetch SLA stats
  const fetchSLAStats = async () => {
    setSlaLoading(true);
    try {
      const data = await whatsappService.getSLAStats(brandId);
      if (data.success) setSlaStats(data.sla);
      else setSlaStats(null);
    } catch (err) {
      setSlaStats(null);
    }
    setSlaLoading(false);
  };

  // Canned response shortcut in reply box. Typing "/" opens a suggestion menu;
  // typing the exact shortcut + space/enter (handled in keydown) also expands it.
  const handleReplyChange = (val) => {
    setReply(val);
  };
  // Auto-grow the composer: start at one line and expand with the message
  // (typed or a picked canned reply) up to the CSS max-height, shrinking back
  // to one line when it's cleared after send. Without this the fixed 2-row box
  // read as a large empty block on mobile.
  const replyRef = useRef(null);
  useEffect(() => {
    const el = replyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [reply]);
  const pickCanned = (c) => {
    setReply(c.body || '');
    setShowEmoji(false);
  };
  const normShortcut = (s) => (s || '').toLowerCase().replace(/^\//, '').trim();

  // Load canned responses in the INBOX too (not just the Canned page) so "/"
  // suggestions actually appear while chatting.
  useEffect(() => { if (page === 'canned' || page === 'inbox') fetchCannedResponses(); }, [page, brandId]);
  useEffect(() => { if (page === 'broadcast') fetchBroadcasts(); }, [page, brandId]);
  useEffect(() => { if (page === 'analytics') { fetchStats(); fetchSLAStats(); } }, [page, brandId]);

  // Resolve the storefront slug for a brand id (for the X-Brand-Name product scope).
  const brandSlugById = (bid) => {
    const b = brands.find(x => x.id === bid);
    return b?.slug || (b?.name ? String(b.name).toLowerCase().replace(/\s+/g, '-') : '');
  };

  // Search products for the send-product modal, scoped to the selected brand.
  const searchProducts = async (q, bid = productBrand) => {
    setProductLoading(true);
    try {
      const { productService } = await import('../../services');
      const data = await productService.getAllProducts(1, 20, q, null, false, brandSlugById(bid));
      setProductList(data?.products || data?.rows || []);
    } catch (err) {
      showError('loadingFailed', 'Failed to load products');
      setProductList([]);
    }
    setProductLoading(false);
  };

  useEffect(() => {
    if (!productModal) return;
    const t = setTimeout(() => searchProducts(productSearch, productBrand), 300);
    return () => clearTimeout(t);
  }, [productSearch, productModal, productBrand]);

  // One unified "Send Products" flow: pick a brand, then 1 product (card) or many.
  const openProductModal = () => {
    const defaultBrand = activeConv?.brand_id || brands[0]?.id || 1;
    setProductBrand(defaultBrand);
    setSelectedProducts([]);
    setProductSearch('');
    setProductList([]);
    setProductModal(true);
    searchProducts('', defaultBrand);
  };

  const toggleProduct = (p) => {
    setSelectedProducts(prev =>
      prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]
    );
  };

  const confirmSendProduct = async () => {
    if (!selectedProducts.length || !activeConv) return;
    // The WhatsApp catalog lives on the shared WABA, so resolve to a real brand
    // (the conversation's, else brand 1) — never 0 ("all brands").
    const sendBrand = productBrand || activeConv?.brand_id || brandId || 1;
    if (selectedProducts.length > 30) {
      showError('sendFailed', 'You can send up to 30 products at once');
      return;
    }
    setSendingProduct(true);
    try {
      // Catalog-free: send each product as a photo + name/price + product link.
      const r = await whatsappService.sendProductLink(activeConv.id, selectedProducts.map(p => p.id), sendBrand);
      if (r && r.success === false) throw new Error(r.message || 'Failed to send products');
      showSuccess('messageSent', selectedProducts.length > 1 ? `${r.sent || selectedProducts.length} products sent` : 'Product sent successfully');
      setProductModal(false);
      fetchMessages(activeConv);
    } catch (err) { showError('sendFailed', err?.response?.data?.message || err.message || 'Failed to send product'); }
    setSendingProduct(false);
  };

  // Seed canned responses
  const seedCannedResponses = async () => {
    try {
      const data = await whatsappService.seedCannedResponses(brandId);
      const { created = 0, updated = 0 } = data.summary || {};
      showSuccess('saved', `Added: ${created} · Refreshed: ${updated}`);
      fetchCannedResponses();
    } catch (err) { showError('loadingFailed', err.message || 'Failed to seed canned responses'); }
  };

  const filteredConvs = conversations.filter(c =>
    !convSearch || (c.customer_name || c.customer_phone || '').toLowerCase().includes(convSearch.toLowerCase())
  );

  // "/shortcut" canned-reply suggestions for the composer.
  const cannedActive = reply.startsWith('/') && !reply.includes('\n');
  const cannedQuery = cannedActive ? normShortcut(reply.slice(1)) : '';
  const cannedMatches = cannedActive
    ? cannedResponses.filter(c =>
        normShortcut(c.shortcut).includes(cannedQuery) ||
        (c.title || '').toLowerCase().includes(cannedQuery)
      ).slice(0, 6)
    : [];
  // brand_id → display name, for the per-conversation brand badge (shared number).
  const brandById = useMemo(() => {
    const m = {};
    for (const b of brands) m[b.id] = b.display_name || b.name;
    return m;
  }, [brands]);
  const brandLabel = (id) => brandById[id] || (id ? `Brand ${id}` : null);
  const unreadCount = stats?.unreadCount ?? conversations.filter(c => c.unread_count > 0).length;

  // live template list filtered for library/templates tabs
  const filteredTpls = templateList.filter(t => {
    const status = (t.status || '').toLowerCase();
    const ms = tplFilter === 'all' || status === tplFilter;
    const mq = !tplSearch || (t.name || '').toLowerCase().includes(tplSearch.toLowerCase());
    return ms && mq;
  });

  // Manager rows: every default template merged with its LIVE Meta status, plus
  // any custom (live-only) templates. Drives the SaaS-style template manager.
  const managerRows = useMemo(() => {
    const liveByName = new Map(templateList.map(t => [t.name, t]));
    const rows = defaultTpls.map(d => {
      const live = liveByName.get(d.name);
      return {
        name: d.name, category: d.category, language: d.language,
        body: d.body, footer: d.footer, buttons: d.buttons || [],
        live, status: live ? (live.status || 'pending').toLowerCase() : 'not_created',
        rejectedReason: live ? normalizeRejectReason(live.rejected_reason) : '',
        isDefault: true,
      };
    });
    const defNames = new Set(defaultTpls.map(d => d.name));
    templateList.forEach(t => {
      if (defNames.has(t.name)) return;
      rows.push({
        name: t.name, category: t.category, language: t.language || 'en',
        body: t.components?.find(c => c.type === 'BODY')?.text || '',
        footer: t.components?.find(c => c.type === 'FOOTER')?.text || '',
        buttons: (t.components?.find(c => c.type === 'BUTTONS')?.buttons || []).map(b => b.text),
        live: t, status: (t.status || 'pending').toLowerCase(),
        rejectedReason: normalizeRejectReason(t.rejected_reason),
        isDefault: false,
      });
    });
    return rows;
  }, [defaultTpls, templateList]);

  const filteredManager = managerRows.filter(r => {
    const ms = tplFilter === 'all' || r.status === tplFilter;
    const mq = !tplSearch || r.name.toLowerCase().includes(tplSearch.toLowerCase());
    return ms && mq;
  });
  const selectableNames = filteredManager.map(r => r.name);
  const allSelected = selectableNames.length > 0 && selectableNames.every(n => selectedTpls.has(n));

  const NAV = [
    { k:'dashboard',  label:'Dashboard',        icon: IC.dash,    section: 'Main' },
    { k:'inbox',      label:'Conversations',     icon: IC.msg,     badge: unreadCount || null },
    { k:'library',    label:'Templates',         icon: IC.tpl,     badge: templateList.length || null, section: 'Messaging' },
    { k:'canned',     label:'Canned Responses',  icon: IC.tag },
    { k:'broadcast',  label:'Broadcast',         icon: IC.send },
    { k:'test',       label:'Test Message',      icon: IC.phone },
    { k:'analytics',  label:'Analytics',         icon: IC.bar,     section: 'Account' },
  ];

  return (
    <div className="was-studio">

      {/* ══ LEFT SIDEBAR ══ */}
      <aside className="was-nav">
        <div className="was-nav-logo">
          <div className="was-nav-logo-icon">{IC.wa}</div>
          <div>
            <div className="was-nav-logo-text">WA Studio</div>
            <div className="was-nav-logo-sub">Business Platform</div>
          </div>
        </div>

        <nav className="was-nav-links">
          {NAV.map(({ k, label, icon, badge, section }) => (
            <div key={k}>
              {section && <div className="was-nav-section">{section}</div>}
              <button className={`was-nav-item${page === k ? ' active' : ''}`} onClick={() => setPage(k)}>
                <span className="was-nav-icon">{icon}</span>
                <span className="was-nav-label">{label}</span>
                {badge ? <span className="was-nav-badge">{badge}</span> : null}
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <div className="was-main">

        {/* ── DASHBOARD ── */}
        {page === 'dashboard' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <h2 className="was-page-title">Dashboard</h2>
                <span className="was-page-sub">CrossCoin  · WhatsApp Overview</span>
                <div style={{display:'flex', gap:8}}>
                  <button className="was-btn-secondary" onClick={seedTemplates} disabled={seedLoading}>
                    <span style={{width:14,height:14,display:'flex'}}>{IC.refresh}</span>
                    {seedLoading ? 'Seeding...' : 'Seed Templates'}
                  </button>
                  <button className="was-btn-secondary" onClick={syncProductsCatalog} disabled={syncCatalogLoading} title="Sync all active products to WhatsApp catalog">
                    <span style={{width:14,height:14,display:'flex'}}>{IC.refresh}</span>
                    {syncCatalogLoading ? 'Syncing...' : 'Sync Products'}
                  </button>
                </div>
              </div>

              {/* Seed result — stays on screen so Meta's rejection reasons are readable */}
              {seedResult && (
                <div style={{
                  margin:'0 0 16px', padding:'12px 14px', borderRadius:10,
                  border:`1px solid ${seedResult.failed > 0 ? '#fecaca' : '#bbf7d0'}`,
                  background: seedResult.failed > 0 ? '#fef2f2' : '#f0fdf4',
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:12}}>
                    <div style={{fontSize:13, fontWeight:600, color:'var(--ds-color-text)'}}>
                      Seed result — Created {seedResult.created} · Already existed {seedResult.skipped} · Failed {seedResult.failed}
                    </div>
                    <button onClick={() => setSeedResult(null)} style={{border:'none', background:'transparent', cursor:'pointer', color:'#6b7280', fontSize:18, lineHeight:1}}>×</button>
                  </div>
                  {seedResult.errors.length > 0 && (
                    <div style={{marginTop:8}}>
                      <div style={{fontSize:12, fontWeight:600, color:'#b91c1c', marginBottom:4}}>Why these failed (from Meta):</div>
                      <ul style={{margin:0, paddingLeft:18, display:'flex', flexDirection:'column', gap:4}}>
                        {seedResult.errors.map((e, i) => (
                          <li key={i} style={{fontSize:12.5, color:'var(--ds-color-text-muted)'}}>
                            <strong style={{color:'var(--ds-color-text)'}}>{e.name}</strong> — {e.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Stats */}
              <div className="was-stats-grid">
                {statsLoading ? <div style={{padding:20}}><WaLoad /></div> : [
                  { label:'Messages Sent',    val: stats ? String(stats.sentMessages) : '—',      change: stats ? `${stats.deliveryRate}% delivery rate` : '',  color:'#0a0a0a', icon: IC.send },
                  { label:'Delivered',        val: stats ? String(stats.deliveredMessages) : '—', change: stats ? `${stats.deliveryRate}% rate` : '',            color:'#6b6b73', icon: IC.check },
                  { label:'Read Rate',        val: stats ? `${stats.readRate}%` : '—',            change: stats ? `${stats.readMessages} messages read` : '',    color:'#6b6b73', icon: IC.eye },
                  { label:'Open Convs',       val: stats ? String(stats.openConversations) : '—', change: stats ? `${stats.unreadCount} need reply` : '',        color:'#6b6b73', icon: IC.msg },
                ].map(s => (
                  <div key={s.label} className="was-stat-card">
                    <div className="was-stat-top">
                      <span className="was-stat-label">{s.label}</span>
                      <span className="was-stat-icon" style={{ background: s.color + '20', color: s.color }}>{s.icon}</span>
                    </div>
                    <div className="was-stat-num">{s.val}</div>
                    <div className="was-stat-change">{s.change}</div>
                  </div>
                ))}
              </div>

              {/* Charts row */}
              <div className="was-dash-row">
                {/* Bar chart */}
                <div className="was-dash-card">
                  <div className="was-dash-card-head">
                    <span className="was-dash-card-title">Messages — Last 7 Days</span>
                  </div>
                  <div className="was-bar-chart">
                    {statsLoading ? <WaLoad /> : (() => {
                      const days = fillLast7Days(stats?.last7Days);
                      const maxVal = Math.max(...days.map(d => parseInt(d.count) || 0), 1);
                      return days.every(d => (parseInt(d.count) || 0) === 0)
                        ? <div style={{color:'#9ca3af',fontSize:13,padding:'20px 0'}}>No data yet</div>
                        : days.map(d => {
                          const val = parseInt(d.count) || 0;
                          const label = new Date(d.day).toLocaleDateString('en-IN', { weekday:'short' });
                          return (
                            <div key={d.day} className="was-bar-col">
                              <span className="was-bar-val">{val >= 1000 ? (val/1000).toFixed(1)+'k' : val}</span>
                              <div className="was-bar" style={{ height: Math.round((val/maxVal)*80) + 'px' }} />
                              <span className="was-bar-lbl">{label}</span>
                            </div>
                          );
                        });
                    })()}
                  </div>
                </div>

                {/* Conversations summary */}
                <div className="was-dash-card">
                  <div className="was-dash-card-head">
                    <span className="was-dash-card-title">Conversations</span>
                    <button className="was-dash-link" onClick={() => setPage('inbox')}>View all</button>
                  </div>
                  <div className="was-activity">
                    {statsLoading ? <WaLoad /> : [
                      { dot:'green', text: <><strong>{stats?.openConversations ?? 0}</strong> open conversations</>, time:'' },
                      { dot:'blue',  text: <><strong>{stats?.resolvedConversations ?? 0}</strong> resolved conversations</>, time:'' },
                      { dot:'amber', text: <><strong>{stats?.unreadCount ?? 0}</strong> unread messages</>, time:'' },
                      { dot:'green', text: <><strong>{stats?.totalMessages ?? 0}</strong> total messages exchanged</>, time:'' },
                    ].map((a, i) => (
                      <div key={i} className="was-act-item">
                        <span className={`was-act-dot was-act-dot--${a.dot}`} />
                        <span className="was-act-text">{a.text}</span>
                        <span className="was-act-time">{a.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Quick cards */}
              <div className="was-quick-row">
                {[
                  { label:'Approved Templates', val: String(templateList.filter(t => (t.status||'').toLowerCase() === 'approved').length), sub:`${templateList.filter(t => (t.status||'').toLowerCase() === 'pending').length} pending  · ${templateList.filter(t => (t.status||'').toLowerCase() === 'rejected').length} rejected`, color:'#0a0a0a', icon: IC.tpl },
                  { label:'Open Conversations', val: String(stats?.openConversations ?? 0), sub:'Live chats', color:'#6b6b73', icon: IC.msg },
                  { label:'Total Messages',     val: String(stats?.totalMessages ?? 0),     sub:`${stats?.sentMessages ?? 0} sent  · ${stats?.deliveredMessages ?? 0} delivered`, color:'#6b6b73', icon: IC.phone },
                ].map(q => (
                  <div key={q.label} className="was-quick-card">
                    <div className="was-quick-icon" style={{ background: q.color + '20', color: q.color }}>{q.icon}</div>
                    <div>
                      <div className="was-quick-label">{q.label}</div>
                      <div className="was-quick-val">{q.val}</div>
                      <div className="was-quick-sub">{q.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}


        {/* ── INBOX ── */}
        {page === 'inbox' && (
          <div className={`was-inbox-wrap${activeConv ? ' has-active' : ''}`}>
            {/* Thread list */}
            <div className="was-thread-list">
              <div className="was-thread-top-bar">
                <input className="was-thread-search" placeholder="Search chats..." value={convSearch} onChange={e => setConvSearch(e.target.value)} />
              </div>
              <div className="was-thread-tabs">
                {['open','resolved','all'].map(s => (
                  <button key={s} className={`was-thread-tab${statusFilter===s?' active':''}`} onClick={() => setStatusFilter(s)}>
                    {s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="was-thread-scroll">
                {convLoading ? <div style={{padding:20,textAlign:'center'}}><WaLoad /></div>
                : filteredConvs.length === 0 ? (
                  <div className="was-empty-state">
                    <div style={{width:36,height:36,color:'var(--ds-color-text-faint)'}}>{IC.msg}</div>
                    <p>No {statusFilter} conversations</p>
                  </div>
                ) : filteredConvs.map(conv => {
                  const col = avatarColor(conv.customer_name||conv.customer_phone);
                  return (
                    <div key={conv.id} className={`was-thread-item${activeConv?.id===conv.id?' active':''}`} onClick={() => fetchMessages(conv)} onMouseEnter={() => prefetchMessages(conv)}>
                      <div className="was-thread-av" style={{background:col}}>{initials(conv.customer_name||conv.customer_phone)}</div>
                      <div className="was-thread-body">
                        <div className="was-thread-row">
                          <span className="was-thread-name">{conv.customer_name||conv.customer_phone}</span>
                          <span className="was-thread-time">{timeAgo(conv.last_message_at)}</span>
                        </div>
                        <div className="was-thread-row">
                          <span className="was-thread-last">{conv.last_message||'No messages yet'}</span>
                          {conv.unread_count > 0 && <span className="was-unread-dot">{conv.unread_count}</span>}
                        </div>
                        {brandLabel(conv.brand_id) && (
                          <div className="was-thread-row">
                            <span className="was-brand-chip">{brandLabel(conv.brand_id)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chat */}
            <div className="was-chat">
              {!activeConv ? (
                <div className="was-chat-empty">
                  <div style={{width:52,height:52,color:'var(--ds-color-text-faint)'}}>{IC.wa}</div>
                  <h3>Select a conversation</h3>
                  <p>Choose a chat from the left to start messaging</p>
                </div>
              ) : (
                <>
                  <div className="was-chat-hd">
                    <button className="was-chat-back" onClick={() => { setActiveConv(null); setMessages([]); setShowInfo(false); }} aria-label="Back to conversations" type="button">
                      <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2.4} />
                    </button>
                    <div className="was-chat-av" style={{background:avatarColor(activeConv.customer_name||activeConv.customer_phone)}}>
                      {initials(activeConv.customer_name||activeConv.customer_phone)}
                    </div>
                    <div style={{flex:1}}>
                      <div className="was-chat-name">{activeConv.customer_name||activeConv.customer_phone}</div>
                      <div className="was-chat-phone">+{activeConv.customer_phone}</div>
                    </div>
                    <button className="was-chat-info-btn" onClick={() => setShowInfo(true)} aria-label="Customer details" type="button">{IC.info}</button>
                    {activeConv.status === 'open' ? (
                      <button className="was-resolve-btn" onClick={() => resolveConv(activeConv.id)}>
                        {IC.check} Resolve
                      </button>
                    ) : (
                      <button className="was-resolve-btn" onClick={() => reopenConv(activeConv.id)}>
                        {IC.refresh} Re-open
                      </button>
                    )}
                  </div>
                  <div className="was-messages" ref={messagesContainerRef} onScroll={handleMessagesScroll}>
                    {!msgLoading && hasMoreMsgs && (
                      <div className="was-load-older">
                        <button type="button" onClick={loadOlderMessages} disabled={loadingOlder}>
                          {loadingOlder ? 'Loading…' : 'Load older messages'}
                        </button>
                      </div>
                    )}
                    {msgLoading ? <div style={{textAlign:'center',padding:20}}><WaLoad /></div>
                    : messages.length === 0 ? <div className="was-no-msgs">No messages yet</div>
                    : (() => {
                        const items = [];
                        let lastDateStr = null;
                        messages.forEach(msg => {
                          const d = new Date(msg.sent_at || msg.createdAt);
                          const today = new Date();
                          const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
                          const isToday = d.toDateString() === today.toDateString();
                          const isYesterday = d.toDateString() === yesterday.toDateString();
                          const dateStr = isToday ? 'Today' : isYesterday ? 'Yesterday'
                            : d.toLocaleDateString('en-IN', { day:'numeric', month:'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
                          if (dateStr !== lastDateStr) {
                            lastDateStr = dateStr;
                            items.push(
                              <div key={`date-${dateStr}`} style={{
                                display:'flex', alignItems:'center', justifyContent:'center',
                                margin:'12px 0 8px',
                              }}>
                                <span style={{
                                  background:'rgba(0,0,0,0.06)', color:'#6b7280',
                                  fontSize:11, fontWeight:600, padding:'3px 12px',
                                  borderRadius:999, letterSpacing:0.3,
                                }}>{dateStr}</span>
                              </div>
                            );
                          }
                          items.push(
                            <div key={msg.id} className={`was-msg was-msg--${msg.direction}`}
                              style={{position:'relative'}}
                              onMouseEnter={e => { const btn = e.currentTarget.querySelector('.was-reply-hover'); if (btn) btn.style.opacity='1'; }}
                              onMouseLeave={e => { const btn = e.currentTarget.querySelector('.was-reply-hover'); if (btn) btn.style.opacity='0'; }}
                            >
                              {/* Reply button on hover */}
                              <button className="was-reply-hover" onClick={() => setReplyTo(msg)} style={{
                                position:'absolute', top:'50%', transform:'translateY(-50%)',
                                [msg.direction === 'outbound' ? 'left' : 'right']: -28,
                                opacity:0, transition:'opacity 0.15s',
                                background:'rgba(0,0,0,0.08)', border:'none', borderRadius:'50%',
                                width:22, height:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center',
                                color:'#6b7280', padding:0,
                              }}>
                                <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={12} strokeWidth={2.5} />
                              </button>
                              <div className="was-msg-bubble">
                                {msg._quotedMsg && (
                                  <div style={{
                                    background: msg.direction === 'outbound' ? 'rgba(11,122,94,0.1)' : 'rgba(0,0,0,0.06)',
                                    borderLeft: '3px solid #0d1117',
                                    borderRadius: '4px 4px 0 0',
                                    padding: '5px 8px',
                                    marginBottom: 6,
                                    fontSize: 12,
                                    color: '#6b7280',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                  }}>
                                    <div style={{color:'var(--ds-color-text-muted)', fontWeight:700, fontSize:11, marginBottom:2}}>
                                      {msg._quotedMsg.direction === 'inbound' ? (activeConv?.customer_name || 'Customer') : 'You'}
                                    </div>
                                    <div style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                      {msgPreview(msg._quotedMsg)}
                                    </div>
                                  </div>
                                )}
                                <MsgContent msg={msg} brandId={activeConv?.brand_id || brandId || 1} />
                              </div>
                              <div className="was-msg-meta">
                                {formatTime(msg.sent_at||msg.createdAt)}
                                {msg.direction==='outbound' && (
                                  <span style={{marginLeft:3}}>
                                    {msg.status === 'sending' ? (
                                      <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} color="#9ca3af" />
                                    ) : msg.status === 'failed' ? (
                                      <span title="Failed to send" style={{color:'#0a0a0a', fontWeight:700, fontSize:12}}>!</span>
                                    ) : msg.status === 'read' ? (
                                      <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                                        <path d="M1 5.5L4.5 9L10 3" stroke="#8a95a3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M6 5.5L9.5 9L15 3" stroke="#8a95a3" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    ) : msg.status === 'delivered' ? (
                                      <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
                                        <path d="M1 5.5L4.5 9L10 3" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                        <path d="M6 5.5L9.5 9L15 3" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    ) : (
                                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4L3.5 6.5L9 1" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                        return items;
                      })()
                    }
                    <div ref={messagesEndRef} />
                  </div>
                  {activeConv.status === 'open' ? (
                    <div className="was-composer">
                      {/* Quick-send tools row */}
                      <div className="was-composer-tools">
                        <button type="button" className="was-tool-chip" onClick={() => openProductModal()} title="Send one or more products">
                          <HugeiconsIcon icon={ShoppingBag01Icon} size={16} strokeWidth={2} />
                          Products
                        </button>
                        <button type="button" className="was-tool-chip" onClick={() => setReply(r => (r || '') + '/')} title="Type /shortcut to insert a saved reply">
                          <HugeiconsIcon icon={FlashIcon} size={16} strokeWidth={2} />
                          Canned
                        </button>
                        <div style={{flex:1}} />
                        <span className="was-composer-hint">Enter to send · Shift+Enter for a new line</span>
                      </div>
                      <form className="was-reply-box" onSubmit={sendReply} style={{position:'relative'}}>
                        {showEmoji && (
                          <div className="was-emoji-pop">
                            <div className="was-emoji-grid">
                              {QUICK_EMOJIS.map((em, i) => (
                                <button type="button" key={i} className="was-emoji-cell" onClick={() => insertEmoji(em)}>{em}</button>
                              ))}
                            </div>
                          </div>
                        )}
                        {cannedActive && cannedMatches.length > 0 && (
                          <div className="was-canned-pop">
                            <div className="was-canned-head">Canned replies</div>
                            {cannedMatches.map(c => (
                              <button type="button" key={c.id} className="was-canned-item" onClick={() => pickCanned(c)}>
                                <span className="was-canned-short">/{normShortcut(c.shortcut)}</span>
                                <span className="was-canned-title">{c.title || ''}</span>
                                <span className="was-canned-body">{c.body}</span>
                              </button>
                            ))}
                          </div>
                        )}
                        {cannedActive && cannedMatches.length === 0 && cannedResponses.length === 0 && (
                          <div className="was-canned-pop">
                            <div className="was-canned-empty">No saved replies yet — add them in <b>Canned Responses</b>.</div>
                          </div>
                        )}
                        {replyTo && (
                          <div style={{
                            position:'absolute', bottom:'100%', left:0, right:0,
                            background:'#f0f1f3', borderTop:'3px solid #0d1117',
                            padding:'8px 12px', display:'flex', alignItems:'center', justifyContent:'space-between',
                            fontSize:12,
                          }}>
                            <div style={{display:'flex', flexDirection:'column', gap:2, minWidth:0}}>
                              <span style={{color:'var(--ds-color-text-muted)', fontWeight:700, fontSize:11}}>
                                {replyTo.direction === 'inbound' ? 'Customer' : 'You'}
                              </span>
                              <span style={{color:'#6b7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300}}>
                                {msgPreview(replyTo)}
                              </span>
                            </div>
                            <button type="button" onClick={() => setReplyTo(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:16,padding:'0 4px',flexShrink:0}}>×</button>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                          style={{ display:'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) sendMediaFile(f); e.target.value=''; }}
                        />
                        <button type="button" className={`was-attach-btn${showEmoji?' active':''}`} title="Emoji"
                          onClick={() => setShowEmoji(s => !s)}>
                          <HugeiconsIcon icon={SmileIcon} size={16} strokeWidth={2} />
                        </button>
                        <button type="button" className="was-attach-btn" title="Attach a photo, video or document"
                          onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia}>
                          {uploadingMedia ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="was-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                          ) : (
                            <HugeiconsIcon icon={Attachment01Icon} size={16} strokeWidth={2} />
                          )}
                        </button>
                        <textarea ref={replyRef} className="was-reply-input" placeholder="Type a message…" value={reply}
                          onChange={e => handleReplyChange(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Escape' && cannedActive) { e.preventDefault(); setReply(''); return; }
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              // If the "/" menu is open, Enter inserts the top match instead of sending.
                              if (cannedActive && cannedMatches.length > 0) { pickCanned(cannedMatches[0]); return; }
                              sendReply(e);
                            }
                          }}
                          rows={1} />
                        <button type="submit" className="was-send-btn" disabled={sending||!reply.trim()}>{IC.send}</button>
                      </form>
                    </div>
                  ) : (
                    <div className="was-resolved-bar">This conversation is resolved</div>
                  )}
                </>
              )}
            </div>

            {/* ── RIGHT PANEL ── */}
            {activeConv && showInfo && <div className="was-rp-backdrop" onClick={() => setShowInfo(false)} />}
            {activeConv && (
              <div className={`was-right-panel${showInfo ? ' was-right-panel--open' : ''}`}>
                <button className="was-rp-close" onClick={() => setShowInfo(false)} aria-label="Close details" type="button">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </button>
                <div className="was-rp-tabs">
                  {['customer','notes'].map(t => (
                    <button key={t} className={`was-rp-tab${rightPanelTab===t?' active':''}`} onClick={() => setRightPanelTab(t)}>
                      {t.charAt(0).toUpperCase()+t.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="was-rp-body">
                  {rightPanelTab === 'customer' && (
                    <>
                      {/* Stats strip */}
                      <div className="was-rp-stats">
                        <div className="was-rp-stat"><div className="was-rp-stat-num">{activeConv.unread_count||0}</div><div className="was-rp-stat-lbl">Unread</div></div>
                        <div className="was-rp-stat"><div className="was-rp-stat-num">{activeConv.status==='open'?'Open':'Done'}</div><div className="was-rp-stat-lbl">Status</div></div>
                        <div className="was-rp-stat"><div className="was-rp-stat-num">{messages.length}</div><div className="was-rp-stat-lbl">Messages</div></div>
                      </div>
                      {/* Contact info */}
                      <div className="was-rp-section">
                        <div className="was-rp-section-title">Contact</div>
                        <div className="was-rp-row">
                          <span className="was-rp-label">Brand</span>
                          <span className="was-rp-value">
                            <select
                              value={activeConv.brand_id || ''}
                              onChange={e => changeConvBrand(activeConv.id, e.target.value)}
                              style={{ border:'1px solid #d1d5db', borderRadius:6, padding:'3px 8px', fontSize:13, background:'#fff', cursor:'pointer', maxWidth:150 }}
                              title="Set the brand for this conversation"
                            >
                              {!activeConv.brand_id && <option value="">Select brand…</option>}
                              {brands.map(b => (
                                <option key={b.id} value={b.id}>{b.display_name || b.name}</option>
                              ))}
                            </select>
                          </span>
                        </div>
                        <div className="was-rp-row"><span className="was-rp-label">Name</span><span className="was-rp-value">{activeConv.customer_name||'—'}</span></div>
                        <div className="was-rp-row"><span className="was-rp-label">Phone</span><span className="was-rp-value" style={{color:'var(--ds-color-text-muted)'}}>+{activeConv.customer_phone}</span></div>
                        <div className="was-rp-row"><span className="was-rp-label">Status</span>
                          <span className={`was-rp-pill ${activeConv.status==='open'?'was-rp-pill--open':'was-rp-pill--done'}`}>
                            {activeConv.status==='open'?'Open':'Resolved'}
                          </span>
                        </div>
                        <div className="was-rp-row"><span className="was-rp-label">Opt-out</span>
                          <span className="was-rp-value" style={{fontSize:11,color:activeConv.opted_out?'#0a0a0a':'#0a0a0a'}}>
                            {activeConv.opted_out?'Yes':'No'}
                          </span>
                        </div>
                      </div>
                      {/* Tags */}
                      {activeConv.tags && (
                        <div className="was-rp-section">
                          <div className="was-rp-section-title">Tags</div>
                          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                            {activeConv.tags.split(',').filter(Boolean).map(tag => (
                              <span key={tag} className="was-rp-tag">{tag.trim()}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {/* Quick actions */}
                      <div className="was-rp-section">
                        <div className="was-rp-section-title">Quick Actions</div>
                        <div style={{display:'flex',flexDirection:'column',gap:6}}>
                          <button className="was-btn-secondary" style={{fontSize:12,padding:'6px 10px',justifyContent:'center'}}
                            onClick={() => openProductModal()}>
                            Send Products
                          </button>
                          {activeConv.status === 'open' ? (
                            <button className="was-btn-primary" style={{fontSize:12,padding:'6px 10px',justifyContent:'center'}}
                              onClick={() => resolveConv(activeConv.id)}>
                              Mark Resolved
                            </button>
                          ) : (
                            <button className="was-btn-secondary" style={{fontSize:12,padding:'6px 10px',justifyContent:'center'}}
                              onClick={() => reopenConv(activeConv.id)}>
                              Re-open Conversation
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                  {rightPanelTab === 'notes' && (
                    <div className="was-rp-section">
                      <div className="was-rp-section-title">Private Notes</div>
                      <p style={{fontSize:11,color:'#9ca3af',marginBottom:8}}>Not visible to customer</p>
                      <textarea
                        className="was-rp-notes"
                        placeholder="Add a note about this customer..."
                        value={convNote}
                        onChange={e => setConvNote(e.target.value)}
                        rows={6}
                        disabled={savingNote}
                      />
                      <button className="was-btn-primary" style={{width:'100%',marginTop:8,justifyContent:'center',fontSize:12}}
                        onClick={saveConvNote}
                        disabled={savingNote || !convNote.trim()}>
                        {savingNote ? 'Saving...' : 'Save Note'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── LIBRARY ── */}
        {page === 'library' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <div>
                  <h2 className="was-page-title">Template Manager</h2>
                  <span className="was-page-sub">Seed, update and track approval for each message template — one at a time or in bulk</span>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="was-btn-secondary" onClick={() => { fetchTemplates(); fetchDefaultTemplates(); }} disabled={listLoading}>
                    <span style={{width:14,height:14,display:'flex'}}>{IC.refresh}</span>{listLoading?'Loading...':'Refresh'}
                  </button>
                  <button className="was-btn-secondary" title="Delete + recreate every default template with the latest copy — use this to replace old versions (e.g. that still show CrossCoin)"
                    onClick={() => updateNames(defaultTpls.map(d => d.name))}>
                    Re-submit all
                  </button>
                  <button className="was-btn-primary" onClick={() => { setForm(EMPTY_FORM); setFormResponse(null); setCreateModal(true); }}>
                    <span style={{width:14,height:14,display:'flex'}}>{IC.add}</span>New Template
                  </button>
                </div>
              </div>

              <div className="was-lib-toolbar">
                <div className="was-search-wrap">
                  <span className="was-search-icon">{IC.eye}</span>
                  <input className="was-search-input" placeholder="Search templates..." value={tplSearch} onChange={e => setTplSearch(e.target.value)} />
                </div>
                <div className="was-filter-pills">
                  {['all','approved','pending','rejected','not_created'].map(f => (
                    <button key={f} className={`was-filter-pill${tplFilter===f?' active':''}`} onClick={() => setTplFilter(f)}>
                      {f === 'not_created' ? 'Not created' : f.charAt(0).toUpperCase()+f.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="was-tpl-count">{filteredManager.length} template{filteredManager.length!==1?'s':''}</span>
              </div>

              {/* Bulk action bar */}
              <div className="was-tpl-bulkbar">
                <label className="was-tpl-checkall">
                  <input type="checkbox" checked={allSelected}
                    onChange={() => setSelectedTpls(allSelected ? new Set() : new Set(selectableNames))} />
                  <span>{selectedTpls.size ? `${selectedTpls.size} selected` : 'Select all'}</span>
                </label>
                <div style={{flex:1}} />
                <button className="was-btn-secondary" disabled={!selectedTpls.size}
                  onClick={() => seedNames([...selectedTpls])}>
                  Seed selected
                </button>
                <button className="was-btn-primary" disabled={!selectedTpls.size}
                  onClick={() => updateNames([...selectedTpls])}>
                  Re-submit selected
                </button>
              </div>

              {listLoading && !managerRows.length ? <div style={{padding:40,textAlign:'center'}}><WaLoad /></div> : (
                <div className="was-tpl-grid">
                  {filteredManager.length === 0 ? (
                    <div className="was-empty-state" style={{gridColumn:'1/-1'}}>
                      <div style={{width:36,height:36,color:'var(--ds-color-text-faint)'}}>{IC.tpl}</div>
                      <p>No templates match your filter.</p>
                    </div>
                  ) : filteredManager.map((t) => {
                    const cat = (t.category || '').toLowerCase();
                    const vars = (t.body.match(/\{\{\d+\}\}/g) || []).length;
                    const busy = tplBusy.has(t.name);
                    const created = t.status !== 'not_created';
                    const selected = selectedTpls.has(t.name);
                    const label = t.status === 'not_created' ? 'Not created'
                      : t.status.charAt(0).toUpperCase()+t.status.slice(1);
                    return (
                      <div key={t.name} className={`was-tpl-card${selected?' selected':''}`}>
                        <div className="was-tpl-card-top">
                          <label className="was-tpl-check">
                            <input type="checkbox" checked={selected} onChange={() => toggleTplSelect(t.name)} />
                          </label>
                          <span className={`was-cat-badge was-cat--${cat}`}>{catLabel(t.category)}</span>
                          <span className={`was-status-badge was-status--${t.status}`}>
                            <span className="was-status-dot" />{label}
                          </span>
                        </div>
                        <div className="was-tpl-name">{t.name}{t.isDefault ? '' : ' ·  custom'}</div>
                        <div className="was-tpl-body" onClick={() => setViewTpl(t)} title="Click to view full content" style={{cursor:'pointer'}}>{t.body || '—'}</div>
                        {t.status === 'rejected' && (
                          <div style={{
                            display:'flex', gap:6, alignItems:'flex-start', margin:'2px 0 6px',
                            background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8,
                            padding:'7px 9px', fontSize:12, color:'#b91c1c', lineHeight:1.4
                          }}>
                            <span style={{ flexShrink:0, marginTop:1 }}>⚠️</span>
                            <span><strong>Meta rejected:</strong> {t.rejectedReason || 'No reason given. Edit the copy and Re-submit.'}</span>
                          </div>
                        )}
                        <div className="was-tpl-foot">
                          <span className="was-tpl-meta-item">{IC.info}{t.language || 'en'}</span>
                          <span className="was-tpl-meta-item">{IC.tag}{vars} var{vars!==1?'s':''}</span>
                        </div>
                        <div className="was-tpl-actions">
                          <button className="was-btn-secondary" style={{justifyContent:'center'}} onClick={() => setViewTpl(t)} title="View full content">
                            View
                          </button>
                          {busy ? (
                            <button className="was-btn-secondary" style={{flex:1,justifyContent:'center'}} disabled>Working…</button>
                          ) : !created ? (
                            <button className="was-btn-primary" style={{flex:1,justifyContent:'center'}}
                              onClick={() => seedNames(t.name)} disabled={!t.isDefault}
                              title={t.isDefault ? 'Create this template on Meta' : ''}>
                              Seed
                            </button>
                          ) : (
                            <>
                              {t.isDefault && (
                                <button className="was-btn-secondary" style={{flex:1,justifyContent:'center'}}
                                  onClick={() => updateNames(t.name)} title="Delete + recreate for approval">
                                  Re-submit
                                </button>
                              )}
                              <button className="was-btn-danger" style={{justifyContent:'center'}}
                                onClick={() => deleteOneTpl(t.name)} title="Delete from Meta">
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TEST ── */}
        {page === 'test' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <h2 className="was-page-title">Test Message</h2>
                <span className="was-page-sub">Verify your WhatsApp API credentials</span>
              </div>
              <div className="was-test-layout">
                <div className="was-test-card">
                  <div className="was-test-icon">{IC.wa}</div>
                  <h3 className="was-test-title">Send Test Message</h3>
                  <p className="was-test-sub">Send a test ping to verify your API token and Phone Number ID are configured correctly.</p>
                  <form onSubmit={sendTest} className="was-test-form">
                    <div className="was-phone-wrap">
                      <span className="was-phone-prefix">{IC.phone} +91</span>
                      <input className="was-phone-input" value={testPhone} onChange={e => setTestPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit mobile number" inputMode="numeric" maxLength={10} />
                    </div>
                    <button type="submit" className="was-test-btn" disabled={testLoading||testPhone.length<10}>
                      <span style={{width:16,height:16,display:'flex'}}>{IC.send}</span>
                      {testLoading?'Sending...':'Send Test Message'}
                    </button>
                  </form>
                </div>
                <div className="was-test-info-col">
                  <div className="was-info-card">
                    <h4 className="was-info-title">What this does</h4>
                    <ul className="was-info-list">
                      <li>Sends a plain text message to the number you enter</li>
                      <li>Confirms your WhatsApp API token is valid</li>
                      <li>Confirms your Phone Number ID is configured</li>
                      <li>Does not use any template — just a direct message</li>
                    </ul>
                  </div>
                  <div className="was-info-card was-info-card--tip">
                    <h4 className="was-info-title">Tip</h4>
                    <p style={{fontSize:13,color:'#555',lineHeight:1.6,margin:0}}>The recipient must have messaged your WhatsApp Business number in the last 24 hours, or you must use an approved template.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── CANNED RESPONSES ── */}
        {page === 'canned' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <div>
                  <h2 className="was-page-title">Canned Responses</h2>
                  <span className="was-page-sub">Type /shortcut in the inbox to auto-fill</span>
                </div>
                <button className="was-btn-primary" onClick={() => { setCannedEditId(null); setCannedForm({ shortcut:'', title:'', body:'' }); setCannedModal(true); }}>
                  <span style={{width:14,height:14,display:'flex'}}>{IC.add}</span>New Response
                </button>
                <button className="was-btn-secondary" onClick={seedCannedResponses} title="Load 20 default ecommerce responses">
                  <span style={{width:14,height:14,display:'flex'}}>{IC.refresh}</span>Seed Defaults
                </button>
              </div>
              {cannedLoading ? <div style={{padding:40,textAlign:'center'}}><WaLoad /></div> : (
                <div className="was-tpl-grid">
                  {cannedResponses.length === 0 ? (
                    <div className="was-empty-state" style={{gridColumn:'1/-1'}}>
                      <div style={{width:36,height:36,color:'var(--ds-color-text-faint)'}}>{IC.tag}</div>
                      <p>No canned responses yet. Create one to speed up replies.</p>
                    </div>
                  ) : cannedResponses.map(cr => (
                    <div key={cr.id} className="was-tpl-card">
                      <div className="was-tpl-card-top">
                        <span className="was-cat-badge was-cat--utility">{cr.shortcut}</span>
                      </div>
                      <div className="was-tpl-name">{cr.title}</div>
                      <div className="was-tpl-body">{cr.body}</div>
                      <div className="was-tpl-foot" style={{gap:8}}>
                        <button className="was-btn-secondary" style={{fontSize:11,padding:'3px 10px'}} onClick={() => { setCannedEditId(cr.id); setCannedForm({ shortcut: cr.shortcut, title: cr.title, body: cr.body }); setCannedModal(true); }}>Edit</button>
                        <button className="was-btn-secondary" style={{fontSize:11,padding:'3px 10px',color:'#0a0a0a'}} onClick={() => deleteCannedResponse(cr.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── BROADCAST ── */}
        {page === 'broadcast' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <div>
                  <h2 className="was-page-title">Broadcast Campaigns</h2>
                  <span className="was-page-sub">Send a template to all opted-in customers</span>
                </div>
                <button className="was-btn-primary" onClick={() => { setBroadcastForm({ name:'', templateName:'', audienceFilter:'' }); setBroadcastModal(true); }}>
                  <span style={{width:14,height:14,display:'flex'}}>{IC.add}</span>New Campaign
                </button>
              </div>
              {broadcastLoading ? <div style={{padding:40,textAlign:'center'}}><WaLoad /></div> : (
                <div className="was-tpl-grid">
                  {broadcasts.length === 0 ? (
                    <div className="was-empty-state" style={{gridColumn:'1/-1'}}>
                      <div style={{width:36,height:36,color:'var(--ds-color-text-faint)'}}>{IC.send}</div>
                      <p>No broadcasts yet. Create a campaign to reach all your customers at once.</p>
                    </div>
                  ) : broadcasts.map(b => {
                    const statusColor = { draft:'#9a9aa2', running:'#6b6b73', done:'#0a0a0a', failed:'#3f3f46' }[b.status] || '#9a9aa2';
                    return (
                      <div key={b.id} className="was-tpl-card">
                        <div className="was-tpl-card-top">
                          <span className="was-cat-badge was-cat--marketing">{b.template_name}</span>
                          <span style={{fontSize:11,color:statusColor,fontWeight:600}}>{b.status}</span>
                        </div>
                        <div className="was-tpl-name">{b.name}</div>
                        <div className="was-tpl-body" style={{fontSize:12}}>
                          Recipients: {b.total_recipients}  · Sent: {b.sent_count}  · Failed: {b.failed_count}
                        </div>
                        <div className="was-tpl-foot">
                          {(b.status === 'draft' || b.status === 'failed') && (
                            <button className="was-btn-primary" style={{fontSize:11,padding:'4px 12px'}} disabled={broadcastRunning === b.id} onClick={() => runBroadcast(b.id)}>
                              {broadcastRunning === b.id ? 'Starting...' : '▶ Run'}
                            </button>
                          )}
                          {b.completed_at && <span style={{fontSize:11,color:'#9ca3af'}}>Done {new Date(b.completed_at).toLocaleDateString('en-IN')}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ANALYTICS ── */}
        {page === 'analytics' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <h2 className="was-page-title">Analytics</h2>
                <span className="was-page-sub">Message performance and SLA metrics</span>
              </div>

              {/* Stats row */}
              <div className="was-stats-grid">
                {statsLoading ? <div style={{padding:20}}><WaLoad /></div> : [
                  { label:'Messages Sent',    val: stats ? String(stats.sentMessages) : '—',      color:'#0a0a0a', icon: IC.send },
                  { label:'Delivery Rate',    val: stats ? `${stats.deliveryRate}%` : '—',        color:'#6b6b73', icon: IC.check },
                  { label:'Read Rate',        val: stats ? `${stats.readRate}%` : '—',            color:'#6b6b73', icon: IC.eye },
                  { label:'Avg Response',     val: slaStats?.avgFirstResponseMinutes ? `${slaStats.avgFirstResponseMinutes}m` : '—', color:'#6b6b73', icon: IC.phone },
                ].map(s => (
                  <div key={s.label} className="was-stat-card">
                    <div className="was-stat-top">
                      <span className="was-stat-label">{s.label}</span>
                      <span className="was-stat-icon" style={{ background: s.color + '20', color: s.color }}>{s.icon}</span>
                    </div>
                    <div className="was-stat-num">{s.val}</div>
                  </div>
                ))}
              </div>

              {/* 7-day chart */}
              <div className="was-dash-card" style={{marginTop:20}}>
                <div className="was-dash-card-head"><span className="was-dash-card-title">Messages — Last 7 Days</span></div>
                <div className="was-bar-chart">
                  {statsLoading ? <WaLoad /> : (() => {
                    const days = fillLast7Days(stats?.last7Days);
                    const maxVal = Math.max(...days.map(d => parseInt(d.count) || 0), 1);
                    return days.every(d => (parseInt(d.count) || 0) === 0)
                      ? <div style={{color:'#9ca3af',fontSize:13,padding:'20px 0'}}>No data yet</div>
                      : days.map(d => {
                        const val = parseInt(d.count) || 0;
                        const label = new Date(d.day).toLocaleDateString('en-IN', { weekday:'short' });
                        return (
                          <div key={d.day} className="was-bar-col">
                            <span className="was-bar-val">{val}</span>
                            <div className="was-bar" style={{ height: Math.round((val/maxVal)*80) + 'px' }} />
                            <span className="was-bar-lbl">{label}</span>
                          </div>
                        );
                      });
                  })()}
                </div>
              </div>

              {/* Tag stats */}
              {slaStats?.tagStats?.length > 0 && (
                <div className="was-dash-card" style={{marginTop:20}}>
                  <div className="was-dash-card-head"><span className="was-dash-card-title">Conversations by Tag</span></div>
                  <div className="was-activity">
                    {slaStats.tagStats.map((t, i) => (
                      <div key={i} className="was-act-item">
                        <span className="was-act-dot was-act-dot--blue" />
                        <span className="was-act-text"><strong>{t.tags}</strong></span>
                        <span className="was-act-time">{t.count} convs</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Create Template Modal ── */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Submit Template to Meta" closeOnOverlayClick={false}>
        <form onSubmit={createTemplate} className="seo-form">
          <div className="modal-body">
            <div className="was-modal-notice">Template name must be lowercase with underscores only. Approval takes 5 min – a few hours.</div>
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Template Name *</label>
                <input className="dm-input" value={form.name} onChange={e => setF('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="order_confirmation" required />
              </div>
              <div className="dm-field">
                <label className="dm-label">Category</label>
                <Dropdown
                  value={form.category}
                  onChange={val => setF('category', val)}
                  options={[
                    { value: 'UTILITY', label: 'UTILITY' },
                    { value: 'MARKETING', label: 'MARKETING' },
                    { value: 'AUTHENTICATION', label: 'AUTHENTICATION' },
                  ]}
                />
              </div>
            </div>
            <div className="dm-field">
              <label className="dm-label">Body *</label>
              <textarea className="dm-input dm-textarea" rows={5} value={form.body} onChange={e => setF('body', e.target.value)} style={{fontFamily:'monospace',fontSize:12}} required />
            </div>
            <div className="dm-field">
              <label className="dm-label">Footer</label>
              <input className="dm-input" value={form.footer} onChange={e => setF('footer', e.target.value)} />
            </div>
            {formResponse && <div className={`wa-response wa-response-${formResponse.type}`}><pre>{formResponse.text}</pre></div>}
          </div>
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setCreateModal(false)} disabled={formLoading}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={formLoading}>{formLoading?'Submitting...':'Submit to Meta'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Canned Response Modal ── */}
      <Modal isOpen={cannedModal} onClose={() => setCannedModal(false)} title={cannedEditId ? 'Edit Canned Response' : 'New Canned Response'} closeOnOverlayClick={false}>
        <form onSubmit={saveCannedResponse} className="seo-form">
          <div className="modal-body">
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Shortcut * (type /shortcut in reply)</label>
                <input
                  className="dm-input"
                  value={cannedForm.shortcut}
                  onChange={e => {
                    let val = e.target.value.toLowerCase().replace(/\s/g,'').replace(/[^a-z0-9/_-]/g,'');
                    if (val && !val.startsWith('/')) val = '/' + val;
                    setCannedForm(p => ({...p, shortcut: val}));
                  }}
                  placeholder="/track"
                  required
                />
              </div>
              <div className="dm-field">
                <label className="dm-label">Title *</label>
                <input className="dm-input" value={cannedForm.title} onChange={e => setCannedForm(p => ({...p, title: e.target.value}))} placeholder="Order Tracking Reply" required />
              </div>
            </div>
            <div className="dm-field">
              <label className="dm-label">Message Body *</label>
              <textarea className="dm-input dm-textarea" rows={4} value={cannedForm.body} onChange={e => setCannedForm(p => ({...p, body: e.target.value}))} required />
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setCannedModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Save</Button>
          </div>
        </form>
      </Modal>

      {/* ── Broadcast Modal ── */}
      <Modal isOpen={broadcastModal} onClose={() => setBroadcastModal(false)} title="New Broadcast Campaign" closeOnOverlayClick={false}>
        <form onSubmit={createBroadcast} className="seo-form">
          <div className="modal-body">
            <div className="was-modal-notice">Broadcasts are sent to all opted-in customers. Only use approved templates.</div>
            <div className="dm-field">
              <label className="dm-label">Campaign Name *</label>
              <input className="dm-input" value={broadcastForm.name} onChange={e => setBroadcastForm(p => ({...p, name: e.target.value}))} placeholder="Summer Sale 2025" required />
            </div>
            <div className="dm-field">
              <label className="dm-label">Template Name *</label>
              <input className="dm-input" value={broadcastForm.templateName} onChange={e => setBroadcastForm(p => ({...p, templateName: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,'')}))} placeholder="cart_abandoned" required />
            </div>
            <div className="dm-field">
              <label className="dm-label">Audience Filter (optional)</label>
              <input className="dm-input" value={broadcastForm.audienceFilter} onChange={e => setBroadcastForm(p => ({...p, audienceFilter: e.target.value}))} placeholder='e.g. {"tags":"vip"}' />
            </div>
          </div>
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setBroadcastModal(false)}>Cancel</Button>
            <Button variant="primary" type="submit">Create Campaign</Button>
          </div>
        </form>
      </Modal>

      {/* ── Send Products Modal (single card OR multi-product catalogue) ── */}
      <Modal isOpen={productModal} onClose={() => setProductModal(false)} title="Send Products" closeOnOverlayClick={false}>
        <div className="modal-body">
          <p style={{ fontSize:13, color:'var(--ds-color-text-muted)', marginBottom:12 }}>
            Choose a brand, pick one or more products, and we'll send each as a photo card with a link to buy. No catalogue setup needed.
          </p>
          {brands.length > 0 && (
            <div className="dm-field" style={{ marginBottom:10 }}>
              <label className="dm-label">Brand</label>
              <select className="dm-input" value={productBrand}
                onChange={e => { const v = Number(e.target.value); setProductBrand(v); setSelectedProducts([]); }}>
                {brands.map(b => <option key={b.id} value={b.id}>{b.display_name || b.name}</option>)}
              </select>
            </div>
          )}
          <input
            className="dm-input"
            placeholder="Search products..."
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            style={{ marginBottom:12 }}
          />
          <div style={{ maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {productLoading
              ? <div style={{ textAlign:'center', padding:20 }}><WaLoad /></div>
              : productList.length === 0
                ? <div style={{ textAlign:'center', color:'var(--ds-color-text-faint)', fontSize:13, padding:20 }}>No products found</div>
                : productList.map(p => {
                  const selected = !!selectedProducts.find(x => x.id === p.id);
                  const price = p.ProductVariations?.[0]?.price || p.price || '—';
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProduct(p)}
                      style={{
                        display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                        borderRadius:8, cursor:'pointer', border:`1.5px solid ${selected ? '#0d1117' : 'var(--ds-color-border)'}`,
                        background: selected ? '#f0f1f3' : 'var(--ds-color-surface)', transition:'all 0.15s'
                      }}
                    >
                      <div style={{
                        width:18, height:18, borderRadius:4, border:`2px solid ${selected ? '#0d1117' : '#d1d5db'}`,
                        background: selected ? '#0d1117' : 'transparent', flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center'
                      }}>
                        {selected && <HugeiconsIcon icon={Tick02Icon} size={10} strokeWidth={3} color="#fff" />}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'var(--ds-color-text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'var(--ds-color-text-muted)' }}>₹{price}  · ID: {p.id}</div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
          {selectedProducts.length > 0 && (
            <div style={{ marginTop:10, fontSize:12, color:'var(--ds-color-text-muted)', fontWeight:500 }}>
              {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="was-btn-secondary" onClick={() => setProductModal(false)}>Cancel</button>
          <button
            className="was-btn-primary"
            disabled={!selectedProducts.length || sendingProduct}
            onClick={confirmSendProduct}
          >
            {sendingProduct ? 'Sending...' : selectedProducts.length > 1 ? `Send ${selectedProducts.length} products` : 'Send product'}
          </button>
        </div>
      </Modal>

      {/* ── Template full-view Modal ── */}
      <Modal isOpen={!!viewTpl} onClose={() => setViewTpl(null)} title={viewTpl ? viewTpl.name : 'Template'}>
        {viewTpl && (() => {
          const cat = (viewTpl.category || '').toLowerCase();
          const st = viewTpl.status || 'not_created';
          const stLabel = st === 'not_created' ? 'Not created' : st.charAt(0).toUpperCase() + st.slice(1);
          const vars = (viewTpl.body || '').match(/\{\{\d+\}\}/g) || [];
          const uniqVars = [...new Set(vars)].sort();
          return (
            <>
              <div className="modal-body">
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                  <span className={`was-cat-badge was-cat--${cat}`}>{catLabel(viewTpl.category)}</span>
                  <span className={`was-status-badge was-status--${st}`}><span className="was-status-dot" />{stLabel}</span>
                  <span className="was-cat-badge" style={{ background:'var(--ds-color-surface-soft)', color:'var(--ds-color-text-muted)' }}>{viewTpl.language || 'en'}</span>
                  <span className="was-cat-badge" style={{ background:'var(--ds-color-surface-soft)', color:'var(--ds-color-text-muted)' }}>{viewTpl.isDefault ? 'Default' : 'Custom'}</span>
                </div>

                {viewTpl.status === 'rejected' && (
                  <div style={{
                    display:'flex', gap:8, alignItems:'flex-start', marginBottom:16,
                    background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10,
                    padding:'10px 12px', fontSize:13, color:'#b91c1c', lineHeight:1.5
                  }}>
                    <span style={{ flexShrink:0, marginTop:1 }}>⚠️</span>
                    <span><strong>Meta rejected this template.</strong><br />{viewTpl.rejectedReason || 'No reason was given. Edit the copy and Re-submit.'}</span>
                  </div>
                )}

                {/* WhatsApp-style preview */}
                <div style={{
                  background:'#e5ddd5', borderRadius:12, padding:16, marginBottom:16,
                  backgroundImage:'radial-gradient(rgba(0,0,0,0.03) 1px, transparent 1px)', backgroundSize:'14px 14px'
                }}>
                  <div style={{
                    background:'#fff', borderRadius:'0 10px 10px 10px', padding:'10px 12px',
                    maxWidth:340, boxShadow:'0 1px 1px rgba(0,0,0,0.12)', fontSize:13.5, lineHeight:1.5, color:'#111b21'
                  }}>
                    <div style={{ whiteSpace:'pre-wrap', wordBreak:'break-word' }}>{viewTpl.body || '—'}</div>
                    {viewTpl.footer && (
                      <div style={{ marginTop:8, fontSize:11.5, color:'#8696a0' }}>{viewTpl.footer}</div>
                    )}
                    {!!(viewTpl.buttons && viewTpl.buttons.length) && (
                      <div style={{ marginTop:8, borderTop:'1px solid #e9edef', paddingTop:6, display:'flex', flexDirection:'column', gap:4 }}>
                        {viewTpl.buttons.map((b, i) => (
                          <div key={i} style={{
                            textAlign:'center', color:'#00a5f4', fontSize:13, fontWeight:500, padding:'6px 0'
                          }}>
                            {typeof b === 'string' ? b : (b.text || b)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Raw fields */}
                <div style={{ display:'flex', flexDirection:'column', gap:10, fontSize:13 }}>
                  <div>
                    <div style={{ fontWeight:600, color:'var(--ds-color-text-muted)', marginBottom:3 }}>Body</div>
                    <div style={{ whiteSpace:'pre-wrap', wordBreak:'break-word', background:'var(--ds-color-surface-soft)', border:'1px solid var(--ds-color-border)', borderRadius:8, padding:'8px 10px', color:'var(--ds-color-text)' }}>{viewTpl.body || '—'}</div>
                  </div>
                  {viewTpl.footer && (
                    <div>
                      <div style={{ fontWeight:600, color:'var(--ds-color-text-muted)', marginBottom:3 }}>Footer</div>
                      <div style={{ background:'var(--ds-color-surface-soft)', border:'1px solid var(--ds-color-border)', borderRadius:8, padding:'8px 10px', color:'var(--ds-color-text)' }}>{viewTpl.footer}</div>
                    </div>
                  )}
                  {!!(viewTpl.buttons && viewTpl.buttons.length) && (
                    <div>
                      <div style={{ fontWeight:600, color:'var(--ds-color-text-muted)', marginBottom:3 }}>Buttons</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {viewTpl.buttons.map((b, i) => (
                          <span key={i} style={{ background:'#eef2ff', color:'#4338ca', borderRadius:6, padding:'4px 10px', fontSize:12, fontWeight:500 }}>
                            {typeof b === 'string' ? b : (b.text || b)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <div style={{ fontWeight:600, color:'var(--ds-color-text-muted)', marginBottom:3 }}>Variables ({uniqVars.length})</div>
                    {uniqVars.length ? (
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {uniqVars.map(v => (
                          <span key={v} style={{ background:'var(--ds-color-surface-soft)', color:'var(--ds-color-text-muted)', borderRadius:6, padding:'4px 10px', fontSize:12, fontFamily:'monospace' }}>{v}</span>
                        ))}
                      </div>
                    ) : <div style={{ color:'var(--ds-color-text-faint)', fontSize:12 }}>None</div>}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                {viewTpl.isDefault && viewTpl.status !== 'not_created' && (
                  <button className="was-btn-secondary" onClick={() => { updateNames(viewTpl.name); setViewTpl(null); }} title="Delete + recreate for approval">
                    Re-submit
                  </button>
                )}
                {viewTpl.isDefault && viewTpl.status === 'not_created' && (
                  <button className="was-btn-primary" onClick={() => { seedNames(viewTpl.name); setViewTpl(null); }}>
                    Seed
                  </button>
                )}
                <button className="was-btn-secondary" onClick={() => setViewTpl(null)}>Close</button>
              </div>
            </>
          );
        })()}
      </Modal>

    </div>
  );
}
