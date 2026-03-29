import { useState, useEffect } from 'react';
import { Modal, Button } from '../../components/ui';
import Loader from '../../components/common/Loader';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandService } from '../../services';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IC = {
  wa:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  send:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  add:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  seed:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12M12 12C12 7 7 3 2 3c0 5 4 9 10 9zM12 12c0-5 5-9 10-9-1 5-5 9-10 9z"/></svg>,
  copy:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  phone:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>,
  list:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  refresh:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  check:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  trash:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
};

// ─── Template presets ─────────────────────────────────────────────────────────
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
  order_confirm:    { name:'order_confirmation',       title:'Order Confirmed',    icon:'order_confirm',    category:'UTILITY',   body:'Hi! Your *Cross Coin* order *#{{1}}* has been placed successfully.\n\nItems: {{2}}\nTotal: Rs. {{3}}\nEstimated delivery: {{4}}\n\nWe will notify you once it ships. Thank you for shopping with us!', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  order_shipped:    { name:'order_shipped',            title:'Order Shipped',      icon:'order_shipped',    category:'UTILITY',   body:'Great news! Your *Cross Coin* order *#{{1}}* has been shipped.\n\nAWB Number: {{2}}\nTrack your order: {{3}}\n\nExpect delivery in 2-5 business days.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  out_for_delivery: { name:'order_out_for_delivery',   title:'Out for Delivery',   icon:'out_for_delivery', category:'UTILITY',   body:'Your *Cross Coin* order *#{{1}}* is out for delivery today!\n\nCourier: {{2}}\n\nPlease keep your phone handy and ensure someone is available to receive the package.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  order_delivered:  { name:'order_delivered',          title:'Order Delivered',    icon:'order_delivered',  category:'UTILITY',   body:'Your *Cross Coin* order *#{{1}}* has been delivered!\n\nWe hope you love your purchase. Your feedback means the world to us.\n\nHave an issue? Just reply to this message.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  cart_abandon:     { name:'cart_abandoned',           title:'Cart Abandoned',     icon:'cart_abandon',     category:'MARKETING', body:'Hey {{1}}!\n\nYour {{2}} is still waiting in your Cross Coin cart.\n\nUse code {{3}} for an extra 10% OFF - but hurry, it expires in 24 hours!\n\nComplete your order now.', footer:'Cross Coin - crosscoin.in', btn1:{type:'URL',text:'Complete Purchase',val:'https://crosscoin.in/cart'}, btn2:'' },
  cod_confirm:      { name:'cod_order_confirmation',   title:'COD Confirmation',   icon:'cod_confirm',      category:'UTILITY',   body:'Hi! We received your Cash on Delivery order #{{1}} for Rs. {{2}} from Cross Coin.\n\nDelivery to: {{3}}\n\nPlease keep Rs. {{2}} ready at the time of delivery.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  review_request:   { name:'review_request',           title:'Review Request',     icon:'review_request',   category:'MARKETING', body:'Hi {{1}}!\n\nWe hope you are loving your {{2}} from Cross Coin.\n\nA quick review takes just 30 seconds and helps thousands of shoppers. We would really appreciate it!\n\n{{3}}', footer:'Cross Coin - Thank You!', btn1:{type:'URL',text:'Write a Review',val:'https://crosscoin.in/review'}, btn2:'' },
  return_initiated: { name:'order_cancelled',          title:'Return / Cancelled', icon:'return_initiated',  category:'UTILITY',   body:'Your Cross Coin order #{{1}} has been cancelled.\n\nRefund info: {{2}}\n\nIf you have any questions, reply to this message or visit crosscoin.in.', footer:'Cross Coin - crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  refund_update:    { name:'refund_processed',         title:'Refund Processed',   icon:'refund_update',    category:'UTILITY',   body:'Good news! Your refund of Rs. {{2}} for Cross Coin order #{{1}} has been processed.\n\nRefund to: {{3}}\nExpected credit: 5-7 working days\n\nThank you for your patience.', footer:'Cross Coin - Happy to Help', btn1:{type:'',text:'',val:''}, btn2:'' },
};

const SIDEBAR_GROUPS = [
  { label: 'Order Templates', keys: ['order_confirm','order_shipped','out_for_delivery','order_delivered'] },
  { label: 'Cart & Recovery',  keys: ['cart_abandon','cod_confirm'] },
  { label: 'Post-Order',       keys: ['review_request','return_initiated','refund_update'] },
];

const SAMPLES = ['CC-20240601-0042','3 items','1,299','BlueDart','BD9812345678','SAVE10','Surat, Gujarat - 395006','https://crosscoin.in/track/CC-20240601-0042','CrossCoin Ankle Socks'];
const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

const EMPTY_FORM = { name:'', category:'UTILITY', language:'en', headerType:'none', headerText:'', body:'', footer:'', btn1Type:'', btn1Text:'', btn1Val:'', btn2Text:'' };

export default function WhatsAppManager() {
  const [tab, setTab] = useState('create');
  const [activeKey, setActiveKey] = useState('order_confirm');
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [templateList, setTemplateList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [response, setResponse] = useState(null);
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    brandService.getAllBrands(true).then(r => { if (r.success) setBrands(r.data); }).catch(() => {});
  }, []);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const previewBody = (TEMPLATES[activeKey]?.body || '')
    .replace(/\{\{(\d+)\}\}/g, (_, n) => SAMPLES[n - 1] || `{{${n}}}`)
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');

  const buildPayload = () => {
    const components = [];
    if (form.headerType !== 'none') {
      const h = { type: 'HEADER', format: form.headerType };
      if (form.headerType === 'TEXT') h.text = form.headerText;
      components.push(h);
    }
    const bodyComp = { type: 'BODY', text: form.body };
    const vars = form.body.match(/\{\{\d+\}\}/g) || [];
    if (vars.length) bodyComp.example = { body_text: [vars.map(() => 'SampleValue')] };
    components.push(bodyComp);
    if (form.footer) components.push({ type: 'FOOTER', text: form.footer });
    const buttons = [];
    if (form.btn1Type && form.btn1Text) {
      const b = { type: form.btn1Type, text: form.btn1Text };
      if (form.btn1Type === 'URL') b.url = form.btn1Val;
      if (form.btn1Type === 'PHONE_NUMBER') b.phone_number = form.btn1Val;
      buttons.push(b);
    }
    if (form.btn2Text) buttons.push({ type: 'QUICK_REPLY', text: form.btn2Text });
    if (buttons.length) components.push({ type: 'BUTTONS', buttons });
    return { name: form.name, language: form.language, category: form.category, components };
  };

  const createTemplate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { showError('fieldRequired'); return; }
    setLoading(true); setResponse(null);
    try {
      const res = await fetch(`${API}/api/whatsapp/templates`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId, ...buildPayload() }) });
      const data = await res.json();
      if (data.success) { showSuccess('templateCreated'); setCreateModal(false); setResponse({ type: 'success', text: JSON.stringify(data.result, null, 2) }); fetchTemplates(); }
      else setResponse({ type: 'error', text: data.message || JSON.stringify(data) });
    } catch (e) { setResponse({ type: 'error', text: e.message }); }
    setLoading(false);
  };

  const fetchTemplates = async () => {
    setListLoading(true);
    try {
      const res = await fetch(`${API}/api/whatsapp/templates?brandId=${brandId}`);
      const data = await res.json();
      if (data.success) setTemplateList(data.templates || []);
      else showError('loadingFailed');
    } catch { showError('loadingFailed'); }
    setListLoading(false);
  };

  const sendTest = async (e) => {
    e.preventDefault();
    if (!testPhone.trim()) { showError('fieldRequired'); return; }
    setTestLoading(true);
    try {
      const res = await fetch(`${API}/api/whatsapp/test`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brandId, phone: testPhone }) });
      const data = await res.json();
      if (data.success) showSuccess('messageSent');
      else showError('sendFailed', data.message);
    } catch (e) { showError('sendFailed', e.message); }
    setTestLoading(false);
  };

  const copyJSON = () => {
    const t = TEMPLATES[activeKey];
    if (!t) return;
    navigator.clipboard.writeText(JSON.stringify({ name: t.name, category: t.category, language: 'en' }, null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => { if (tab === 'list') fetchTemplates(); }, [tab, brandId]);

  return (
    <div className="dashboard-page">

      {/* ── Page Header ── */}
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div className="sl-header-icon">{IC.wa}</div>
          <div>
            <h1 className="sl-page-title">WhatsApp Manager</h1>
            <p className="sl-page-sub">Create & manage message templates · Send test messages</p>
          </div>
        </div>
        <div className="sl-header-right">
          {brands.length > 1 && (
            <select className="bset-brand-select" value={brandId} onChange={e => setBrandId(Number(e.target.value))}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.display_name || b.name}</option>)}
            </select>
          )}
          <button className="sl-add-btn" onClick={() => { setForm(EMPTY_FORM); setCreateModal(true); }}>
            <span className="sl-add-btn-icon">{IC.add}</span>New Template
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="bset-category-tabs" style={{ marginBottom: 20 }}>
        {[['create','✏️ Create'],['list','📋 Library'],['test','📱 Test']].map(([k, l]) => (
          <button key={k} className={`bset-cat-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── CREATE TAB ── */}
      {tab === 'create' && (
        <div className="wa-create-layout">

          {/* Sidebar */}
          <div className="wa-sidebar-panel">
            {SIDEBAR_GROUPS.map(g => (
              <div key={g.label} className="wa-sb-group">
                <div className="bset-cat-tab" style={{ pointerEvents:'none', background:'transparent', color:'#9ca3af', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', padding:'0 0 6px', border:'none' }}>{g.label}</div>
                {g.keys.map(k => {
                  const t = TEMPLATES[k];
                  return (
                    <button key={k} className={`wa-sb-item${activeKey === k ? ' active' : ''}`} onClick={() => setActiveKey(k)}>
                      <span className="wa-sb-item-icon">{TPL_ICONS[t.icon]}</span>
                      <span className="wa-sb-item-name">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Form area — preview only */}
          <div className="wa-form-col">
            <div className="bset-settings-grid" style={{ gridTemplateColumns:'1fr' }}>

              {/* Template info */}
              <div className="bset-setting-card">
                <div className="bset-setting-header">
                  <div className="bset-setting-info">
                    <h4 className="bset-setting-key">{TEMPLATES[activeKey]?.title}</h4>
                    <span className="sl-cat-badge">{TEMPLATES[activeKey]?.category}</span>
                  </div>
                  <button className="sl-btn-edit" title="Copy JSON" onClick={copyJSON}>{copied ? IC.check : IC.copy}</button>
                </div>
                <div className="bset-setting-body">
                  <div className="dm-field">
                    <label className="dm-label">Template Name</label>
                    <div className="bset-value-display" style={{ fontFamily:'monospace', fontSize:12, background:'#f9fafb', padding:'8px 12px', borderRadius:6, border:'1px solid #e5e7eb' }}>{TEMPLATES[activeKey]?.name}</div>
                  </div>
                </div>
              </div>

              {/* Body preview */}
              <div className="bset-setting-card">
                <div className="bset-setting-header"><div className="bset-setting-info"><h4 className="bset-setting-key">Message Body</h4></div></div>
                <div className="bset-setting-body">
                  <div style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:6, padding:'10px 12px', fontFamily:'monospace', fontSize:12, lineHeight:1.7, color:'#374151', whiteSpace:'pre-wrap' }}>
                    {TEMPLATES[activeKey]?.body}
                  </div>
                  {TEMPLATES[activeKey]?.footer && (
                    <div style={{ marginTop:8, fontSize:11, color:'#9ca3af', fontStyle:'italic' }}>{TEMPLATES[activeKey].footer}</div>
                  )}
                </div>
              </div>

              {/* Variables guide */}
              <div className="bset-setting-card">
                <div className="bset-setting-header"><div className="bset-setting-info"><h4 className="bset-setting-key">Variables</h4></div></div>
                <div className="bset-setting-body">
                  {(() => {
                    const vars = (TEMPLATES[activeKey]?.body || '').match(/\{\{\d+\}\}/g) || [];
                    const unique = [...new Set(vars)].sort();
                    if (!unique.length) return <p style={{ fontSize:12, color:'#9ca3af' }}>No variables in this template.</p>;
                    return (
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {unique.map(v => (
                          <span key={v} style={{ background:'#f0f9ff', border:'1px solid #bae6fd', color:'#0369a1', borderRadius:5, padding:'3px 10px', fontSize:12, fontFamily:'monospace' }}>{v} = {SAMPLES[parseInt(v.replace(/\D/g,'')) - 1] || '...'}</span>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

            </div>
          </div>

          {/* Phone preview */}
          <div className="wa-preview-col">
            <div className="bset-setting-card" style={{ position:'sticky', top:20 }}>
              <div className="bset-setting-header"><div className="bset-setting-info"><h4 className="bset-setting-key">📱 Live Preview</h4></div></div>
              <div className="bset-setting-body" style={{ display:'flex', justifyContent:'center', padding:'16px 0' }}>
                <div className="wa-phone-shell">
                  <div className="wa-phone-notch"><div className="wa-phone-pill" /></div>
                  <div className="wa-phone-chat">
                    <div className="wa-bubble">
                      <div className="wa-bubble-header">
                        <span style={{ width:32, height:32, display:'flex', color:'#fff' }}>{TPL_ICONS[TEMPLATES[activeKey]?.icon] || IC.wa}</span>
                      </div>
                      <div className="wa-bubble-body">
                        <div className="wa-bubble-text" dangerouslySetInnerHTML={{ __html: previewBody }} />
                      </div>
                      {TEMPLATES[activeKey]?.footer && <div className="wa-bubble-footer">{TEMPLATES[activeKey].footer}</div>}
                      <div className="wa-bubble-time">Just now ✓✓</div>
                      {TEMPLATES[activeKey]?.btn1?.text && <button className="wa-bubble-btn">{TEMPLATES[activeKey].btn1.text}</button>}
                      {TEMPLATES[activeKey]?.btn2 && <button className="wa-bubble-btn">{TEMPLATES[activeKey].btn2}</button>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <div className="sl-table-wrap">
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <button className="sl-add-btn" onClick={fetchTemplates} disabled={listLoading}>
              <span className="sl-add-btn-icon">{IC.refresh}</span>{listLoading ? 'Loading…' : 'Refresh'}
            </button>
          </div>
          {listLoading ? <div className="sl-loader-wrap"><Loader /></div>
          : templateList.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.list}</div>
              <p>No templates found. Click Refresh or Seed Defaults.</p>
            </div>
          ) : (
            <div className="bset-settings-grid">
              {templateList.map(t => (
                <div key={t.id || t.name} className="bset-setting-card">
                  <div className="bset-setting-header">
                    <div className="bset-setting-info">
                      <h4 className="bset-setting-key">{t.name}</h4>
                      <span className="sl-cat-badge">{t.category}</span>
                    </div>
                    <span className={`sl-status-badge sl-status-${(t.status||'').toLowerCase()}`}>{t.status || 'UNKNOWN'}</span>
                  </div>
                  <div className="bset-setting-body">
                    <div className="bset-value-display" style={{ fontSize:12, color:'#6b7280' }}>Language: {t.language}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TEST TAB ── */}
      {tab === 'test' && (
        <div style={{ maxWidth: 480 }}>
          <div className="bset-setting-card">
            <div className="bset-setting-header"><div className="bset-setting-info"><h4 className="bset-setting-key">Send Test Message</h4></div></div>
            <div className="bset-setting-body">
              <p style={{ fontSize:13, color:'#6b7280', marginBottom:14, lineHeight:1.5 }}>
                Sends a plain text ping to verify your WhatsApp credentials are working correctly.
              </p>
              <form onSubmit={sendTest}>
                <div className="dm-field" style={{ marginBottom:16 }}>
                  <label className="dm-label">Phone Number</label>
                  <div style={{ display:'flex', alignItems:'center', border:'1.5px solid #e5e7eb', borderRadius:8, overflow:'hidden' }}>
                    <span style={{ padding:'0 12px', background:'#f9fafb', borderRight:'1.5px solid #e5e7eb', fontSize:13, color:'#6b7280', height:40, display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                      <span style={{ width:14, height:14, display:'flex' }}>{IC.phone}</span>+91
                    </span>
                    <input
                      style={{ border:'none', outline:'none', padding:'0 12px', fontSize:13, flex:1, height:40, background:'#fff' }}
                      value={testPhone}
                      onChange={e => setTestPhone(e.target.value.replace(/\D/g,'').slice(0,10))}
                      placeholder="10-digit mobile"
                      inputMode="numeric"
                      maxLength={10}
                    />
                  </div>
                </div>
                <button type="submit" className="sl-add-btn" disabled={testLoading || testPhone.length < 10}>
                  <span className="sl-add-btn-icon">{IC.send}</span>{testLoading ? 'Sending…' : 'Send Test Message'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Modal ── */}
      <Modal isOpen={createModal} onClose={() => setCreateModal(false)} title="Submit Template to Meta" closeOnOverlayClick={false}>
        <form onSubmit={createTemplate} className="seo-form">
          <div className="modal-body">
            <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, padding:'10px 14px', fontSize:12, color:'#92400e', marginBottom:14, lineHeight:1.5 }}>
              Template name must be lowercase with underscores only. Approval takes 5 min – a few hours.
            </div>
            <div className="dm-2col">
              <div className="dm-field">
                <label className="dm-label">Template Name *</label>
                <input className="dm-input" value={form.name} onChange={e => set('name', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,''))} placeholder="order_confirmation" required />
              </div>
              <div className="dm-field">
                <label className="dm-label">Category</label>
                <select className="dm-input dm-select" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="UTILITY">UTILITY</option>
                  <option value="MARKETING">MARKETING</option>
                  <option value="AUTHENTICATION">AUTHENTICATION</option>
                </select>
              </div>
            </div>
            <div className="dm-field">
              <label className="dm-label">Body *</label>
              <textarea className="dm-input dm-textarea" rows={5} value={form.body} onChange={e => set('body', e.target.value)} style={{ fontFamily:'monospace', fontSize:12 }} required />
            </div>
            <div className="dm-field">
              <label className="dm-label">Footer</label>
              <input className="dm-input" value={form.footer} onChange={e => set('footer', e.target.value)} />
            </div>
            {response && (
              <div className={`wa-response wa-response-${response.type}`} style={{ marginTop:12 }}>
                <pre>{response.text}</pre>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <Button variant="secondary" type="button" onClick={() => setCreateModal(false)} disabled={loading}>Cancel</Button>
            <Button variant="primary" type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit to Meta'}</Button>
          </div>
        </form>
      </Modal>

      <style>{`
        .wa-create-layout { display:grid; grid-template-columns:200px 1fr 260px; gap:20px; align-items:start; }
        .wa-sidebar-panel { background:#fff; border:1.5px solid #e5e7eb; border-radius:12px; padding:14px 10px; }
        .wa-sb-group { margin-bottom:16px; }
        .wa-sb-item { width:100%; text-align:left; background:transparent; border:1.5px solid transparent; border-radius:8px; padding:8px 10px; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:12px; color:#6b7280; transition:all 0.15s; margin-bottom:2px; font-family:inherit; }
        .wa-sb-item:hover { background:#f9fafb; color:#111827; }
        .wa-sb-item.active { background:#fff0f2; border-color:#CE1E36; color:#CE1E36; font-weight:600; }
        .wa-sb-item-icon { width:15px; height:15px; display:flex; flex-shrink:0; }
        .wa-sb-item-icon svg { width:100%; height:100%; }
        .wa-sb-item-name { font-size:12px; }        .wa-form-col { display:flex; flex-direction:column; gap:16px; }
        .wa-preview-col {}
        .wa-phone-shell { width:220px; background:#111; border-radius:26px; border:5px solid #222; overflow:hidden; box-shadow:0 12px 40px rgba(0,0,0,0.12); }
        .wa-phone-notch { background:#111; height:22px; display:flex; align-items:center; justify-content:center; }
        .wa-phone-pill { width:48px; height:6px; background:#222; border-radius:3px; }
        .wa-phone-chat { background:#ECE5DD; min-height:320px; padding:10px 8px; }
        .wa-bubble { background:#fff; border-radius:0 10px 10px 10px; max-width:95%; box-shadow:0 1px 2px rgba(0,0,0,0.1); overflow:hidden; }
        .wa-bubble-header { background:linear-gradient(135deg,#25D366,#128C7E); height:90px; display:flex; align-items:center; justify-content:center; font-size:26px; }
        .wa-bubble-body { padding:8px 10px 4px; }
        .wa-bubble-text { font-size:11px; color:#333; line-height:1.5; }
        .wa-bubble-footer { font-size:10px; color:#888; padding:0 10px 4px; font-style:italic; }
        .wa-bubble-time { text-align:right; font-size:10px; color:#aaa; padding:0 10px 6px; }
        .wa-bubble-btn { width:100%; border:none; border-top:1px solid #f0f0f0; background:transparent; padding:7px; font-size:11px; color:#128C7E; font-weight:600; cursor:pointer; display:block; font-family:inherit; }
        .wa-response { border-radius:8px; padding:12px; font-size:11px; font-family:monospace; max-height:180px; overflow-y:auto; }
        .wa-response pre { white-space:pre-wrap; word-break:break-all; margin:0; }
        .wa-response-success { background:#f0fdf4; border:1px solid #bbf7d0; color:#166534; }
        .wa-response-error { background:#fef2f2; border:1px solid #fecaca; color:#991b1b; }
        @media (max-width:1100px) { .wa-create-layout { grid-template-columns:1fr; } .wa-preview-col { display:none; } }
      `}</style>
    </div>
  );
}
