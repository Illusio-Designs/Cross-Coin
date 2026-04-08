// When accessed directly, render full dashboard shell
export { default } from './index';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Modal, Button } from '../../components/ui';
import Dropdown from '../../components/ui/Dropdown';
import Loader from '../../components/common/Loader';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandService, whatsappService } from '../../services';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IC = {
  wa:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  send:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  add:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  copy:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  phone:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>,
  msg:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  tpl:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  eye:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  tag:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  info:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  dash:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>,
  bar:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
  filter:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>,
};

// ─── Template data ────────────────────────────────────────────────────────────
const TPL_ICONS = {
  order_confirm:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  order_shipped:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  out_for_delivery: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12H3l9-9 9 9h-2"/><path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"/><path d="M9 21v-6h6v6"/></svg>,
  order_delivered:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>,
  cart_abandon:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>,
  cod_confirm:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  review_request:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  return_initiated: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>,
  refund_update:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
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
const AVATAR_COLORS = ['#7c3aed','#0284c7','#059669','#b45309','#db2777','#dc2626','#0891b2'];
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

// ─── Phone Preview ────────────────────────────────────────────────────────────
function PhonePreview({ tpl }) {
  if (!tpl) return (
    <div className="was-pp-empty">
      <div style={{ width:40, height:40, color:'#d1d5db' }}>{IC.tpl}</div>
      <p>Select a template to preview</p>
    </div>
  );
  const html = (tpl.body||'')
    .replace(/\{\{(\d+)\}\}/g, (_, n) => `<strong style="color:#075e54">${SAMPLES[n-1]||`{{${n}}}`}</strong>`)
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
            <div className="was-ph-btext" dangerouslySetInnerHTML={{ __html: html }} />
            {tpl.footer && <div className="was-ph-bfooter">{tpl.footer}</div>}
            <div className="was-ph-bmeta"><span>Just now</span><span style={{color:'#53bdeb'}}>✓✓</span></div>
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
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : '';
  // Always proxy through backend — whether it's a media ID or a full Facebook URL
  // The backend media proxy handles both cases
  const encoded = encodeURIComponent(mediaId);
  return `${API_BASE}/api/whatsapp/media/${encoded}?brandId=${brandId}&token=${encodeURIComponent(token)}`;
}

// WhatsApp-style audio player � fetches as blob so auth token works, plays inline
function AudioPlayer({ src }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [blobUrl, setBlobUrl] = useState(null);
  const [loadState, setLoadState] = useState('loading');

  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (!src) return;
    setLoadState('loading');
    setBlobUrl(null);
    let cancelled = false;
    fetch(src)
      .then(r => { if (!r.ok) throw new Error('Failed'); return r.blob(); })
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobUrlRef.current = url;
        setBlobUrl(url);
        setLoadState('ready');
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
    playing ? a.pause() : a.play().catch(() => {});
  };

  const fmt = s => (!s || isNaN(s)) ? '0:00' : `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;

  const seek = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (audioRef.current) audioRef.current.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const bars = useMemo(() => {
    const seed = (src||'').split('').reduce((a,c) => a + c.charCodeAt(0), 0);
    return Array.from({length:30}, (_,i) => Math.max(8, Math.min(20 + ((seed*(i+1)*7919)%60), 28)));
  }, [src]);

  if (loadState === 'error') return (
    <div style={{fontSize:12, color:'#9ca3af', fontStyle:'italic', display:'flex', alignItems:'center', gap:6}}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
      Voice message unavailable
    </div>
  );

  return (
    <div style={{display:'flex', alignItems:'center', gap:8, minWidth:220, maxWidth:280}}>
      {blobUrl && (
        <audio ref={audioRef} src={blobUrl}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => { setPlaying(false); setProgress(0); setCurrentTime(0); }}
          onTimeUpdate={() => { const a = audioRef.current; if (a?.duration) { setCurrentTime(a.currentTime); setProgress(a.currentTime/a.duration); } }}
          onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
          style={{display:'none'}}
        />
      )}
      <button onClick={toggle} disabled={loadState !== 'ready'} style={{
        width:36, height:36, borderRadius:'50%', border:'none',
        cursor: loadState === 'ready' ? 'pointer' : 'wait',
        background:'#CE1E36', display:'flex', alignItems:'center', justifyContent:'center',
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
            <div key={i} style={{width:3, height:h, borderRadius:2, flexShrink:0, background: i/bars.length <= progress ? '#CE1E36' : '#d1d5db', transition:'background 0.1s'}}/>
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

  if (!blobUrl) return <div style={{width:120,height:80,background:'#f3f4f6',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',color:'#9ca3af',fontSize:11}}>Loading…</div>;

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
        {caption && <div style={{ fontSize:12, marginTop:4, color:'#374151' }}>{caption}</div>}
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
        : <><span style={{animation:'spin 1s linear infinite',display:'inline-block'}}>⏳</span> Loading…</>
      }
    </div>
  );

  return (
    <div style={{width:220}}>
      <video controls style={{width:'100%', maxHeight:160, borderRadius:8, display:'block', background:'#000', objectFit:'contain'}} src={blobUrl}/>
      {caption && <div style={{fontSize:12,marginTop:4,color:'#374151'}}>{caption}</div>}
    </div>
  );
}

function msgPreview(msg) {
  if (!msg) return '';
  if (msg.type === 'audio') return '🎤 Voice message';
  if (msg.type === 'image') return '📷 Photo';
  if (msg.type === 'video') return '🎥 Video';
  if (msg.type === 'document') return '📄 Document';
  if (msg.body?.startsWith('{')) return '📎 Media';
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
    console.log('[MsgContent]', { id: msg.id, type: msg.type, effectiveType, body: msg.body?.substring(0, 100), proxyUrl: proxyUrl?.substring(0, 80) });
  }

  if (effectiveType === 'audio') {
    return proxyUrl
      ? <AudioPlayer src={proxyUrl} />
      : (
        <div style={{ display:'flex', alignItems:'center', gap:8, color:'#6b7280', fontSize:13 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
          </svg>
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

  if (effectiveType === 'document') {
    const filename = media?.caption || 'Document';
    const isPdf = (media?.mime_type || '').includes('pdf') || filename.endsWith('.pdf');
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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={isPdf ? '#CE1E36' : '#3b82f6'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, color:'#111827', wordBreak:'break-all', marginBottom:2 }}>{filename}</div>
          <div style={{ fontSize:11, color:'#6b7280', display:'flex', alignItems:'center', gap:4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Download {isPdf ? 'PDF' : 'file'}
          </div>
        </div>
      </div>
    );
  }

  // Default: plain text — but first check if it looks like raw JSON media (old format)
  if (msg.body) {
    const trimmed = msg.body.trim();
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
  return <span style={{ fontSize:14, lineHeight:1.5 }} dangerouslySetInnerHTML={{ __html: formatted }} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function WhatsAppManager() {
  const [page, setPage] = useState('dashboard');
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(1);
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
  // Inbox
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState(null); // { id, body, direction, type }
  const [convLoading, setConvLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('open');
  const [convSearch, setConvSearch] = useState('');
  // Test
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
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
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [sendMode, setSendMode] = useState('single'); // 'single' | 'catalogue'
  const [sendingProduct, setSendingProduct] = useState(false);

  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    brandService.getAllBrands(true).then(r => { if (r.success) setBrands(r.data); }).catch(() => {});
  }, []);

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await whatsappService.getStats(brandId);
      if (data.success) setStats(data.stats);
    } catch { }
    setStatsLoading(false);
  };

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fetchTemplates = async () => {
    setListLoading(true);
    try {
      const data = await whatsappService.listTemplates(brandId);
      if (data.success) setTemplateList(data.templates || []);
    } catch { }
    setListLoading(false);
  };

  const seedTemplates = async () => {
    setSeedLoading(true);
    try {
      const data = await whatsappService.seedTemplates(brandId);
      if (data.success) {
        const { created, skipped, failed } = data.summary;
        showSuccess('templateCreated', `Created: ${created} · Skipped: ${skipped} · Failed: ${failed}`);
        fetchTemplates();
      } else {
        showError('loadingFailed', data.message);
      }
    } catch (e) { showError('loadingFailed', e.message); }
    setSeedLoading(false);
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.body.trim()) { showError('fieldRequired'); return; }
    setFormLoading(true); setFormResponse(null);
    try {
      const components = [{ type:'BODY', text: form.body }];
      if (form.footer) components.push({ type:'FOOTER', text: form.footer });
      const buttons = [];
      if (form.btn1Type && form.btn1Text) {
        const b = { type: form.btn1Type, text: form.btn1Text };
        if (form.btn1Type === 'URL') b.url = form.btn1Val;
        if (form.btn1Type === 'PHONE_NUMBER') b.phone_number = form.btn1Val;
        buttons.push(b);
      }
      if (form.btn2Text) buttons.push({ type:'QUICK_REPLY', text: form.btn2Text });
      if (buttons.length) components.push({ type:'BUTTONS', buttons });
      const data = await whatsappService.createTemplate({
        brandId, name: form.name, category: form.category, language: form.language, components
      });
      if (data.success) { showSuccess('templateCreated'); setCreateModal(false); fetchTemplates(); }
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
    } catch { }
    setConvLoading(false);
  };

  const fetchMessages = async (conv) => {
    setActiveConv(conv); setMsgLoading(true);
    isNearBottomRef.current = false; // don't auto-scroll when opening a chat
    try {
      const data = await whatsappService.getMessages(conv.id);
      if (data.success) {
        setMessages(data.messages || []);
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count:0 } : c));
      }
    } catch { }
    setMsgLoading(false);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !activeConv) return;
    setSending(true);
    try {
      // Include quoted context in the message body as a prefix marker
      const quotedPrefix = replyTo
        ? `[quoted:${replyTo.id}:${msgPreview(replyTo).substring(0, 60)}]\n`
        : '';
      const fullMessage = reply.trim();
      const quotedWaId = replyTo?.wa_message_id || null;
      const data = await whatsappService.sendReply(activeConv.id, fullMessage, brandId, quotedWaId);
      if (data.success) {
        // Attach quoted context to the saved message for display
        const savedMsg = { ...data.message, _quotedMsg: replyTo || null };
        setMessages(prev => [...prev, savedMsg]);
        setReply(''); setReplyTo(null); isNearBottomRef.current = true;
      }
      else showError('sendFailed', data.message);
    } catch (err) { showError('sendFailed', err.message); }
    setSending(false);
  };

  const resolveConv = async (id) => {
    try {
      await whatsappService.resolveConversation(id);
      showSuccess('resolved');
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConv?.id === id) { setActiveConv(null); setMessages([]); }
    } catch { showError('updateFailed'); }
  };

  const sendTest = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) { showError('fieldRequired'); return; }
    setTestLoading(true);
    try {
      const data = await whatsappService.testConnection(testPhone, brandId);
      if (data.success) showSuccess('messageSent'); else showError('sendFailed', data.message);
    } catch (err) { showError('sendFailed', err.message); }
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

  // Silent poll — does NOT reset scroll position
  const pollMessages = async (conv) => {
    try {
      const data = await whatsappService.getMessages(conv.id);
      if (data.success) {
        // Preserve _quotedMsg from existing messages when polling
        setMessages(prev => {
          const quotedMap = {};
          prev.forEach(m => { if (m._quotedMsg) quotedMap[m.id] = m._quotedMsg; });
          return (data.messages || []).map(m => quotedMap[m.id] ? { ...m, _quotedMsg: quotedMap[m.id] } : m);
        });
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
      }
    } catch { }
  };

  // Only auto-scroll if user is near bottom and a new message was sent
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  useEffect(() => { if (page === 'inbox') fetchConversations(); }, [page, statusFilter, brandId]);
  useEffect(() => { if (page === 'library' || page === 'templates') fetchTemplates(); }, [page, brandId]);
  useEffect(() => { if (page === 'dashboard') fetchStats(); }, [page, brandId]);
  useEffect(() => {
    if (!activeConv) return;
    pollRef.current = setInterval(() => pollMessages(activeConv), 10000);
    return () => clearInterval(pollRef.current);
  }, [activeConv?.id]);

  // Fetch canned responses
  const fetchCannedResponses = async () => {
    setCannedLoading(true);
    try {
      const data = await whatsappService.getCannedResponses(brandId);
      if (data.success) setCannedResponses(data.cannedResponses || []);
    } catch { }
    setCannedLoading(false);
  };

  const saveCannedResponse = async (e) => {
    e.preventDefault();
    if (!cannedForm.shortcut || !cannedForm.title || !cannedForm.body) { showError('fieldRequired'); return; }
    try {
      if (cannedEditId) {
        await whatsappService.updateCannedResponse(cannedEditId, cannedForm);
      } else {
        await whatsappService.createCannedResponse({ ...cannedForm, brandId });
      }
      showSuccess('saved');
      setCannedModal(false);
      setCannedEditId(null);
      setCannedForm({ shortcut: '', title: '', body: '' });
      fetchCannedResponses();
    } catch (err) { showError('saveFailed', err.message); }
  };

  const deleteCannedResponse = async (id) => {
    try {
      await whatsappService.deleteCannedResponse(id);
      showSuccess('deleted');
      fetchCannedResponses();
    } catch { showError('deleteFailed'); }
  };

  // Fetch broadcasts
  const fetchBroadcasts = async () => {
    setBroadcastLoading(true);
    try {
      const data = await whatsappService.getBroadcasts(brandId);
      if (data.success) setBroadcasts(data.broadcasts || []);
    } catch { }
    setBroadcastLoading(false);
  };

  const createBroadcast = async (e) => {
    e.preventDefault();
    if (!broadcastForm.name || !broadcastForm.templateName) { showError('fieldRequired'); return; }
    try {
      await whatsappService.createBroadcast({ ...broadcastForm, brandId });
      showSuccess('broadcastCreated');
      setBroadcastModal(false);
      setBroadcastForm({ name: '', templateName: '', audienceFilter: '' });
      fetchBroadcasts();
    } catch (err) { showError('saveFailed', err.message); }
  };

  const runBroadcast = async (id) => {
    setBroadcastRunning(id);
    try {
      const data = await whatsappService.runBroadcast(id);
      if (data.success) { showSuccess('broadcastStarted'); fetchBroadcasts(); }
      else showError('sendFailed', data.message);
    } catch (err) { showError('sendFailed', err.message); }
    setBroadcastRunning(null);
  };

  // Fetch SLA stats
  const fetchSLAStats = async () => {
    setSlaLoading(true);
    try {
      const data = await whatsappService.getSLAStats(brandId);
      if (data.success) setSlaStats(data.sla);
    } catch { }
    setSlaLoading(false);
  };

  // Canned response shortcut in reply box
  const handleReplyChange = (val) => {
    setReply(val);
    if (val.startsWith('/')) {
      const match = cannedResponses.find(c => c.shortcut === val.trim());
      if (match) setReply(match.body);
    }
  };

  useEffect(() => { if (page === 'canned') fetchCannedResponses(); }, [page, brandId]);
  useEffect(() => { if (page === 'broadcast') fetchBroadcasts(); }, [page, brandId]);
  useEffect(() => { if (page === 'analytics') { fetchStats(); fetchSLAStats(); } }, [page, brandId]);

  // Search products for send-product modal
  const searchProducts = async (q) => {
    setProductLoading(true);
    try {
      const { productService } = await import('../../services');
      const data = await productService.getAllProducts(1, 20, q);
      setProductList(data?.products || data?.rows || []);
    } catch { setProductList([]); }
    setProductLoading(false);
  };

  useEffect(() => {
    if (!productModal) return;
    const t = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch, productModal]);

  const openProductModal = (mode) => {
    setSendMode(mode);
    setSelectedProducts([]);
    setProductSearch('');
    setProductList([]);
    setProductModal(true);
    searchProducts('');
  };

  const toggleProduct = (p) => {
    if (sendMode === 'single') {
      setSelectedProducts([p]);
    } else {
      setSelectedProducts(prev =>
        prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]
      );
    }
  };

  const confirmSendProduct = async () => {
    if (!selectedProducts.length || !activeConv) return;
    setSendingProduct(true);
    try {
      if (sendMode === 'single') {
        // Pass productId — backend auto-resolves to {productId}_{variationId} matching catalogue
        await whatsappService.sendProduct(activeConv.id, selectedProducts[0].id, brandId);
        showSuccess('messageSent');
      } else {
        // Pass productIds array — backend resolves each to first variation retailer ID
        await whatsappService.sendCatalogue(
          activeConv.id,
          null,                                    // retailerIds — let backend resolve
          selectedProducts.map(p => p.id),         // productIds
          null, null, brandId
        );
        showSuccess('messageSent');
      }
      setProductModal(false);
      fetchMessages(activeConv);
    } catch (err) { showError('sendFailed', err.message); }
    setSendingProduct(false);
  };

  // Seed canned responses
  const seedCannedResponses = async () => {
    try {
      const data = await whatsappService.seedCannedResponses(brandId);
      showSuccess('saved', `Created: ${data.summary?.created} · Skipped: ${data.summary?.skipped}`);
      fetchCannedResponses();
    } catch (err) { showError('loadingFailed', err.message); }
  };

  const filteredConvs = conversations.filter(c =>
    !convSearch || (c.customer_name || c.customer_phone || '').toLowerCase().includes(convSearch.toLowerCase())
  );
  const unreadCount = stats?.unreadCount ?? conversations.filter(c => c.unread_count > 0).length;

  // live template list filtered for library/templates tabs
  const filteredTpls = templateList.filter(t => {
    const status = (t.status || '').toLowerCase();
    const ms = tplFilter === 'all' || status === tplFilter;
    const mq = !tplSearch || (t.name || '').toLowerCase().includes(tplSearch.toLowerCase());
    return ms && mq;
  });

  const NAV = [
    { k:'dashboard',  label:'Dashboard',        icon: IC.dash,    section: 'Main' },
    { k:'inbox',      label:'Conversations',     icon: IC.msg,     badge: unreadCount || null },
    { k:'templates',  label:'Templates',         icon: IC.tpl,     badge: templateList.length || null },
    { k:'library',    label:'Library',           icon: IC.eye,     section: 'Messaging' },
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

        <div className="was-nav-footer">
          {brands.length > 1 && (
            <Dropdown
              value={brandId}
              onChange={val => setBrandId(Number(val))}
              options={brands.map(b => ({ value: b.id, label: b.display_name || b.name }))}
              className="was-brand-select"
            />
          )}
        </div>
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <div className="was-main">

        {/* ── DASHBOARD ── */}
        {page === 'dashboard' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <h2 className="was-page-title">Dashboard</h2>
                <span className="was-page-sub">CrossCoin · WhatsApp Overview</span>
                <button className="was-btn-secondary" onClick={seedTemplates} disabled={seedLoading}>
                  <span style={{width:14,height:14,display:'flex'}}>{IC.refresh}</span>
                  {seedLoading ? 'Seeding…' : 'Seed Templates'}
                </button>
              </div>

              {/* Stats */}
              <div className="was-stats-grid">
                {statsLoading ? <div style={{padding:20}}><Loader /></div> : [
                  { label:'Messages Sent',    val: stats ? String(stats.sentMessages) : '—',      change: stats ? `${stats.deliveryRate}% delivery rate` : '',  color:'#25D366', icon: IC.send },
                  { label:'Delivered',        val: stats ? String(stats.deliveredMessages) : '—', change: stats ? `${stats.deliveryRate}% rate` : '',            color:'#3b82f6', icon: IC.check },
                  { label:'Read Rate',        val: stats ? `${stats.readRate}%` : '—',            change: stats ? `${stats.readMessages} messages read` : '',    color:'#f59e0b', icon: IC.eye },
                  { label:'Open Convs',       val: stats ? String(stats.openConversations) : '—', change: stats ? `${stats.unreadCount} need reply` : '',        color:'#8b5cf6', icon: IC.msg },
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
                    {statsLoading ? <Loader /> : (() => {
                      const days = stats?.last7Days || [];
                      const maxVal = Math.max(...days.map(d => parseInt(d.count) || 0), 1);
                      return days.length === 0
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
                    {statsLoading ? <Loader /> : [
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
                  { label:'Approved Templates', val: String(templateList.filter(t => (t.status||'').toLowerCase() === 'approved').length), sub:`${templateList.filter(t => (t.status||'').toLowerCase() === 'pending').length} pending · ${templateList.filter(t => (t.status||'').toLowerCase() === 'rejected').length} rejected`, color:'#25D366', icon: IC.tpl },
                  { label:'Open Conversations', val: String(stats?.openConversations ?? 0), sub:'Live chats', color:'#3b82f6', icon: IC.msg },
                  { label:'Total Messages',     val: String(stats?.totalMessages ?? 0),     sub:`${stats?.sentMessages ?? 0} sent · ${stats?.deliveredMessages ?? 0} delivered`, color:'#f59e0b', icon: IC.phone },
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

        {/* ── TEMPLATES ── */}
        {page === 'templates' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <div>
                  <h2 className="was-page-title">Templates</h2>
                  <span className="was-page-sub">Create & preview message templates</span>
                </div>
                <button className="was-btn-primary" onClick={() => { setForm(EMPTY_FORM); setFormResponse(null); setCreateModal(true); }}>
                  <span style={{width:14,height:14,display:'flex'}}>{IC.add}</span>New Template
                </button>
              </div>
              <div className="was-tpl-layout">
                {/* Sidebar */}
                <div className="was-tpl-sidebar">
                  {SIDEBAR_GROUPS.map(g => (
                    <div key={g.label} className="was-sb-group">
                      <div className="was-sb-group-label">{g.label}</div>
                      {g.keys.map(k => {
                        const t = TEMPLATES[k];
                        return (
                          <button key={k} className={`was-sb-item${activeKey === k ? ' active' : ''}`} onClick={() => setActiveKey(k)}>
                            <span className="was-sb-icon">{TPL_ICONS[t.icon]}</span>
                            <span>{t.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Detail */}
                <div className="was-tpl-detail">
                  <div className="was-detail-card">
                    <div className="was-detail-head">
                      <div>
                        <div className="was-detail-title">{TEMPLATES[activeKey]?.title}</div>
                        <span className={`was-cat-badge was-cat--${(TEMPLATES[activeKey]?.category||'').toLowerCase()}`}>{catLabel(TEMPLATES[activeKey]?.category)}</span>
                      </div>
                      <button className="was-icon-btn" onClick={copyJSON}>{copied ? IC.check : IC.copy}</button>
                    </div>
                    <div className="was-detail-label">Template Name</div>
                    <div className="was-detail-mono">{TEMPLATES[activeKey]?.name}</div>
                  </div>
                  <div className="was-detail-card">
                    <div className="was-detail-title" style={{marginBottom:10}}>Message Body</div>
                    <div className="was-body-preview">{TEMPLATES[activeKey]?.body}</div>
                    {TEMPLATES[activeKey]?.footer && <div className="was-body-footer">{TEMPLATES[activeKey].footer}</div>}
                  </div>
                  <div className="was-detail-card">
                    <div className="was-detail-title" style={{marginBottom:10}}>Variables</div>
                    {(() => {
                      const vars = (TEMPLATES[activeKey]?.body||'').match(/\{\{\d+\}\}/g)||[];
                      const unique = [...new Set(vars)].sort();
                      if (!unique.length) return <p style={{fontSize:12,color:'#9ca3af',margin:0}}>No variables.</p>;
                      return <div className="was-vars-wrap">{unique.map(v => <span key={v} className="was-var-chip">{v} = {SAMPLES[parseInt(v.replace(/\D/g,''))-1]||'...'}</span>)}</div>;
                    })()}
                  </div>
                </div>

                {/* Phone preview */}
                <div className="was-tpl-preview">
                  <div className="was-detail-card" style={{position:'sticky',top:0}}>
                    <div className="was-detail-title" style={{marginBottom:14}}>📱 Live Preview</div>
                    <div style={{display:'flex',justifyContent:'center'}}>
                      <PhonePreview tpl={TEMPLATES[activeKey]} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── INBOX ── */}
        {page === 'inbox' && (
          <div className="was-inbox-wrap">
            {/* Thread list */}
            <div className="was-thread-list">
              <div className="was-thread-top-bar">
                <input className="was-thread-search" placeholder="Search chats…" value={convSearch} onChange={e => setConvSearch(e.target.value)} />
              </div>
              <div className="was-thread-tabs">
                {['open','resolved','all'].map(s => (
                  <button key={s} className={`was-thread-tab${statusFilter===s?' active':''}`} onClick={() => setStatusFilter(s)}>
                    {s.charAt(0).toUpperCase()+s.slice(1)}
                  </button>
                ))}
              </div>
              <div className="was-thread-scroll">
                {convLoading ? <div style={{padding:20,textAlign:'center'}}><Loader /></div>
                : filteredConvs.length === 0 ? (
                  <div className="was-empty-state">
                    <div style={{width:36,height:36,color:'#d1d5db'}}>{IC.msg}</div>
                    <p>No {statusFilter} conversations</p>
                  </div>
                ) : filteredConvs.map(conv => {
                  const col = avatarColor(conv.customer_name||conv.customer_phone);
                  return (
                    <div key={conv.id} className={`was-thread-item${activeConv?.id===conv.id?' active':''}`} onClick={() => fetchMessages(conv)}>
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
                  <div style={{width:52,height:52,color:'#d1d5db'}}>{IC.wa}</div>
                  <h3>Select a conversation</h3>
                  <p>Choose a chat from the left to start messaging</p>
                </div>
              ) : (
                <>
                  <div className="was-chat-hd">
                    <div className="was-chat-av" style={{background:avatarColor(activeConv.customer_name||activeConv.customer_phone)}}>
                      {initials(activeConv.customer_name||activeConv.customer_phone)}
                    </div>
                    <div style={{flex:1}}>
                      <div className="was-chat-name">{activeConv.customer_name||activeConv.customer_phone}</div>
                      <div className="was-chat-phone">+{activeConv.customer_phone}</div>
                    </div>
                    {activeConv.status === 'open' && (
                      <button className="was-resolve-btn" onClick={() => resolveConv(activeConv.id)}>
                        {IC.check} Resolve
                      </button>
                    )}
                  </div>
                  <div className="was-messages" ref={messagesContainerRef} onScroll={handleMessagesScroll}>
                    {msgLoading ? <div style={{textAlign:'center',padding:20}}><Loader /></div>
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
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                                </svg>
                              </button>
                              <div className="was-msg-bubble">
                                {msg._quotedMsg && (
                                  <div style={{
                                    background: msg.direction === 'outbound' ? 'rgba(206,30,54,0.1)' : 'rgba(0,0,0,0.06)',
                                    borderLeft: '3px solid #CE1E36',
                                    borderRadius: '4px 4px 0 0',
                                    padding: '5px 8px',
                                    marginBottom: 6,
                                    fontSize: 12,
                                    color: '#6b7280',
                                    maxWidth: '100%',
                                    overflow: 'hidden',
                                  }}>
                                    <div style={{color:'#CE1E36', fontWeight:700, fontSize:11, marginBottom:2}}>
                                      {msg._quotedMsg.direction === 'inbound' ? (activeConv?.customer_name || 'Customer') : 'You'}
                                    </div>
                                    <div style={{overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                      {msgPreview(msg._quotedMsg)}
                                    </div>
                                  </div>
                                )}
                                <MsgContent msg={msg} brandId={brandId} />
                              </div>
                              <div className="was-msg-meta">
                                {formatTime(msg.sent_at||msg.createdAt)}
                                {msg.direction==='outbound' && <span style={{color:msg.status==='read'?'#53bdeb':'#9ca3af'}}>{msg.status==='read'||msg.status==='delivered'?' ✓✓':' ✓'}</span>}
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
                    <div>
                      {/* Action bar — product/catalogue send */}                      <div style={{ display:'flex', gap:6, padding:'6px 12px', borderTop:'1px solid #f3f4f6', background:'#fafafa' }}>
                        <button
                          className="was-btn-secondary"
                          style={{ fontSize:11, padding:'3px 10px', display:'flex', alignItems:'center', gap:4 }}
                          onClick={() => openProductModal('single')}
                          title="Send a single product card"
                        >
                          🛍️ Send Product
                        </button>
                        <button
                          className="was-btn-secondary"
                          style={{ fontSize:11, padding:'3px 10px', display:'flex', alignItems:'center', gap:4 }}
                          onClick={() => openProductModal('catalogue')}
                          title="Send multiple products as catalogue"
                        >
                          📦 Send Catalogue
                        </button>
                      </div>
                      <form className="was-reply-box" onSubmit={sendReply} style={{position:'relative'}}>
                        {replyTo && (
                          <div style={{
                            position:'absolute', bottom:'100%', left:0, right:0,
                            background:'#f0f4ff', borderTop:'3px solid #CE1E36',
                            padding:'8px 12px', display:'flex', alignItems:'center', justifyContent:'space-between',
                            fontSize:12,
                          }}>
                            <div style={{display:'flex', flexDirection:'column', gap:2, minWidth:0}}>
                              <span style={{color:'#CE1E36', fontWeight:700, fontSize:11}}>
                                {replyTo.direction === 'inbound' ? 'Customer' : 'You'}
                              </span>
                              <span style={{color:'#6b7280', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:300}}>
                                {msgPreview(replyTo)}
                              </span>
                            </div>
                            <button type="button" onClick={() => setReplyTo(null)} style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:16,padding:'0 4px',flexShrink:0}}>×</button>
                          </div>
                        )}
                        <textarea className="was-reply-input" placeholder="Type a message… (type /shortcut for canned responses)" value={reply}
                          onChange={e => handleReplyChange(e.target.value)}
                          onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendReply(e); } }}
                          rows={2} />
                        <button type="submit" className="was-send-btn" disabled={sending||!reply.trim()}>{IC.send}</button>
                      </form>
                    </div>
                  ) : (
                    <div className="was-resolved-bar">This conversation is resolved</div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* ── LIBRARY ── */}
        {page === 'library' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <div>
                  <h2 className="was-page-title">Template Library</h2>
                  <span className="was-page-sub">All submitted templates and their Meta approval status</span>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="was-btn-secondary" onClick={seedTemplates} disabled={seedLoading}>
                    {seedLoading ? 'Seeding…' : 'Seed Default Templates'}
                  </button>
                  <button className="was-btn-primary" onClick={fetchTemplates} disabled={listLoading}>
                    <span style={{width:14,height:14,display:'flex'}}>{IC.refresh}</span>{listLoading?'Loading…':'Refresh'}
                  </button>
                </div>
              </div>
              <div className="was-lib-toolbar">
                <div className="was-search-wrap">
                  <span className="was-search-icon">{IC.eye}</span>
                  <input className="was-search-input" placeholder="Search…" value={tplSearch} onChange={e => setTplSearch(e.target.value)} />
                </div>
                <div className="was-filter-pills">
                  {['all','approved','pending','rejected'].map(f => (
                    <button key={f} className={`was-filter-pill${tplFilter===f?' active':''}`} onClick={() => setTplFilter(f)}>
                      {f.charAt(0).toUpperCase()+f.slice(1)}
                    </button>
                  ))}
                </div>
                <span className="was-tpl-count">Showing {filteredTpls.length} of {templateList.length}</span>
              </div>
              {listLoading ? <div style={{padding:40,textAlign:'center'}}><Loader /></div> : (
                <div className="was-tpl-grid">
                  {filteredTpls.length === 0 ? (
                    <div className="was-empty-state" style={{gridColumn:'1/-1'}}>
                      <div style={{width:36,height:36,color:'#d1d5db'}}>{IC.tpl}</div>
                      <p>{templateList.length === 0 ? 'No templates yet. Click Refresh or Seed Default Templates.' : 'No templates match your filter.'}</p>
                    </div>
                  ) : filteredTpls.map((t, i) => {
                    const status = (t.status || '').toLowerCase();
                    const cat    = (t.category || '').toLowerCase();
                    const body   = t.components?.find(c => c.type === 'BODY')?.text || '';
                    const vars   = (body.match(/\{\{\d+\}\}/g) || []).length;
                    return (
                      <div key={t.id || i} className="was-tpl-card">
                        <div className="was-tpl-card-top">
                          <span className={`was-cat-badge was-cat--${cat}`}>{catLabel(t.category)}</span>
                          <span className={`was-status-badge was-status--${status}`}>
                            <span className="was-status-dot" />{status.charAt(0).toUpperCase()+status.slice(1)}
                          </span>
                        </div>
                        <div className="was-tpl-name">{t.name}</div>
                        <div className="was-tpl-body">{body || '—'}</div>
                        <div className="was-tpl-foot">
                          <span className="was-tpl-meta-item">{IC.info}{t.language || 'en'}</span>
                          <span className="was-tpl-meta-item">{IC.tag}{vars} vars</span>
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
                      {testLoading?'Sending…':'Send Test Message'}
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
              {cannedLoading ? <div style={{padding:40,textAlign:'center'}}><Loader /></div> : (
                <div className="was-tpl-grid">
                  {cannedResponses.length === 0 ? (
                    <div className="was-empty-state" style={{gridColumn:'1/-1'}}>
                      <div style={{width:36,height:36,color:'#d1d5db'}}>{IC.tag}</div>
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
                        <button className="was-btn-secondary" style={{fontSize:11,padding:'3px 10px',color:'#ef4444'}} onClick={() => deleteCannedResponse(cr.id)}>Delete</button>
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
              {broadcastLoading ? <div style={{padding:40,textAlign:'center'}}><Loader /></div> : (
                <div className="was-tpl-grid">
                  {broadcasts.length === 0 ? (
                    <div className="was-empty-state" style={{gridColumn:'1/-1'}}>
                      <div style={{width:36,height:36,color:'#d1d5db'}}>{IC.send}</div>
                      <p>No broadcasts yet. Create a campaign to reach all your customers at once.</p>
                    </div>
                  ) : broadcasts.map(b => {
                    const statusColor = { draft:'#9ca3af', running:'#f59e0b', done:'#22c55e', failed:'#ef4444' }[b.status] || '#9ca3af';
                    return (
                      <div key={b.id} className="was-tpl-card">
                        <div className="was-tpl-card-top">
                          <span className="was-cat-badge was-cat--marketing">{b.template_name}</span>
                          <span style={{fontSize:11,color:statusColor,fontWeight:600}}>{b.status}</span>
                        </div>
                        <div className="was-tpl-name">{b.name}</div>
                        <div className="was-tpl-body" style={{fontSize:12}}>
                          Recipients: {b.total_recipients} · Sent: {b.sent_count} · Failed: {b.failed_count}
                        </div>
                        <div className="was-tpl-foot">
                          {(b.status === 'draft' || b.status === 'failed') && (
                            <button className="was-btn-primary" style={{fontSize:11,padding:'4px 12px'}} disabled={broadcastRunning === b.id} onClick={() => runBroadcast(b.id)}>
                              {broadcastRunning === b.id ? 'Starting…' : '▶ Run'}
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
                {statsLoading ? <div style={{padding:20}}><Loader /></div> : [
                  { label:'Messages Sent',    val: stats ? String(stats.sentMessages) : '—',      color:'#25D366', icon: IC.send },
                  { label:'Delivery Rate',    val: stats ? `${stats.deliveryRate}%` : '—',        color:'#3b82f6', icon: IC.check },
                  { label:'Read Rate',        val: stats ? `${stats.readRate}%` : '—',            color:'#f59e0b', icon: IC.eye },
                  { label:'Avg Response',     val: slaStats?.avgFirstResponseMinutes ? `${slaStats.avgFirstResponseMinutes}m` : '—', color:'#8b5cf6', icon: IC.phone },
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
                  {statsLoading ? <Loader /> : (() => {
                    const days = stats?.last7Days || [];
                    const maxVal = Math.max(...days.map(d => parseInt(d.count) || 0), 1);
                    return days.length === 0
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
            <Button variant="primary" type="submit" disabled={formLoading}>{formLoading?'Submitting…':'Submit to Meta'}</Button>
          </div>
        </form>
      </Modal>

      {/* ── Canned Response Modal ── */}
      <Modal isOpen={cannedModal} onClose={() => setCannedModal(false)} title={cannedEditId ? 'Edit Canned Response' : 'New Canned Response'} closeOnOverlayClick={false}>
        <form onSubmit={saveCannedResponse} className="seo-form">
          <div className="modal-body">
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Shortcut *</label>
                <input className="dm-input" value={cannedForm.shortcut} onChange={e => setCannedForm(p => ({...p, shortcut: e.target.value.toLowerCase().replace(/\s/g,'')}))} placeholder="/track" required />
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

      {/* ── Product / Catalogue Send Modal ── */}
      <Modal isOpen={productModal} onClose={() => setProductModal(false)} title={sendMode === 'single' ? 'Send Product Card' : 'Send Catalogue'} closeOnOverlayClick={false}>
        <div className="modal-body">
          <p style={{ fontSize:13, color:'#6b7280', marginBottom:12 }}>
            {sendMode === 'single'
              ? 'Select one product to send as an interactive card. Customer can tap to view and order.'
              : 'Select multiple products to send as a browsable catalogue. Max 30 items.'}
          </p>
          <input
            className="dm-input"
            placeholder="Search products…"
            value={productSearch}
            onChange={e => setProductSearch(e.target.value)}
            style={{ marginBottom:12 }}
          />
          <div style={{ maxHeight:320, overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
            {productLoading
              ? <div style={{ textAlign:'center', padding:20 }}><Loader /></div>
              : productList.length === 0
                ? <div style={{ textAlign:'center', color:'#9ca3af', fontSize:13, padding:20 }}>No products found</div>
                : productList.map(p => {
                  const selected = !!selectedProducts.find(x => x.id === p.id);
                  const price = p.ProductVariations?.[0]?.price || p.price || '—';
                  return (
                    <div
                      key={p.id}
                      onClick={() => toggleProduct(p)}
                      style={{
                        display:'flex', alignItems:'center', gap:10, padding:'8px 10px',
                        borderRadius:8, cursor:'pointer', border:`1.5px solid ${selected ? '#25D366' : '#e5e7eb'}`,
                        background: selected ? '#f0fdf4' : '#fff', transition:'all 0.15s'
                      }}
                    >
                      <div style={{
                        width:18, height:18, borderRadius:4, border:`2px solid ${selected ? '#25D366' : '#d1d5db'}`,
                        background: selected ? '#25D366' : 'transparent', flexShrink:0,
                        display:'flex', alignItems:'center', justifyContent:'center'
                      }}>
                        {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:13, fontWeight:500, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</div>
                        <div style={{ fontSize:11, color:'#6b7280' }}>₹{price} · ID: {p.id}</div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
          {selectedProducts.length > 0 && (
            <div style={{ marginTop:10, fontSize:12, color:'#25D366', fontWeight:500 }}>
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
            {sendingProduct ? 'Sending…' : `Send ${sendMode === 'single' ? 'Product' : 'Catalogue'}`}
          </button>
        </div>
      </Modal>

    </div>
  );
}
