// When accessed directly, render full dashboard shell
export { default } from './index';

import { useState, useEffect, useRef } from 'react';
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
  const [convLoading, setConvLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('open');
  const [convSearch, setConvSearch] = useState('');
  // Test
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);

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
      const data = await whatsappService.sendReply(activeConv.id, reply.trim(), brandId);
      if (data.success) { setMessages(prev => [...prev, data.message]); setReply(''); }
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

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);
  useEffect(() => { if (page === 'inbox') fetchConversations(); }, [page, statusFilter, brandId]);
  useEffect(() => { if (page === 'library' || page === 'templates') fetchTemplates(); }, [page, brandId]);
  useEffect(() => { if (page === 'dashboard') fetchStats(); }, [page, brandId]);
  useEffect(() => {
    if (!activeConv) return;
    pollRef.current = setInterval(() => fetchMessages(activeConv), 10000);
    return () => clearInterval(pollRef.current);
  }, [activeConv?.id]);

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
    { k:'dashboard',  label:'Dashboard',      icon: IC.dash,    section: 'Main' },
    { k:'inbox',      label:'Conversations',   icon: IC.msg,     badge: unreadCount || null },
    { k:'templates',  label:'Templates',       icon: IC.tpl,     badge: templateList.length || null },
    { k:'library',    label:'Library',         icon: IC.eye,     section: 'Messaging' },
    { k:'test',       label:'Test Message',    icon: IC.phone },
    { k:'analytics',  label:'Analytics',       icon: IC.bar,     section: 'Account' },
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
                  <div className="was-messages">
                    {msgLoading ? <div style={{textAlign:'center',padding:20}}><Loader /></div>
                    : messages.length === 0 ? <div className="was-no-msgs">No messages yet</div>
                    : messages.map(msg => (
                      <div key={msg.id} className={`was-msg was-msg--${msg.direction}`}>
                        <div className="was-msg-bubble">{msg.body}</div>
                        <div className="was-msg-meta">
                          {formatTime(msg.sent_at||msg.createdAt)}
                          {msg.direction==='outbound' && <span style={{color:msg.status==='read'?'#53bdeb':'#9ca3af'}}>{msg.status==='read'||msg.status==='delivered'?' ✓✓':' ✓'}</span>}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                  {activeConv.status === 'open' ? (
                    <form className="was-reply-box" onSubmit={sendReply}>
                      <textarea className="was-reply-input" placeholder="Type a message…" value={reply}
                        onChange={e => setReply(e.target.value)}
                        onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey) { e.preventDefault(); sendReply(e); } }}
                        rows={2} />
                      <button type="submit" className="was-send-btn" disabled={sending||!reply.trim()}>{IC.send}</button>
                    </form>
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

        {/* ── ANALYTICS ── */}
        {page === 'analytics' && (
          <div className="was-scroll">
            <div className="was-content-pad">
              <div className="was-page-head">
                <h2 className="was-page-title">Analytics</h2>
                <span className="was-page-sub">Coming soon — detailed message analytics</span>
              </div>
              <div className="was-coming-soon">
                <div style={{width:52,height:52,color:'#d1d5db'}}>{IC.bar}</div>
                <h3>Analytics Coming Soon</h3>
                <p>Detailed delivery, open rate, and campaign analytics will be available here.</p>
              </div>
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

    </div>
  );
}
