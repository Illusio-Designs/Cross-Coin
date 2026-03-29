import { useState, useEffect, useRef } from 'react';
import { showSuccess, showError } from '../../utils/toastNotification';
import { brandService } from '../../services';
import Loader from '../../components/common/Loader';

// ─── Icons ────────────────────────────────────────────────────────────────────
const IC = {
  wa:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  send:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  list:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  plus:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  seed:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22V12M12 12C12 7 7 3 2 3c0 5 4 9 10 9zM12 12c0-5 5-9 10-9-1 5-5 9-10 9z"/></svg>,
  test:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v11m0 0H5a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2h-4m-6 0h6"/></svg>,
  copy:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>,
  phone:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  trash:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>,
};

// ─── Template presets ─────────────────────────────────────────────────────────
const TEMPLATES = {
  order_confirm:    { name:'order_confirmation',        title:'Order Confirmed',      emoji:'✅', category:'UTILITY',   body:'Hi! Your *Cross Coin* order *#{{1}}* has been placed successfully. 🎉\n\n📦 Items: {{2}}\n💰 Total: ₹{{3}}\n🚚 Estimated delivery: {{4}}\n\nWe\'ll notify you once it ships. Thank you for shopping with us!', footer:'Cross Coin — crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  order_shipped:    { name:'order_shipped',             title:'Order Shipped',         emoji:'🚚', category:'UTILITY',   body:'Great news! Your *Cross Coin* order *#{{1}}* has been shipped. 📦\n\n🏷️ AWB Number: *{{2}}*\n🔍 Track your order: {{3}}\n\nExpect delivery in 2–5 business days. Stay home!', footer:'Cross Coin — crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  out_for_delivery: { name:'order_out_for_delivery',    title:'Out for Delivery',      emoji:'📦', category:'UTILITY',   body:'Your *Cross Coin* order *#{{1}}* is out for delivery today! 🚴\n\nCourier: *{{2}}*\n\nPlease keep your phone handy and ensure someone is available to receive the package.', footer:'Cross Coin — crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  order_delivered:  { name:'order_delivered',           title:'Order Delivered',       emoji:'🎉', category:'UTILITY',   body:'Your *Cross Coin* order *#{{1}}* has been delivered! 🎉\n\nWe hope you love your purchase. Your feedback means the world to us — drop us a review!\n\nHave an issue? Just reply to this message.', footer:'Cross Coin — crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  cart_abandon:     { name:'cart_abandoned',            title:'Cart Abandoned',        emoji:'🛒', category:'MARKETING', body:'Hey {{1}}! 👀\n\nYour *{{2}}* is still waiting in your *Cross Coin* cart.\n\nUse code *{{3}}* for an extra *10% OFF* — but hurry, it expires in 24 hours! ⏳\n\nComplete your order now 👇', footer:'Cross Coin — crosscoin.in', btn1:{type:'URL',text:'Complete Purchase',val:'https://crosscoin.in/cart'}, btn2:'' },
  cod_confirm:      { name:'cod_order_confirmation',    title:'COD Confirmation',      emoji:'💵', category:'UTILITY',   body:'Hi! We received your Cash on Delivery order *#{{1}}* for *₹{{2}}* from *Cross Coin*.\n\n📍 Delivery to: {{3}}\n\nPlease keep *₹{{2}}* ready at the time of delivery. Reply CANCEL within 2 hours to cancel.', footer:'Cross Coin — crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  review_request:   { name:'review_request',            title:'Review Request',        emoji:'⭐', category:'MARKETING', body:'Hi {{1}}! 👋\n\nWe hope you\'re loving your *{{2}}* from *Cross Coin*.\n\nA quick review takes just 30 seconds and helps thousands of shoppers make better choices. We\'d really appreciate it! 🙏\n\n👉 {{3}}', footer:'Cross Coin — Thank You!', btn1:{type:'URL',text:'Write a Review',val:'https://crosscoin.in/review'}, btn2:'' },
  return_initiated: { name:'order_cancelled',           title:'Return / Cancelled',    emoji:'↩️', category:'UTILITY',   body:'Your *Cross Coin* order *#{{1}}* has been cancelled.\n\n💳 Refund info: {{2}}\n\nIf you have any questions, reply to this message or visit crosscoin.in.', footer:'Cross Coin — crosscoin.in', btn1:{type:'',text:'',val:''}, btn2:'' },
  refund_update:    { name:'refund_processed',          title:'Refund Processed',      emoji:'💰', category:'UTILITY',   body:'Good news! Your refund of *₹{{2}}* for *Cross Coin* order *#{{1}}* has been processed. ✅\n\nRefund to: *{{3}}*\nExpected credit: 5–7 working days\n\nThank you for your patience. We hope to serve you again!', footer:'Cross Coin — Happy to Help', btn1:{type:'',text:'',val:''}, btn2:'' },
};

const SIDEBAR_GROUPS = [
  { label: '📦 Order Templates', keys: ['order_confirm','order_shipped','out_for_delivery','order_delivered'] },
  { label: '🛒 Cart & Recovery',  keys: ['cart_abandon','cod_confirm'] },
  { label: '💬 Post-Order',       keys: ['review_request','return_initiated','refund_update'] },
];

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WhatsAppManager() {
  const [tab, setTab] = useState('create');           // create | list | test
  const [activeKey, setActiveKey] = useState('order_confirm');
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [templateList, setTemplateList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [response, setResponse] = useState(null);     // { type, text }
  const [testPhone, setTestPhone] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form state
  const [form, setForm] = useState({ name:'', category:'UTILITY', language:'en', headerType:'none', headerText:'', body:'', footer:'', btn1Type:'', btn1Text:'', btn1Val:'', btn2Text:'' });

  useEffect(() => {
    brandService.getAllBrands(true).then(r => { if (r.success) setBrands(r.data); }).catch(() => {});
  }, []);

  // Load preset into form
  useEffect(() => {
    const t = TEMPLATES[activeKey];
    if (!t) return;
    setForm({ name: t.name, category: t.category, language: 'en', headerType: 'none', headerText: '', body: t.body, footer: t.footer, btn1Type: t.btn1.type, btn1Text: t.btn1.text, btn1Val: t.btn1.val, btn2Text: t.btn2 });
    setResponse(null);
  }, [activeKey]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // ── Preview body ──────────────────────────────────────────────────────────
  const SAMPLES = ['CC-20240601-0042', '3 items', '1,299', 'BlueDart', 'BD9812345678', 'SAVE10', 'Surat, Gujarat - 395006', 'https://crosscoin.in/track/CC-20240601-0042', 'CrossCoin Ankle Socks'];
  const previewBody = form.body.replace(/\{\{(\d+)\}\}/g, (_, n) => SAMPLES[n-1] || `{{${n}}}`).replace(/\*(.*?)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');

  // ── Build API payload ─────────────────────────────────────────────────────
  const buildPayload = () => {
    const components = [];
    if (form.headerType !== 'none') {
      const h = { type:'HEADER', format: form.headerType };
      if (form.headerType === 'TEXT') h.text = form.headerText;
      components.push(h);
    }
    const bodyComp = { type:'BODY', text: form.body };
    const vars = form.body.match(/\{\{\d+\}\}/g) || [];
    if (vars.length) bodyComp.example = { body_text: [vars.map(() => 'SampleValue')] };
    components.push(bodyComp);
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
    return { name: form.name, language: form.language, category: form.category, components };
  };

  // ── API calls ─────────────────────────────────────────────────────────────
  const createTemplate = async () => {
    if (!form.name.trim()) { showError('fieldRequired'); return; }
    setLoading(true); setResponse(null);
    try {
      const res = await fetch(`${API}/api/whatsapp/templates`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ brandId, ...buildPayload() }) });
      const data = await res.json();
      if (data.success) { showSuccess('templateCreated'); setResponse({ type:'success', text: JSON.stringify(data.result, null, 2) }); }
      else { setResponse({ type:'error', text: data.message || JSON.stringify(data) }); }
    } catch(e) { setResponse({ type:'error', text: e.message }); }
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

  const seedTemplates = async () => {
    setSeedLoading(true); setResponse(null);
    try {
      const res = await fetch(`${API}/api/whatsapp/templates/seed`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ brandId }) });
      const data = await res.json();
      if (data.success) { showSuccess('templateCreated'); setResponse({ type:'success', text: JSON.stringify(data.results, null, 2) }); }
      else setResponse({ type:'error', text: data.message });
    } catch(e) { setResponse({ type:'error', text: e.message }); }
    setSeedLoading(false);
  };

  const sendTest = async () => {
    if (!testPhone.trim()) { showError('fieldRequired'); return; }
    setTestLoading(true);
    try {
      const res = await fetch(`${API}/api/whatsapp/test`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ brandId, phone: testPhone }) });
      const data = await res.json();
      if (data.success) showSuccess('messageSent');
      else showError('sendFailed', data.message);
    } catch(e) { showError('sendFailed', e.message); }
    setTestLoading(false);
  };

  const copyJSON = () => {
    navigator.clipboard.writeText(JSON.stringify(buildPayload(), null, 2));
    setCopied(true); setTimeout(() => setCopied(false), 1500);
  };

  useEffect(() => { if (tab === 'list') fetchTemplates(); }, [tab]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="wa-wrap">
      {/* Page header */}
      <div className="wa-page-header">
        <div className="wa-page-header-left">
          <span className="wa-page-icon">{IC.wa}</span>
          <div>
            <h1 className="wa-page-title">WhatsApp Manager</h1>
            <p className="wa-page-sub">Create & manage message templates · Send test messages</p>
          </div>
        </div>
        <div className="wa-header-actions">
          {brands.length > 1 && (
            <select className="wa-brand-select" value={brandId} onChange={e => setBrandId(Number(e.target.value))}>
              {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          )}
          <button className="wa-btn wa-btn-outline" onClick={seedTemplates} disabled={seedLoading}>
            {IC.seed}{seedLoading ? 'Seeding…' : 'Seed Defaults'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="wa-tabs">
        {[['create','✏️ Create Template'],['list','📋 Template Library'],['test','📱 Test Message']].map(([k,l]) => (
          <button key={k} className={`wa-tab${tab===k?' wa-tab-active':''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ── CREATE TAB ── */}
      {tab === 'create' && (
        <div className="wa-create-layout">
          {/* Sidebar */}
          <div className="wa-sidebar">
            {SIDEBAR_GROUPS.map(g => (
              <div key={g.label} className="wa-sb-group">
                <div className="wa-sb-label">{g.label}</div>
                {g.keys.map(k => {
                  const t = TEMPLATES[k];
                  return (
                    <button key={k} className={`wa-sb-btn${activeKey===k?' wa-sb-btn-active':''}`} onClick={() => setActiveKey(k)}>
                      <span className="wa-sb-emoji">{t.emoji}</span>
                      <span className="wa-sb-name">{t.title}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="wa-form-area">
            <div className="wa-card">
              <div className="wa-card-title">Template Identity</div>
              <div className="wa-field-row wa-row-3">
                <div className="wa-field">
                  <label>Template Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="crosscoin_order_confirmed" />
                </div>
                <div className="wa-field">
                  <label>Category</label>
                  <select value={form.category} onChange={e => set('category', e.target.value)}>
                    <option value="UTILITY">UTILITY</option>
                    <option value="MARKETING">MARKETING</option>
                    <option value="AUTHENTICATION">AUTHENTICATION</option>
                  </select>
                </div>
                <div className="wa-field">
                  <label>Language</label>
                  <select value={form.language} onChange={e => set('language', e.target.value)}>
                    <option value="en">English</option>
                    <option value="en_US">English US</option>
                    <option value="hi">Hindi</option>
                    <option value="gu">Gujarati</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="wa-card">
              <div className="wa-card-title">Message Body *</div>
              <div className="wa-field">
                <label>Body text — use {'{{1}}'}, {'{{2}}'} for variables</label>
                <textarea rows={5} value={form.body} onChange={e => set('body', e.target.value)} />
              </div>
              <div className="wa-field" style={{ marginTop: 12 }}>
                <label>Footer (optional)</label>
                <input value={form.footer} onChange={e => set('footer', e.target.value)} placeholder="CrossCoin — Wear Your Style" />
              </div>
            </div>

            <div className="wa-card">
              <div className="wa-card-title">Buttons (optional)</div>
              <div className="wa-field-row">
                <div className="wa-field">
                  <label>Button 1 Type</label>
                  <select value={form.btn1Type} onChange={e => set('btn1Type', e.target.value)}>
                    <option value="">None</option>
                    <option value="URL">URL</option>
                    <option value="PHONE_NUMBER">Phone Number</option>
                    <option value="QUICK_REPLY">Quick Reply</option>
                  </select>
                </div>
                <div className="wa-field">
                  <label>Button 1 Text</label>
                  <input value={form.btn1Text} onChange={e => set('btn1Text', e.target.value)} placeholder="Track Order" />
                </div>
              </div>
              <div className="wa-field-row">
                <div className="wa-field">
                  <label>Button 1 URL / Phone</label>
                  <input value={form.btn1Val} onChange={e => set('btn1Val', e.target.value)} placeholder="https://crosscoin.in/track/{{1}}" />
                </div>
                <div className="wa-field">
                  <label>Button 2 Text (Quick Reply)</label>
                  <input value={form.btn2Text} onChange={e => set('btn2Text', e.target.value)} placeholder="Shop More" />
                </div>
              </div>
            </div>

            <div className="wa-actions">
              <button className="wa-btn wa-btn-primary" onClick={createTemplate} disabled={loading}>
                {IC.send}{loading ? 'Creating…' : 'Create Template'}
              </button>
              <button className="wa-btn wa-btn-outline" onClick={copyJSON}>
                {IC.copy}{copied ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>

            {response && (
              <div className={`wa-response wa-response-${response.type}`}>
                <pre>{response.text}</pre>
              </div>
            )}
          </div>

          {/* Phone preview */}
          <div className="wa-preview-panel">
            <div className="wa-preview-label">📱 Live Preview</div>
            <div className="wa-phone-shell">
              <div className="wa-phone-notch"><div className="wa-phone-pill" /></div>
              <div className="wa-phone-chat">
                <div className="wa-bubble">
                  <div className="wa-bubble-header">{TEMPLATES[activeKey]?.emoji || '💬'}</div>
                  <div className="wa-bubble-body">
                    <div className="wa-bubble-text" dangerouslySetInnerHTML={{ __html: previewBody }} />
                  </div>
                  {form.footer && <div className="wa-bubble-footer">{form.footer}</div>}
                  <div className="wa-bubble-time">Just now ✓✓</div>
                  {form.btn1Text && <button className="wa-bubble-btn">{form.btn1Text}</button>}
                  {form.btn2Text && <button className="wa-bubble-btn">{form.btn2Text}</button>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── LIST TAB ── */}
      {tab === 'list' && (
        <div className="wa-card">
          <div className="wa-card-title" style={{ marginBottom: 16 }}>
            Template Library
            <button className="wa-btn wa-btn-outline" style={{ marginLeft: 'auto', fontSize: 12 }} onClick={fetchTemplates} disabled={listLoading}>
              {listLoading ? 'Loading…' : '↻ Refresh'}
            </button>
          </div>
          {listLoading ? <Loader /> : templateList.length === 0 ? (
            <p className="wa-empty">No templates found. Click Refresh or Seed Defaults.</p>
          ) : (
            <div className="wa-tpl-list">
              {templateList.map(t => (
                <div key={t.id || t.name} className="wa-tpl-row">
                  <div className="wa-tpl-icon">{t.category === 'MARKETING' ? '📢' : t.category === 'AUTHENTICATION' ? '🔐' : '⚙️'}</div>
                  <div className="wa-tpl-info">
                    <div className="wa-tpl-name">{t.name}</div>
                    <div className="wa-tpl-meta">{t.category} · {t.language}</div>
                  </div>
                  <span className={`wa-badge wa-badge-${(t.status||'').toLowerCase()}`}>{t.status || 'UNKNOWN'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TEST TAB ── */}
      {tab === 'test' && (
        <div className="wa-card" style={{ maxWidth: 480 }}>
          <div className="wa-card-title">Send Test Message</div>
          <p className="wa-info-box">Sends a plain text ping to verify your WhatsApp credentials are working correctly.</p>
          <div className="wa-field" style={{ marginBottom: 16 }}>
            <label>Phone Number</label>
            <div className="wa-phone-input-row">
              <span className="wa-phone-prefix">{IC.phone} +91</span>
              <input value={testPhone} onChange={e => setTestPhone(e.target.value.replace(/\D/g,'').slice(0,10))} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} />
            </div>
          </div>
          <button className="wa-btn wa-btn-primary" onClick={sendTest} disabled={testLoading || testPhone.length < 10}>
            {IC.send}{testLoading ? 'Sending…' : 'Send Test Message'}
          </button>
        </div>
      )}

      {/* Seed response */}
      {tab !== 'create' && response && (
        <div className={`wa-response wa-response-${response.type}`} style={{ marginTop: 16 }}>
          <pre>{response.text}</pre>
        </div>
      )}

      <style>{`
        .wa-wrap { padding: 24px 28px; max-width: 1400px; }
        .wa-page-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:20px; flex-wrap:wrap; gap:12px; }
        .wa-page-header-left { display:flex; align-items:center; gap:14px; }
        .wa-page-icon { width:42px; height:42px; background:#25D366; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; }
        .wa-page-icon svg { width:22px; height:22px; }
        .wa-page-title { font-size:20px; font-weight:700; color:#180D3E; margin:0 0 2px; }
        .wa-page-sub { font-size:13px; color:#888; margin:0; }
        .wa-header-actions { display:flex; align-items:center; gap:10px; }
        .wa-brand-select { height:36px; border:1.5px solid #e0e0e0; border-radius:8px; padding:0 12px; font-size:13px; color:#180D3E; outline:none; cursor:pointer; }
        .wa-tabs { display:flex; gap:4px; margin-bottom:22px; background:#f5f5f7; border-radius:10px; padding:4px; border:1px solid #ebebf0; width:fit-content; }
        .wa-tab { padding:8px 18px; border-radius:7px; font-size:13px; cursor:pointer; border:none; background:transparent; color:#888; transition:all 0.15s; font-weight:500; }
        .wa-tab-active { background:#fff; color:#180D3E; box-shadow:0 1px 4px rgba(0,0,0,0.08); font-weight:600; }
        .wa-create-layout { display:grid; grid-template-columns:220px 1fr 280px; gap:20px; align-items:start; }
        .wa-sidebar { background:#fff; border:1.5px solid #ebebf0; border-radius:12px; padding:14px 10px; }
        .wa-sb-group { margin-bottom:14px; }
        .wa-sb-label { font-size:10px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:.08em; padding:0 8px 6px; }
        .wa-sb-btn { width:100%; text-align:left; background:transparent; border:1.5px solid transparent; border-radius:8px; padding:8px 10px; cursor:pointer; display:flex; align-items:center; gap:8px; font-size:13px; color:#555; transition:all 0.15s; margin-bottom:2px; }
        .wa-sb-btn:hover { background:#f5f5f7; color:#180D3E; }
        .wa-sb-btn-active { background:#fff0f2; border-color:#CE1E36; color:#CE1E36; font-weight:600; }
        .wa-sb-emoji { font-size:16px; flex-shrink:0; }
        .wa-sb-name { font-size:12px; }
        .wa-form-area { display:flex; flex-direction:column; gap:16px; }
        .wa-card { background:#fff; border:1.5px solid #ebebf0; border-radius:12px; padding:20px; }
        .wa-card-title { font-size:12px; font-weight:700; color:#180D3E; text-transform:uppercase; letter-spacing:.06em; margin-bottom:14px; display:flex; align-items:center; gap:8px; }
        .wa-card-title::before { content:''; display:block; width:3px; height:14px; background:#CE1E36; border-radius:2px; }
        .wa-field { display:flex; flex-direction:column; gap:5px; }
        .wa-field label { font-size:11px; font-weight:600; color:#666; text-transform:uppercase; letter-spacing:.04em; }
        .wa-field input, .wa-field select, .wa-field textarea { border:1.5px solid #e0e0e0; border-radius:8px; padding:9px 12px; font-size:13px; color:#180D3E; outline:none; font-family:inherit; transition:border-color 0.15s; background:#fff; }
        .wa-field textarea { resize:vertical; min-height:100px; line-height:1.6; }
        .wa-field input:focus, .wa-field select:focus, .wa-field textarea:focus { border-color:#CE1E36; box-shadow:0 0 0 3px rgba(206,30,54,0.08); }
        .wa-field-row { display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:12px; }
        .wa-row-3 { grid-template-columns:1fr 1fr 1fr; }
        .wa-actions { display:flex; gap:10px; flex-wrap:wrap; }
        .wa-btn { display:inline-flex; align-items:center; gap:7px; padding:10px 20px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; transition:all 0.2s; font-family:inherit; }
        .wa-btn svg { width:15px; height:15px; flex-shrink:0; }
        .wa-btn:disabled { opacity:.55; cursor:not-allowed; }
        .wa-btn-primary { background:#CE1E36; color:#fff; }
        .wa-btn-primary:hover:not(:disabled) { background:#a8172b; }
        .wa-btn-outline { background:#fff; color:#180D3E; border:1.5px solid #e0e0e0; }
        .wa-btn-outline:hover:not(:disabled) { border-color:#CE1E36; color:#CE1E36; }
        .wa-response { border-radius:8px; padding:14px; margin-top:4px; font-size:11px; font-family:monospace; max-height:200px; overflow-y:auto; }
        .wa-response pre { white-space:pre-wrap; word-break:break-all; margin:0; }
        .wa-response-success { background:#e8f5e9; border:1px solid #c8e6c9; color:#1a7a4a; }
        .wa-response-error { background:#fff0f0; border:1px solid #ffcdd2; color:#CE1E36; }
        .wa-info-box { background:#fff8e6; border:1px solid #ffe0a3; border-radius:8px; padding:10px 14px; font-size:12px; color:#b45309; margin-bottom:14px; line-height:1.5; }
        .wa-tpl-list { display:flex; flex-direction:column; gap:8px; }
        .wa-tpl-row { display:flex; align-items:center; gap:12px; padding:12px 16px; border:1.5px solid #ebebf0; border-radius:10px; transition:border-color 0.15s; }
        .wa-tpl-row:hover { border-color:#CE1E36; }
        .wa-tpl-icon { font-size:20px; flex-shrink:0; }
        .wa-tpl-info { flex:1; }
        .wa-tpl-name { font-size:13px; font-weight:600; color:#180D3E; font-family:monospace; }
        .wa-tpl-meta { font-size:11px; color:#aaa; margin-top:2px; }
        .wa-badge { padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; }
        .wa-badge-approved { background:#e8f5e9; color:#1a7a4a; border:1px solid #c8e6c9; }
        .wa-badge-pending { background:#fff8e1; color:#b45309; border:1px solid #ffe0a3; }
        .wa-badge-rejected { background:#fff0f0; color:#CE1E36; border:1px solid #ffcdd2; }
        .wa-badge-unknown { background:#f5f5f7; color:#888; border:1px solid #e0e0e0; }
        .wa-empty { color:#aaa; font-size:13px; text-align:center; padding:32px 0; }
        .wa-phone-input-row { display:flex; align-items:center; border:1.5px solid #e0e0e0; border-radius:8px; overflow:hidden; transition:border-color 0.15s; }
        .wa-phone-input-row:focus-within { border-color:#CE1E36; box-shadow:0 0 0 3px rgba(206,30,54,0.08); }
        .wa-phone-prefix { display:flex; align-items:center; gap:6px; padding:0 12px; background:#f5f5f7; font-size:13px; color:#555; border-right:1.5px solid #e0e0e0; height:40px; white-space:nowrap; flex-shrink:0; }
        .wa-phone-prefix svg { width:14px; height:14px; }
        .wa-phone-input-row input { border:none; outline:none; padding:9px 12px; font-size:13px; color:#180D3E; flex:1; background:#fff; }
        .wa-preview-panel { background:#fff; border:1.5px solid #ebebf0; border-radius:12px; padding:16px; display:flex; flex-direction:column; align-items:center; gap:14px; }
        .wa-preview-label { font-size:11px; font-weight:700; color:#aaa; text-transform:uppercase; letter-spacing:.08em; align-self:flex-start; }
        .wa-phone-shell { width:240px; background:#111; border-radius:28px; border:5px solid #222; overflow:hidden; box-shadow:0 16px 48px rgba(0,0,0,0.15); }
        .wa-phone-notch { background:#111; height:24px; display:flex; align-items:center; justify-content:center; }
        .wa-phone-pill { width:50px; height:6px; background:#222; border-radius:3px; }
        .wa-phone-chat { background:#ECE5DD; min-height:360px; padding:10px 8px; }
        .wa-bubble { background:#fff; border-radius:0 10px 10px 10px; max-width:95%; box-shadow:0 1px 2px rgba(0,0,0,0.12); overflow:hidden; }
        .wa-bubble-header { background:linear-gradient(135deg,#25D366,#128C7E); height:100px; display:flex; align-items:center; justify-content:center; font-size:28px; }
        .wa-bubble-body { padding:8px 10px 4px; }
        .wa-bubble-text { font-size:12px; color:#333; line-height:1.5; }
        .wa-bubble-footer { font-size:10px; color:#888; padding:0 10px 6px; font-style:italic; }
        .wa-bubble-time { text-align:right; font-size:10px; color:#aaa; padding:0 10px 6px; }
        .wa-bubble-btn { width:100%; border:none; border-top:1px solid #f0f0f0; background:transparent; padding:8px; font-size:12px; color:#128C7E; font-weight:600; cursor:pointer; display:block; }
        @media (max-width: 1100px) { .wa-create-layout { grid-template-columns:1fr; } .wa-preview-panel { display:none; } }
        @media (max-width: 700px) { .wa-wrap { padding:16px; } .wa-field-row, .wa-row-3 { grid-template-columns:1fr; } }
      `}</style>
    </div>
  );
}
