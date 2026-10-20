import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, InformationCircleIcon, Copy01Icon, LinkSquare02Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { whatsappProfileService as waProfile } from '../../services';
import { Skeleton, SkeletonForm, SkeletonKpis, SkeletonList, SkeletonTableRows } from '../ui';
import Dropdown from '../ui/Dropdown';
import { showSuccess, showError } from '../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   WhatsApp → Profile (admins only). The one number every store shares.
   GET  /api/whatsapp/profile[?refresh=1] → { profile:{ about, description, address, email,
        websites[], vertical, verticalLabel, profilePictureUrl }, number:{ verifiedName,
        displayPhone (masked), displayPhoneFull, nameStatus, pendingName, pendingNameStatus },
        nameRequest, verticals[], limits, photoUploadReady, checkedAt, error? }
   PUT  /api/whatsapp/profile           { only the changed fields }
   POST /api/whatsapp/profile/photo     multipart "photo" (JPG/PNG ≤ 5 MB)
   POST /api/whatsapp/profile/name      { name }
   GET  /api/whatsapp/keys              { configured, keys:[{ field, label, value, source, updatedAt }] }
   PUT  /api/whatsapp/keys              { token? | phoneNumberId? | businessAccountId? | catalogId? }
   GET  /api/whatsapp/stores-identity   { stores:[…], winbackAutomationOn, attention }
   Reused: /settings/health, /analytics?days=7, /settings/failed?hours=168
   ────────────────────────────────────────────────────────────── */

const MANAGER_URL = 'https://business.facebook.com/wa/manage/phone-numbers/';
const IST = 'Asia/Kolkata';
const LIMITS = { about: 139, description: 512, address: 256, email: 128, website: 256, nameMin: 3, nameMax: 100, photoBytes: 5 * 1024 * 1024 };
const FIELD_NAMES = { photo: 'photo', about: 'About', description: 'Description', address: 'Address', email: 'Email', web1: 'Website 1', web2: 'Website 2', vertical: 'Category' };
const TEXT_KEYS = ['about', 'description', 'address', 'email', 'web1', 'web2', 'vertical'];
const FALLBACK_VERTICALS = [
  ['UNDEFINED', 'Not set'], ['APPAREL', 'Clothing & apparel'], ['RETAIL', 'Shopping & retail'], ['BEAUTY', 'Beauty, spa & salon'],
  ['GROCERY', 'Food & grocery'], ['HEALTH', 'Medical & health'], ['PROF_SERVICES', 'Professional services'], ['OTHER', 'Other'],
].map(([value, label]) => ({ value, label }));

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const WEB_RE = /^https?:\/\/[^\s/.]+(\.[^\s/.]+)+(\/\S*)?$/i;
const emailBad = (v) => !!v.trim() && !EMAIL_RE.test(v.trim());
const webBad = (v) => !!v.trim() && !WEB_RE.test(v.trim());

const msgOf = (e, fallback) => (e && (e.message || (typeof e === 'string' ? e : ''))) || fallback;
const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
const pct = (a, b) => (Number(b) > 0 ? Math.round((Number(a) / Number(b)) * 1000) / 10 : null);

function ago(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  const m = Math.round((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.round(h / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
const day = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST }) : '';
};
// Mask a phone number down to its last 4 digits.
function maskDigits(s) {
  const str = String(s || '');
  const total = (str.match(/\d/g) || []).length;
  let seen = 0;
  return total ? str.replace(/\d/g, (d) => (++seen > total - 4 ? d : '•')) : '';
}
function initials(name) {
  const w = String(name || '').trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] || '') + (w[1]?.[0] || '')).toUpperCase() || 'WA';
}
const toDraft = (p) => ({
  about: p?.about || '', description: p?.description || '', address: p?.address || '', email: p?.email || '',
  web1: p?.websites?.[0] || '', web2: p?.websites?.[1] || '', vertical: p?.vertical || 'UNDEFINED',
});

// "Where to find it" guides for the connection keys.
const KEY_INFO = {
  token: {
    note: 'Permanent system-user token',
    steps: [
      'Open Meta Business Suite → Settings (Business settings) → Users → System users.',
      'Pick our system user, for example “crosscoin-server”. It needs Admin access and the WhatsApp account and app assigned to it.',
      'Click Generate new token, choose our app, set expiry to Never and tick these two permissions:',
      'Copy the token straight away (Meta shows it once) and paste it here with Replace.',
    ],
    perms: ['whatsapp_business_messaging', 'whatsapp_business_management'],
    tip: 'Don’t use the temporary token on the API Setup page: it stops working after 24 hours.', tipTone: 'warn',
  },
  phoneNumberId: {
    note: 'Not the phone number. A 15-digit ID Meta gives the number.',
    steps: [
      'Open Meta Business Suite → WhatsApp Manager.',
      'Go to API Setup (or Phone numbers) and pick {phone}.',
      'Copy “Phone number ID” shown under the number.',
    ],
    tip: 'If the number is ever moved to a new account, this ID changes and must be updated here.',
  },
  businessAccountId: {
    note: 'The account that owns the number and our templates.',
    steps: [
      'Open Meta Business Suite → WhatsApp Manager → API Setup.',
      'Copy “WhatsApp Business Account ID”.',
      'You can also find it in Business settings → Accounts → WhatsApp accounts.',
    ],
    tip: 'Templates are read from this account, so a wrong ID makes the Templates page empty.',
  },
  catalogId: {
    note: 'Used for product cards in chats and the Catalogue button on our profile.',
    steps: [
      'Open Commerce Manager and pick the “Cross Coin” catalogue.',
      'Go to Settings: the Catalogue ID is at the top.',
      'In WhatsApp Manager → Catalogue, check this catalogue is connected to our number.',
    ],
    tip: 'Without it, product cards in chats still work but the Catalogue button on our profile stays empty.',
  },
};

// Plain explanations for the most common failure reasons (text from /settings/failed).
const FAIL_ADVICE = [
  [/isn’t on WhatsApp/i, 'The customer gave a landline or an old number at checkout, so WhatsApp has nowhere to deliver. Nothing is wrong with our number. For COD orders, confirm these by phone call instead.'],
  [/stopped marketing/i, 'They turned off offers from us inside WhatsApp. Order updates still reach them, so nothing needs fixing.'],
  [/24 hours/i, 'A typed reply can only go within 24 hours of the customer’s last message. After that only an approved template can be sent.'],
  [/too many offers|held it back/i, 'WhatsApp limits how many marketing messages one person gets from all businesses. Send fewer offers, or try again later.'],
  [/token expired/i, 'The access token stopped working. Replace it under Connection keys.'],
  [/opted out/i, 'The customer replied STOP (or another opt-out word), so we don’t send them offers.'],
  [/Template/i, 'A template was paused, changed or isn’t approved. Check the Templates page.'],
];
const adviceFor = (reason) => (FAIL_ADVICE.find(([re]) => re.test(reason)) || [null, 'Open Failed sends on the Settings page to see the messages and customers affected.'])[1];

const NAME_STATUS = {
  APPROVED: ['success', 'Approved'], AVAILABLE_WITHOUT_REVIEW: ['success', 'Approved'],
  PENDING_REVIEW: ['warn', 'Pending review'], DECLINED: ['danger', 'Rejected'], EXPIRED: ['danger', 'Expired'],
};
// Review state of a requested display name (Meta's fields first, then our own record).
function nameReview(number, req) {
  const s = String(number?.pendingNameStatus || '').toUpperCase();
  if (number?.pendingName && s && s !== 'NONE') {
    if (/PENDING/.test(s)) return { tone: 'warn', label: 'Pending review', name: number.pendingName };
    if (/APPROVED|AVAILABLE/.test(s)) return { tone: 'success', label: 'Approved', name: number.pendingName };
    if (/DECLINED|REJECTED|EXPIRED/.test(s)) return { tone: 'danger', label: 'Rejected', name: number.pendingName };
  }
  if (!req?.name) return null;
  const at = new Date(req.at);
  if (number?.verifiedName && number.verifiedName.toLowerCase() === req.name.toLowerCase()) return { tone: 'success', label: 'Approved', name: req.name, at };
  if (/DECLINED|REJECTED/.test(String(number?.nameStatus || '').toUpperCase())) return { tone: 'danger', label: 'Rejected', name: req.name, at };
  if (Date.now() - at.getTime() < 30 * 86400000) return { tone: 'warn', label: 'Pending review', name: req.name, at };
  return null;
}

function Badge({ tone = 'neutral', children, title }) {
  return <span className={`wpb-badge t-${tone === 'warn' ? 'warn' : tone}`} title={title}>{children}</span>;
}

function State({ kind, title, text, onRetry, children }) {
  return (
    <div className={`wpb-state wpb-state--sm${kind === 'error' ? ' wpb-state--error' : ''}`} role={kind === 'error' ? 'alert' : undefined}>
      <b>{title}</b>
      {text && <span>{text}</span>}
      {onRetry && (
        <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={onRetry}>
          <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={2} /> Try again
        </button>
      )}
      {children}
    </div>
  );
}

function Counter({ n, max }) {
  const tone = n >= max ? 't-danger' : n > max - 20 ? 't-warn' : 'wpb-faint';
  return <span className={`wpp-count ${tone}`} aria-live="polite">{n} / {max}</span>;
}

function Avatar({ src, name, size = 56, className = '' }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => { setBroken(false); }, [src]);
  return (
    <span className={`wpp-avatar ${className}`} style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }} aria-hidden="true">
      {src && !broken
        // WhatsApp's CDN (or a local preview blob): next/image can't optimise either.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" onError={() => setBroken(true)} />
        : initials(name)}
    </span>
  );
}

function goToBrands(brandId) {
  try { sessionStorage.setItem('obz-brand-open', JSON.stringify({ brandId, tab: 'store' })); } catch { /* storage blocked */ }
  window.history.pushState({}, '', '/dashboard/brand-settings');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export default function ProfilePage({ isAdmin = false, goTo, brands = [] }) {
  // ── Data ──
  const [health, setHealth] = useState({ data: null, loading: true, err: '' });
  const [prof, setProf] = useState({ data: null, loading: true, err: '', code: '' });
  const [keys, setKeys] = useState({ data: null, loading: true, err: '' });
  const [stats, setStats] = useState({ analytics: null, failed: null, loading: true, err: '' });
  const [stores, setStores] = useState({ data: null, loading: true, err: '' });

  // ── Number header ──
  const [checked, setChecked] = useState(false);
  const [checking, setChecking] = useState(false);
  const [showFull, setShowFull] = useState(false);

  // ── Profile form ──
  const [base, setBase] = useState(null);
  const [p, setP] = useState(null);
  const [photo, setPhoto] = useState(null); // { file, url }
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const fileRef = useRef(null);

  // ── Display name ──
  const [nameOpen, setNameOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameErr, setNameErr] = useState('');

  // ── Keys ──
  const [guide, setGuide] = useState({});
  const [editing, setEditing] = useState(null); // field
  const [keyDraft, setKeyDraft] = useState('');
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyResult, setKeyResult] = useState(null); // { field, ok, message }
  const [copied, setCopied] = useState('');

  const loadHealth = useCallback(async (refresh = false) => {
    setHealth((h) => ({ ...h, loading: true, err: '' }));
    try { setHealth({ data: await waProfile.getHealth({ refresh }), loading: false, err: '' }); }
    catch (e) { setHealth((h) => ({ ...h, loading: false, err: msgOf(e, 'Couldn’t check the number.') })); }
  }, []);

  const loadProfile = useCallback(async (refresh = false) => {
    setProf((s) => ({ ...s, loading: true, err: '', code: '' }));
    try { setProf({ data: await waProfile.getProfile({ refresh }), loading: false, err: '', code: '' }); }
    catch (e) { setProf((s) => ({ ...s, loading: false, err: msgOf(e, 'Couldn’t read the profile from WhatsApp.'), code: e?.code || '' })); }
  }, []);

  const loadKeys = useCallback(async () => {
    setKeys((k) => ({ ...k, loading: true, err: '' }));
    try { setKeys({ data: await waProfile.getKeys(), loading: false, err: '' }); }
    catch (e) { setKeys((k) => ({ ...k, loading: false, err: msgOf(e, 'Couldn’t load the connection keys.') })); }
  }, []);

  const loadStats = useCallback(async () => {
    setStats((s) => ({ ...s, loading: true, err: '' }));
    try {
      const [analytics, failed] = await Promise.all([waProfile.getAnalytics(7), waProfile.getFailed(168)]);
      setStats({ analytics, failed, loading: false, err: '' });
    } catch (e) { setStats((s) => ({ ...s, loading: false, err: msgOf(e, 'Couldn’t load the message numbers.') })); }
  }, []);

  const loadStores = useCallback(async () => {
    setStores((s) => ({ ...s, loading: true, err: '' }));
    try { setStores({ data: await waProfile.getStoresIdentity(), loading: false, err: '' }); }
    catch (e) { setStores((s) => ({ ...s, loading: false, err: msgOf(e, 'Couldn’t load the stores.') })); }
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    loadHealth(); loadProfile(); loadKeys(); loadStats(); loadStores();
  }, [isAdmin, loadHealth, loadProfile, loadKeys, loadStats, loadStores]);

  // Fresh profile → new baseline; keep the draft only while it has unsaved edits.
  const baseRef = useRef(null);
  const draftRef = useRef(null);
  useEffect(() => { draftRef.current = p; }, [p]);
  useEffect(() => {
    const pr = prof.data?.profile;
    if (!pr) return;
    const d = toDraft(pr);
    const prevBase = baseRef.current;
    const cur = draftRef.current;
    const dirtyNow = prevBase && cur && TEXT_KEYS.some((k) => cur[k] !== prevBase[k]);
    baseRef.current = d;
    setBase(d);
    if (!dirtyNow) setP(d);
  }, [prof.data]);

  // Free the photo preview URL.
  useEffect(() => () => { if (photo?.url) URL.revokeObjectURL(photo.url); }, [photo]);

  const number = prof.data?.number || null;
  const h = health.data || null;
  const profile = prof.data?.profile || null;
  const verticals = prof.data?.verticals?.length ? prof.data.verticals : FALLBACK_VERTICALS;
  const notConfigured = prof.code === 'NOT_CONFIGURED' || (keys.data && keys.data.configured === false);
  const storeCount = stores.data?.stores?.filter((s) => s.status === 'active').length || brands.length || 0;
  const storesWord = storeCount ? `all ${storeCount} stores` : 'every store';

  // ── Form state ──
  const changed = useMemo(() => {
    if (!p || !base) return photo ? ['photo'] : [];
    return [...(photo ? ['photo'] : []), ...TEXT_KEYS.filter((k) => p[k] !== base[k])];
  }, [p, base, photo]);
  const dirty = changed.length > 0;
  const errs = useMemo(() => {
    if (!p) return {};
    const e = {};
    if (!p.about.trim()) e.about = 'About can’t be empty. WhatsApp needs at least 1 character.';
    if (emailBad(p.email)) e.email = 'That doesn’t look like an email address.';
    if (webBad(p.web1)) e.web1 = 'Start with https:// and use a full address.';
    if (webBad(p.web2)) e.web2 = 'Start with https:// and use a full address.';
    return e;
  }, [p]);
  const invalid = Object.keys(errs).length > 0;
  const setField = (k, max) => (e) => {
    const v = String(e?.target ? e.target.value : e ?? '');
    setP((cur) => ({ ...cur, [k]: max ? v.slice(0, max) : v }));
    setJustSaved(false); setSaveErr('');
  };

  function pickPhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(jpe?g|png)$/i.test(file.type)) { showError(null, 'Pick a JPG or PNG photo.'); return; }
    if (file.size > LIMITS.photoBytes) { showError(null, 'The photo is bigger than 5 MB. Pick a smaller one.'); return; }
    setPhoto({ file, url: URL.createObjectURL(file) });
    setJustSaved(false); setSaveErr('');
  }

  function discard() {
    setP(base); setPhoto(null); setSaveErr(''); setJustSaved(false);
  }

  async function save() {
    if (!dirty || invalid || saving) return;
    setSaving(true); setSaveErr('');
    const done = [];
    try {
      if (photo) {
        await waProfile.uploadPhoto(photo.file);
        done.push('photo');
        setPhoto(null);
      }
      const body = {};
      for (const k of changed) {
        if (k === 'photo') continue;
        if (k === 'web1' || k === 'web2') body.websites = [p.web1, p.web2].map((u) => u.trim()).filter(Boolean);
        else body[k] = k === 'vertical' ? p[k] : p[k].trim();
      }
      if (Object.keys(body).length) await waProfile.saveProfile(body);
      const nb = { ...p, about: p.about.trim(), description: p.description.trim(), address: p.address.trim(), email: p.email.trim(), web1: p.web1.trim(), web2: p.web2.trim() };
      baseRef.current = nb;
      setBase(nb); setP(nb);
      setJustSaved(true);
      showSuccess(null, 'Saved to WhatsApp. Customers see it within a few minutes.');
      if (done.includes('photo')) loadProfile(true);
    } catch (e) {
      const m = msgOf(e, 'WhatsApp didn’t accept the change.');
      setSaveErr(done.length ? `The photo was saved, but the other changes weren’t: ${m}` : m);
      showError(null, m);
    } finally {
      setSaving(false);
    }
  }

  // ── Display name ──
  const review = nameReview(number, prof.data?.nameRequest);
  const displayName = number?.verifiedName || h?.display_name || 'Our business';
  const nameStatus = NAME_STATUS[String(number?.nameStatus || '').toUpperCase()] || null;
  async function sendName(e) {
    e.preventDefault();
    const n = nameDraft.replace(/\s+/g, ' ').trim();
    if (n.length < LIMITS.nameMin || n.length > LIMITS.nameMax) { setNameErr(`Use ${LIMITS.nameMin} to ${LIMITS.nameMax} characters.`); return; }
    setNameBusy(true); setNameErr('');
    try {
      const r = await waProfile.requestName(n);
      showSuccess(null, r?.message || 'Sent to Meta for review.');
      setNameOpen(false); setNameDraft('');
      loadProfile(true);
    } catch (err) {
      setNameErr(msgOf(err, 'WhatsApp didn’t take the request.'));
    } finally { setNameBusy(false); }
  }

  // ── Number header ──
  async function checkConnection() {
    setChecking(true);
    await Promise.all([loadHealth(true), loadProfile(true)]);
    setChecking(false); setChecked(true);
  }
  const phoneMasked = number?.displayPhone || (h?.phone ? maskDigits(h.phone) : '');
  const phoneFull = number?.displayPhoneFull || h?.phone || '';
  const phoneShown = showFull && phoneFull ? phoneFull : phoneMasked;
  const avatarSrc = profile?.profilePictureUrl || null;

  const tokenState = useMemo(() => {
    if (!h) return null;
    if (h.token_never_expires) return { tone: 'success', text: 'Access token works and never expires' };
    const exp = h.token_expires_at ? new Date(h.token_expires_at) : null;
    if (exp && !Number.isNaN(exp.getTime())) {
      const days = Math.floor((exp.getTime() - Date.now()) / 86400000);
      if (days < 0) return { tone: 'danger', text: 'Access token has expired: replace it under Connection keys' };
      return { tone: days < 14 ? 'warn' : 'success', text: `Access token works, expires in ${days} ${days === 1 ? 'day' : 'days'}` };
    }
    return h.error ? null : { tone: 'success', text: 'Access token works' };
  }, [h]);

  const pills = [];
  if (h) {
    if (h.error) pills.push({ tone: 'warn', text: '● Not answering', title: String(h.error) });
    else if (h.phone || number) pills.push({ tone: 'success', text: '● Connected', title: 'WhatsApp Cloud API is answering for this number' });
    const q = String(h.quality || number?.qualityRating || '').toLowerCase();
    const Q = { high: ['success', 'High'], green: ['success', 'High'], medium: ['warn', 'Medium'], yellow: ['warn', 'Medium'], low: ['danger', 'Low'], red: ['danger', 'Low'] }[q];
    if (Q) pills.push({ tone: Q[0], text: `Quality: ${Q[1]}`, title: 'Set by WhatsApp from customer blocks and reports' });
    if (h.messaging_limit === 'unlimited') pills.push({ tone: 'info', text: 'No daily limit', title: 'Messaging limit' });
    else if (Number(h.messaging_limit) > 0) {
      const l = Number(h.messaging_limit);
      pills.push({ tone: 'info', text: `${l >= 1000 ? `${num(l / 1000)}K` : num(l)} customers / 24h`, title: 'Messaging limit: how many different customers we can start chats with in 24 hours' });
    }
  }
  const usedLine = h ? (Number(h.messaging_limit) > 0
    ? `${num(h.used_today)} of ${num(h.messaging_limit)} used in the last 24 hours. Replies to customers who wrote first don’t count.`
    : `${num(h.used_today)} customers messaged in the last 24 hours.`) : '';

  const checks = useMemo(() => {
    if (!h && !number) return [];
    const out = [];
    const registered = number?.codeVerificationStatus ? number.codeVerificationStatus === 'VERIFIED' : !!(h?.phone || number?.displayPhone);
    out.push(registered ? { tone: 'success', text: 'Number registered on WhatsApp' } : { tone: 'danger', text: 'Couldn’t confirm the number is registered' });
    if (tokenState) out.push(tokenState);
    const ns = String(number?.nameStatus || '').toUpperCase();
    if (ns) out.push(/APPROVED|AVAILABLE/.test(ns) ? { tone: 'success', text: 'Display name approved' } : /PENDING/.test(ns) ? { tone: 'warn', text: 'Display name waiting for Meta’s review' } : { tone: 'danger', text: 'Display name not approved' });
    const hook = h?.last_webhook_at ? new Date(h.last_webhook_at) : null;
    if (hook && !Number.isNaN(hook.getTime())) {
      out.push({ tone: Date.now() - hook.getTime() > 86400000 ? 'warn' : 'success', text: `WhatsApp sent us an update ${ago(hook)}` });
    } else if (h) out.push({ tone: 'danger', text: 'No update from WhatsApp yet. Check the webhook in Meta.' });
    return out;
  }, [h, number, tokenState]);
  const problems = checks.filter((c) => c.tone !== 'success').length;
  const statusLine = checked
    ? `Checked just now · ${problems ? `${problems} ${problems === 1 ? 'thing needs' : 'things need'} a look` : 'all good'}`
    : h?.checked_at ? `Last checked ${ago(h.checked_at)}` : '';

  // ── Keys ──
  async function saveKey(field, value) {
    setKeyBusy(true); setKeyResult(null);
    try {
      const r = await waProfile.saveKeys({ [field]: value });
      setKeys({ data: r, loading: false, err: '' });
      const msg = r?.test?.message || r?.message || 'Saved.';
      setKeyResult({ field, ok: true, message: msg });
      setEditing(null); setKeyDraft('');
      showSuccess(null, msg);
      if (field === 'token' || field === 'phoneNumberId') { loadHealth(true); loadProfile(true); }
    } catch (e) {
      setKeyResult({ field, ok: false, message: e?.test?.message || msgOf(e, 'Couldn’t save the key.') });
    } finally { setKeyBusy(false); }
  }
  async function copy(field, value) {
    try { await navigator.clipboard.writeText(value); setCopied(field); setTimeout(() => setCopied((c) => (c === field ? '' : c)), 1600); }
    catch { showError(null, 'Couldn’t copy. Select the value and copy it by hand.'); }
  }
  const keyNote = (k) => {
    if (k.source === 'none') return { tone: k.optional ? 'muted' : 'danger', text: k.optional ? 'Optional · not set' : 'Not set. WhatsApp can’t work until it is added.' };
    const where = k.source === 'server' ? 'From the server settings file. Save it here to manage it from this page.' : `Saved here${k.updatedAt ? ` · changed ${day(k.updatedAt)}` : ''}`;
    if (k.field === 'token') {
      if (tokenState && tokenState.tone !== 'success') return { tone: tokenState.tone, text: `${tokenState.text} · ${where}` };
      if (h?.token_never_expires) return { tone: 'success', text: `${KEY_INFO.token.note} · never expires · ${where}` };
      return { tone: 'muted', text: where };
    }
    return { tone: 'muted', text: `${KEY_INFO[k.field]?.note || ''} ${where}`.trim() };
  };

  // ── Health ──
  const funnel = stats.analytics?.funnel || null;
  const failedRows = useMemo(() => stats.failed?.failed || [], [stats.failed]);
  const reasons = useMemo(() => {
    const m = new Map();
    for (const r of failedRows) { const k = r.reason || 'WhatsApp didn’t say why'; m.set(k, (m.get(k) || 0) + 1); }
    return [...m.entries()].map(([reason, n]) => ({ reason, n })).sort((a, b) => b.n - a.n);
  }, [failedRows]);
  const tiles = funnel ? [
    { label: 'Sent', value: num(funnel.sent), note: 'Order updates, carts, offers', tone: '' },
    { label: 'Delivered', value: num(funnel.delivered), note: funnel.sent ? `${pct(funnel.delivered, funnel.sent)}% reached the phone` : 'Nothing sent yet', tone: 't-success' },
    { label: 'Read', value: num(funnel.read), note: funnel.delivered ? `${Math.round(pct(funnel.read, funnel.delivered))}% of delivered were opened` : '—', tone: '' },
    { label: 'Failed', value: num(funnel.failed), note: funnel.sent ? `${pct(funnel.failed, funnel.sent)}% of sent · normal is under 3%` : '—', tone: funnel.sent && funnel.failed / funnel.sent >= 0.03 ? 't-danger' : funnel.failed ? 't-warn' : '' },
  ] : [];
  const totalFailed = Math.max(Number(funnel?.failed) || 0, failedRows.length);
  const capped = failedRows.length < totalFailed;

  // ── Guard ──
  if (!isAdmin) {
    return (
      <div className="wpb-page">
        <header className="wpb-head"><div className="wpb-head-text"><h1 className="wpb-title">WhatsApp profile</h1></div></header>
        <section className="wpb-card"><State title="Only admins can open the WhatsApp profile" text="Ask an admin if something about the WhatsApp number needs changing." /></section>
      </div>
    );
  }

  const previewName = displayName;
  const catLabel = verticals.find((v) => v.value === p?.vertical)?.label || '';
  const previewRows = p ? [
    ['Category', p.vertical && p.vertical !== 'UNDEFINED' ? catLabel : ''], ['Address', p.address], ['Email', p.email], ['Website', p.web1], ['Website', p.web2],
  ].filter((r) => String(r[1]).trim()) : [];
  const catalogSet = !!keys.data?.keys?.find((k) => k.field === 'catalogId')?.isSet;

  return (
    <div className="wpb-page wpp-page">
      <header className="wpb-head">
        <div className="wpb-head-text">
          <h1 className="wpb-title">WhatsApp profile</h1>
          <p className="wpb-sub">The one WhatsApp number {storesWord} share: what customers see, the keys that connect it, and whether messages get through. Admins only.</p>
        </div>
        <a className="wpb-btn wpb-btn--ghost" href={MANAGER_URL} target="_blank" rel="noopener noreferrer">
          Open WhatsApp Manager <HugeiconsIcon icon={LinkSquare02Icon} size={14} strokeWidth={2} />
        </a>
      </header>

      {notConfigured && (
        <section className="wpb-card wpp-empty" aria-label="WhatsApp not connected">
          <b>WhatsApp isn’t connected yet</b>
          <span>Add the access token and the phone number ID under Connection keys. Once WhatsApp accepts them, the profile, health and display name appear here.</span>
          <button type="button" className="wpb-btn wpb-btn--sm" onClick={() => document.getElementById('wpp-keys')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
            Go to Connection keys
          </button>
        </section>
      )}

      {/* ── The number ── */}
      {!notConfigured && (
        <section className="wpb-card wpp-number" aria-label="The number" aria-busy={(health.loading || prof.loading) || undefined}>
          {(health.loading && !h) || (prof.loading && !prof.data && !prof.err) ? (
            <div className="wpp-number-skel" role="status" aria-busy="true">
              <span className="wpb-sr">Checking the number…</span>
              <Skeleton circle h={56} />
              <div className="wpp-col"><Skeleton w={160} h={18} /><Skeleton w={130} h={12} /></div>
              <div className="wpp-col"><Skeleton w={260} h={22} r={999} /><Skeleton w={220} h={10} /></div>
            </div>
          ) : (
            <>
              <Avatar src={avatarSrc} name={displayName} size={56} />
              <div className="wpp-number-id">
                <span className="wpp-row">
                  <b className="wpp-number-name">{displayName}</b>
                  {(nameStatus?.[0] === 'success' || h?.verified) && <span className="wpp-tick" title="Display name approved by WhatsApp">✓</span>}
                  {nameStatus && <span className="wpb-faint wpp-small">{nameStatus[0] === 'success' ? 'Verified business' : nameStatus[1]}</span>}
                </span>
                <span className="wpp-row">
                  <span className="wpp-mono">{phoneShown || 'Number unknown'}</span>
                  {phoneFull && phoneMasked && (
                    <button type="button" className="wpb-link wpp-small" onClick={() => setShowFull((s) => !s)} aria-pressed={showFull}>{showFull ? 'Hide' : 'Show'}</button>
                  )}
                </span>
              </div>
              <div className="wpp-number-stats">
                <span className="wpp-row">{pills.map((x) => <Badge key={x.text} tone={x.tone} title={x.title}>{x.text}</Badge>)}</span>
                {usedLine && <span className="wpb-hint">{usedLine}</span>}
                {health.err && <span className="wpb-hint t-danger">{health.err}</span>}
                {h?.error && <span className="wpb-hint t-warn">WhatsApp didn’t answer just now, so some details are missing.</span>}
                {prof.err && !notConfigured && <span className="wpb-hint t-danger">{prof.err}</span>}
              </div>
              <div className="wpp-number-check">
                <button type="button" className="wpb-btn wpb-btn--ghost" onClick={checkConnection} disabled={checking}>
                  <HugeiconsIcon icon={RefreshIcon} size={14} strokeWidth={2} /> {checking ? 'Checking…' : checked ? 'Check again' : 'Check connection'}
                </button>
                {statusLine && <span className={`wpp-small ${checked ? (problems ? 't-warn' : 't-success') : 'wpb-faint'}`}>{statusLine}</span>}
              </div>
              {checked && checks.length > 0 && (
                <ul className="wpp-checks" aria-label="Connection checks">
                  {checks.map((c) => (
                    <li key={c.text} className="wpp-check"><span className={`t-${c.tone}`} aria-hidden="true">{c.tone === 'success' ? '✓' : '!'}</span> {c.text}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {/* ── Profile form + preview ── */}
      {!notConfigured && (
        <div className="wpp-split">
          <section className="wpb-card wpb-form wpp-profile" aria-label="Business profile">
            <div className="wpb-h2-row">
              <div className="wpp-col">
                <h2 className="wpb-h2">Business profile</h2>
                <span className="wpb-hint">What a customer sees when they tap our name in WhatsApp. Customers of {storesWord} see this one profile.</span>
              </div>
              {justSaved && !dirty && <span className="wpb-badge t-success" role="status">Saved to WhatsApp. Customers see it within a few minutes.</span>}
            </div>

            {prof.loading && !p ? (
              <SkeletonForm fields={6} label="Loading the profile…" />
            ) : !p ? (
              <State kind="error" title="Couldn’t read the profile" text={prof.err || 'WhatsApp didn’t return the profile.'} onRetry={() => loadProfile(true)} />
            ) : (
              <>
                <div className="wpp-photo">
                  <Avatar src={photo?.url || avatarSrc} name={displayName} size={72} />
                  <div className="wpp-col wpp-grow">
                    <b className="wpp-label-strong">Profile photo</b>
                    <span className="wpb-hint">{photo ? `New: ${photo.file.name}. Not saved yet.` : avatarSrc ? 'Current photo on WhatsApp.' : 'No photo yet.'}</span>
                    <span className="wpp-small wpb-faint">Square JPG or PNG, at least 640 × 640, up to 5 MB. WhatsApp crops it to a circle.</span>
                    {prof.data?.photoUploadReady === false && (
                      <span className="wpp-small t-warn">Add the Meta app ID (server setting WHATSAPP_APP_ID, from Meta for Developers → your app → App settings → Basic) to change the photo.</span>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="wpb-sr" tabIndex={-1} onChange={pickPhoto} aria-label="Choose a new profile photo" />
                  <span className="wpb-actions">
                    {photo && <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => setPhoto(null)}>Undo</button>}
                    <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => fileRef.current?.click()} disabled={prof.data?.photoUploadReady === false}>Change</button>
                  </span>
                </div>

                <div className="wpp-name">
                  <div className="wpp-name-top">
                    <span className="wpb-hint">Display name <b className="wpb-strong wpp-ml">{displayName}</b>{nameStatus && <> <Badge tone={nameStatus[0]}>{nameStatus[1]}</Badge></>}</span>
                    {!nameOpen && <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => { setNameOpen(true); setNameErr(''); setNameDraft(''); }}>Request name change</button>}
                  </div>
                  {review && (
                    <span className="wpp-small">
                      <Badge tone={review.tone}>{review.label}</Badge> <span className="wpb-strong">“{review.name}”</span>
                      {review.at && !Number.isNaN(review.at.getTime()) && <span className="wpb-faint"> · asked {day(review.at)}</span>}
                      {review.tone === 'warn' && <span className="wpb-faint"> · Meta usually decides in 1 to 3 days.</span>}
                    </span>
                  )}
                  {nameOpen && (
                    <form className="wpp-name-form" onSubmit={sendName}>
                      <label className="wpb-field">
                        <span className="wpp-label-row"><span>New display name</span><Counter n={nameDraft.length} max={LIMITS.nameMax} /></span>
                        <input className="wpb-input" value={nameDraft} maxLength={LIMITS.nameMax} autoFocus
                          onChange={(e) => { setNameDraft(e.target.value); setNameErr(''); }} placeholder={displayName} />
                      </label>
                      <span className="wpp-small wpb-faint">
                        Meta checks it against the business: use the name on our website, invoices or shop board. No extra words like “Official” or “Offers”, no emojis or full capitals, and not just a common word. Customers keep seeing “{displayName}” until Meta approves the new one.
                      </span>
                      {nameErr && (
                        <span className="wpp-small t-danger" role="alert">{nameErr} <a className="wpb-link" href={MANAGER_URL} target="_blank" rel="noopener noreferrer">Open WhatsApp Manager</a></span>
                      )}
                      <span className="wpb-actions">
                        <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => { setNameOpen(false); setNameErr(''); }}>Cancel</button>
                        <button type="submit" className="wpb-btn wpb-btn--sm" disabled={nameBusy || nameDraft.trim().length < LIMITS.nameMin}>{nameBusy ? 'Sending…' : 'Send for review'}</button>
                      </span>
                    </form>
                  )}
                </div>

                <label className="wpb-field">
                  <span className="wpp-label-row"><span>About</span><Counter n={p.about.length} max={LIMITS.about} /></span>
                  <input className={`wpb-input${errs.about ? ' is-bad' : ''}`} value={p.about} maxLength={LIMITS.about} onChange={setField('about', LIMITS.about)} aria-invalid={!!errs.about} />
                  <span className={`wpp-small ${errs.about ? 't-danger' : 'wpb-faint'}`}>{errs.about || 'One short line under our name, like a status. Opening hours fit well here.'}</span>
                </label>

                <label className="wpb-field">
                  <span className="wpp-label-row"><span>Description</span><Counter n={p.description.length} max={LIMITS.description} /></span>
                  <textarea className="wpb-input wpb-textarea" rows={4} value={p.description} maxLength={LIMITS.description} onChange={setField('description', LIMITS.description)} />
                  <span className="wpp-small wpb-faint">What we sell, delivery and returns in a few lines. You can mention the other stores too.</span>
                </label>

                <label className="wpb-field">
                  <span className="wpp-label-row"><span>Address</span><Counter n={p.address.length} max={LIMITS.address} /></span>
                  <input className="wpb-input" value={p.address} maxLength={LIMITS.address} onChange={setField('address', LIMITS.address)} />
                </label>

                <div className="wpp-grid">
                  <label className="wpb-field">Email
                    <input className={`wpb-input${errs.email ? ' is-bad' : ''}`} type="email" value={p.email} maxLength={LIMITS.email} onChange={setField('email', LIMITS.email)} aria-invalid={!!errs.email} />
                    <span className={`wpp-small ${errs.email ? 't-danger' : 'wpb-faint'}`}>{errs.email || 'Customers can tap it to write to us.'}</span>
                  </label>
                  <div className="wpb-field">
                    <span>Business category</span>
                    <Dropdown value={p.vertical} onChange={setField('vertical')} options={verticals} placeholder="Pick a category" className="wpb-dd" />
                    <span className="wpp-small wpb-faint">Shown under our name and used by WhatsApp search.</span>
                  </div>
                  <label className="wpb-field">Website 1
                    <input className={`wpb-input${errs.web1 ? ' is-bad' : ''}`} value={p.web1} maxLength={LIMITS.website} onChange={setField('web1', LIMITS.website)} placeholder="https://" aria-invalid={!!errs.web1} />
                    <span className={`wpp-small ${errs.web1 ? 't-danger' : 'wpb-faint'}`}>{errs.web1 || 'Usually the store homepage.'}</span>
                  </label>
                  <label className="wpb-field">Website 2
                    <input className={`wpb-input${errs.web2 ? ' is-bad' : ''}`} value={p.web2} maxLength={LIMITS.website} onChange={setField('web2', LIMITS.website)} placeholder="https://" aria-invalid={!!errs.web2} />
                    <span className={`wpp-small ${errs.web2 ? 't-danger' : 'wpb-faint'}`}>{errs.web2 || 'Optional: Instagram, or the group site.'}</span>
                  </label>
                </div>

                {dirty && (
                  <div className="wpp-savebar" role="status">
                    <span className="wpp-col">
                      <b>{invalid ? 'Fix the fields in red before saving' : changed.length === 1 ? '1 unsaved change to the profile' : `${changed.length} unsaved changes to the profile`}</b>
                      <span className="wpb-hint">Changed: {changed.map((k) => FIELD_NAMES[k]).join(', ')}. Saving updates WhatsApp for {storesWord}.</span>
                      {saveErr && <span className="wpp-small t-danger" role="alert">{saveErr}</span>}
                    </span>
                    <span className="wpb-actions">
                      <button type="button" className="wpb-btn wpb-btn--ghost" onClick={discard} disabled={saving}>Discard</button>
                      <button type="button" className="wpb-btn wpb-btn--go" onClick={save} disabled={invalid || saving}>
                        {saving ? 'Saving…' : invalid ? 'Can’t save yet' : 'Save to WhatsApp'}
                      </button>
                    </span>
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="wpp-preview" aria-label="Preview on a phone">
            <span className="wpp-eyebrow-row"><span className="wpb-eyebrow">How it looks in WhatsApp</span><span className="wpb-eyebrow t-success">Live</span></span>
            <div className="wpp-phone">
              <div className="wpp-phone-bar"><span>9:41</span><span aria-hidden="true">▮▮▮ ◔</span></div>
              <div className="wpp-phone-nav" aria-hidden="true"><span>←</span><span>⋮</span></div>
              <div className="wpp-phone-head">
                <Avatar src={photo?.url || avatarSrc} name={previewName} size={92} className="wpp-avatar--phone" />
                <span className="wpp-phone-name"><b>{previewName}</b>{(nameStatus?.[0] === 'success' || h?.verified) && <span className="wpp-tick wpp-tick--sm">✓</span>}</span>
                {p?.vertical && p.vertical !== 'UNDEFINED' && <span className="wpp-phone-sub">{catLabel}</span>}
                <span className="wpp-phone-sub wpp-mono">{phoneMasked}</span>
              </div>
              <div className="wpp-phone-actions" aria-hidden="true">{['Message', 'Share', 'Search'].map((a) => <span key={a}>{a}</span>)}</div>
              <div className="wpp-phone-card">
                <span className={p?.about?.trim() ? '' : 'wpp-phone-empty'}>{p?.about?.trim() ? p.about : 'No About text yet'}</span>
              </div>
              <div className="wpp-phone-card wpp-phone-card--list">
                <span className={`wpp-phone-desc${p?.description?.trim() ? '' : ' wpp-phone-empty'}`}>{p?.description?.trim() ? p.description : 'No description yet'}</span>
                {previewRows.map(([label, value], i) => (
                  <span key={`${label}-${i}`} className="wpp-phone-row">
                    <span className={i > 1 || label === 'Email' || label === 'Website' ? 'wpp-phone-link' : ''}>{value}</span>
                    <span className="wpp-phone-label">{label}</span>
                  </span>
                ))}
              </div>
              {catalogSet && (
                <div className="wpp-phone-card wpp-phone-card--last">
                  <span className="wpp-phone-row-top"><span>Catalogue</span><span className="wpp-phone-link">See all</span></span>
                </div>
              )}
            </div>
            <span className="wpp-small wpb-faint wpp-center">Updates as you type. Android and iPhone lay it out slightly differently. Empty fields are hidden from customers.</span>
          </aside>
        </div>
      )}

      {/* ── Keys + health ── */}
      <div className="wpp-split wpp-split--even">
        <section className="wpb-card wpb-form wpp-keys" id="wpp-keys" aria-label="Connection keys">
          <div className="wpb-h2-row">
            <div className="wpp-col">
              <h2 className="wpb-h2">Connection keys</h2>
              <span className="wpb-hint">How our server talks to WhatsApp. Only admins can see or change these.</span>
            </div>
            <Badge tone="info">Admin only</Badge>
          </div>
          <span className="wpp-note">
            Used by {storesWord}. Each store’s name, links and win-back offer are set on{' '}
            <button type="button" className="wpb-link" onClick={() => goToBrands(stores.data?.stores?.[0]?.brandId || null)}>Brands → Store</button>.
          </span>
          {keys.data && keys.data.canEncrypt === false && (
            <span className="wpp-small t-warn">The server has no DATA_ENCRYPTION_KEY, so a new token is stored without encryption.</span>
          )}
          {keys.loading && !keys.data ? (
            <SkeletonList rows={4} label="Loading the connection keys…" />
          ) : keys.err && !keys.data ? (
            <State kind="error" title="Couldn’t load the keys" text={keys.err} onRetry={loadKeys} />
          ) : (
            <ul className="wpp-keylist">
              {(keys.data?.keys || []).map((k) => {
                const info = KEY_INFO[k.field] || {};
                const open = !!guide[k.field];
                const note = keyNote(k);
                const isEditing = editing === k.field;
                const result = keyResult && keyResult.field === k.field ? keyResult : null;
                const isToken = k.field === 'token';
                return (
                  <li key={k.field} className="wpp-key">
                    <div className="wpp-key-top">
                      <span className="wpp-col wpp-grow">
                        <span className="wpp-row">
                          <b className="wpp-label-strong">{k.label}</b>
                          <button type="button" className={`wpp-info${open ? ' is-on' : ''}`} aria-expanded={open} aria-label={`Where to find the ${k.label.toLowerCase()}`}
                            onClick={() => setGuide((g) => ({ ...g, [k.field]: !g[k.field] }))}>
                            <HugeiconsIcon icon={InformationCircleIcon} size={16} strokeWidth={2} />
                          </button>
                        </span>
                        <span className={`wpp-small t-${note.tone}`}>{note.text}</span>
                      </span>
                      <span className="wpp-keyval" title={isToken ? undefined : k.value}>{k.value || '—'}</span>
                      <span className="wpb-actions">
                        {!isToken && k.value && (
                          <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => copy(k.field, k.value)}>
                            <HugeiconsIcon icon={Copy01Icon} size={13} strokeWidth={2} /> {copied === k.field ? 'Copied' : 'Copy'}
                          </button>
                        )}
                        <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" disabled={isEditing}
                          onClick={() => { setEditing(k.field); setKeyDraft(isToken ? '' : k.value || ''); setKeyResult(null); }}>
                          {isToken ? (isEditing ? 'Replacing…' : k.isSet ? 'Replace' : 'Add') : k.isSet ? 'Edit' : 'Add'}
                        </button>
                      </span>
                    </div>
                    {isEditing && (
                      <form className="wpp-key-edit" onSubmit={(e) => { e.preventDefault(); if (keyDraft.trim() || k.optional) saveKey(k.field, keyDraft.trim()); }}>
                        <input className="wpb-input wpb-mono wpp-grow" autoFocus
                          type={isToken ? 'password' : 'text'} autoComplete={isToken ? 'new-password' : 'off'} inputMode={isToken ? undefined : 'numeric'}
                          placeholder={isToken ? 'Paste the new token (it starts with EAA…)' : 'Numbers only'} aria-label={`New ${k.label.toLowerCase()}`}
                          value={keyDraft} onChange={(e) => setKeyDraft(e.target.value)} />
                        <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => { setEditing(null); setKeyDraft(''); }} disabled={keyBusy}>Cancel</button>
                        <button type="submit" className="wpb-btn wpb-btn--sm" disabled={keyBusy || (!keyDraft.trim() && !k.optional)}>
                          {keyBusy ? 'Testing…' : isToken || k.field === 'phoneNumberId' ? 'Test and save' : 'Save'}
                        </button>
                        <span className="wpp-small wpb-faint wpp-full">
                          {isToken || k.field === 'phoneNumberId'
                            ? `We send a test call to WhatsApp first. The old ${isToken ? 'token' : 'ID'} keeps working until the new one passes.`
                            : k.optional ? 'Leave empty and save to remove it.' : 'Saved straight away. Check the Templates page afterwards.'}
                        </span>
                      </form>
                    )}
                    {result && (
                      <span className={`wpp-result ${result.ok ? 't-success' : 't-danger'}`} role={result.ok ? 'status' : 'alert'}>
                        {result.ok ? '✓ ' : ''}{result.message}
                      </span>
                    )}
                    {open && (
                      <div className="wpp-guide">
                        <span className="wpb-eyebrow">Where to find it</span>
                        <ol>
                          {(info.steps || []).map((s, i) => (
                            <li key={i}><b aria-hidden="true">{i + 1}</b><span>{s.replace('{phone}', phoneMasked || 'our number')}</span></li>
                          ))}
                        </ol>
                        {info.perms?.length > 0 && <span className="wpp-perms">{info.perms.map((x) => <code key={x}>{x}</code>)}</span>}
                        {info.tip && <span className={`wpp-small wpp-guide-tip ${info.tipTone === 'warn' ? 't-warn' : 't-muted'}`}>{info.tip}</span>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="wpb-card wpb-form wpp-health" aria-label="Health">
          <div className="wpb-h2-row">
            <div className="wpp-col">
              <h2 className="wpb-h2">Health <span>· last 7 days, all stores</span></h2>
              <span className="wpb-hint">Do our messages reach customers?</span>
            </div>
            {goTo && (
              <button type="button" className="wpb-link wpp-small" onClick={() => goTo('settings')}>
                See failed sends <HugeiconsIcon icon={ArrowRight01Icon} size={12} strokeWidth={2} />
              </button>
            )}
          </div>
          {stats.loading && !funnel ? (
            <SkeletonKpis count={4} className="wpp-tiles-sk" label="Loading message numbers…" />
          ) : stats.err && !funnel ? (
            <State kind="error" title="Couldn’t load the numbers" text={stats.err} onRetry={loadStats} />
          ) : (
            <>
              <div className="wpp-tiles">
                {tiles.map((t) => (
                  <div key={t.label} className="wpp-tile">
                    <span className="wpb-eyebrow">{t.label}</span>
                    <b className={`wpp-tile-v ${t.tone}`}>{t.value}</b>
                    <span className="wpp-small t-muted">{t.note}</span>
                  </div>
                ))}
              </div>
              {reasons.length > 0 ? (
                <>
                  <div className="wpp-topfail">
                    <span className="wpb-eyebrow t-warn">Top reason messages failed</span>
                    <b>{reasons[0].reason}</b>
                    <span className="wpp-small t-warn">
                      {capped ? `${reasons[0].n} of the last ${failedRows.length} failures` : `${reasons[0].n} of ${totalFailed} failures`} ({Math.round(pct(reasons[0].n, failedRows.length))}%)
                    </span>
                    <span className="wpb-hint">{adviceFor(reasons[0].reason)}</span>
                  </div>
                  {reasons.length > 1 && (
                    <ul className="wpp-reasons">
                      {reasons.slice(1, 5).map((r) => <li key={r.reason}><span>{r.reason}</span><b>{num(r.n)}</b></li>)}
                      {reasons.length > 5 && <li><span>Other reasons</span><b>{num(reasons.slice(5).reduce((n, r) => n + r.n, 0))}</b></li>}
                    </ul>
                  )}
                </>
              ) : (
                <span className="wpb-hint t-success">Nothing failed in the last 7 days.</span>
              )}
            </>
          )}
        </section>
      </div>

      {/* ── Per-store identity ── */}
      <section className="wpb-card wpb-card--flush" aria-label="Per-store message identity">
        <div className="wpp-stores-head">
          <div className="wpp-col">
            <h2 className="wpb-h2">How each store signs its messages</h2>
            <span className="wpb-hint">Same number, but each store’s order updates and offers use its own name, links and win-back code. Read-only here.</span>
          </div>
          {stores.data && (
            <span className="wpp-small wpb-faint">
              {stores.data.attention
                ? `${stores.data.attention} ${stores.data.attention === 1 ? 'store needs' : 'stores need'} attention: win-back skips a store whose code isn’t active.`
                : 'Every store’s win-back code is active.'}
            </span>
          )}
        </div>
        {stores.data && stores.data.winbackAutomationOn === false && (
          <div className="wpb-banner t-warn wpp-banner">Win-back messages are switched off in Automatic messages, so no store sends them right now.</div>
        )}
        {stores.err && !stores.data ? (
          <State kind="error" title="Couldn’t load the stores" text={stores.err} onRetry={loadStores} />
        ) : (
          <div className="wpb-tbl-wrap">
            <table className="wpb-tbl wpp-tbl">
              <thead><tr><th>Store</th><th>Name shown in messages</th><th>Link domain</th><th>Win-back code</th><th className="r"><span className="wpb-sr">Edit</span></th></tr></thead>
              <tbody aria-busy={stores.loading || undefined}>
                {stores.loading && !stores.data ? <SkeletonTableRows rows={4} cols={5} /> : (stores.data?.stores || []).map((s) => {
                  const w = s.winback || {};
                  const tag = w.status === 'active'
                    ? (w.isDefault ? ['muted', 'Default code · active'] : ['success', 'Active'])
                    : w.status === 'ended' ? ['warn', w.endedAt ? `Code ended ${day(w.endedAt)}` : 'Code ended']
                      : w.status === 'off' ? ['warn', 'Switched off']
                        : w.status === 'scheduled' ? ['info', 'Not started']
                          : w.status === 'other_store' ? ['danger', 'Another store’s code'] : ['danger', 'Code missing'];
                  const nameNote = s.nameSource === 'store_name' ? 'From the store-name setting'
                    : s.messageName === s.store ? 'Same as the brand name' : 'Store name on Brands';
                  return (
                    <tr key={s.brandId}>
                      <td>
                        <span className="wpp-row">
                          <span className="wpp-dot" style={s.color ? { '--wpp-dot': s.color } : undefined} aria-hidden="true">{String(s.store || '?').charAt(0)}</span>
                          <b className="wpb-strong">{s.store}</b>
                          {s.status !== 'active' && <Badge tone="muted">Hidden</Badge>}
                        </span>
                      </td>
                      <td>
                        <span className="wpb-strong">{s.messageName}</span>
                        <span className="wpb-cell-sub">{nameNote}</span>
                        {s.storeNameSetting && s.storeNameSetting !== s.messageName && (
                          <span className="wpb-cell-sub t-warn">Store-name setting “{s.storeNameSetting}” isn’t used</span>
                        )}
                      </td>
                      <td className="wpp-mono">{s.domain || '—'}</td>
                      <td>
                        <span className="wpp-row"><b className="wpp-mono">{w.code}</b><Badge tone={tag[0]}>{tag[1]}</Badge></span>
                        {w.note && <span className="wpb-cell-sub">{w.note}</span>}
                      </td>
                      <td className="r">
                        <button type="button" className="wpb-link wpp-nowrap" onClick={() => goToBrands(s.brandId)}>Edit on Brands →</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
