// WhatsApp studio → Inbox.
// Chat list (server-side search + filter chips), the open conversation, and the
// customer / latest-order panel. Live updates come from the /stream long-poll.
// When WhatsApp's 24-hour reply window is closed the composer turns into a
// template picker; typing "/" in the composer opens the quick replies.
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon, Cancel01Icon, ArrowLeft01Icon, InformationCircleIcon, Tick02Icon, RefreshIcon,
  SentIcon, SmileIcon, Attachment01Icon, ShoppingBag01Icon, Clock01Icon, ArrowTurnBackwardIcon,
  WhatsappIcon, FlashIcon,
} from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';
import { Modal, Skeleton, SkeletonList, SkeletonText } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { showSuccess, showError } from '../../utils/toastNotification';
import { MsgContent, msgPreview, FormattedText, API_BASE } from './InboxMedia';

const W = '/api/whatsapp';
const PAGE_SIZE = 30;
const MSG_CACHE_MAX = 40;

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'waiting', label: 'Waiting for us' },
  { key: 'window_closed', label: 'Window closed' },
  { key: 'has_order', label: 'Has order' },
];
const STATUS_OPTIONS = [
  { value: 'open', label: 'Open chats' },
  { value: 'resolved', label: 'Resolved chats' },
  { value: 'all', label: 'Open and resolved' },
];

// Order stage keys from the backend (chatContextService) → label + tone.
const STAGES = {
  to_confirm: ['To confirm', 'warn'],
  to_ship: ['To ship', 'info'],
  in_transit: ['In transit', 'info'],
  problems: ['Delivery problem', 'danger'],
  delivered: ['Delivered', 'success'],
  returns: ['Returned', 'accent2'],
  cancelled_rto: ['Cancelled', 'muted'],
};
function stageInfo(stage, label) {
  if (stage && STAGES[stage]) return { label: label || STAGES[stage][0], tone: STAGES[stage][1] };
  const s = String(label || stage || '').trim();
  return s ? { label: s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' '), tone: 'muted' } : null;
}

const QUICK_EMOJIS = [
  '😊', '🙏', '👍', '🙌', '🎉', '❤️', '😍', '🔥', '✅', '💯',
  '😀', '😄', '😅', '😉', '😎', '🤝', '👏', '💪', '🙂', '😇',
  '🛍️', '📦', '🚚', '💳', '🎁', '⭐', '🏷️', '📸', '⏰', '📍',
  '😢', '😔', '😟', '🙇', '🤗', '💚', '✨', '👋', '☑️', '❗',
];

const PLACEHOLDER_RE = /\{(name|order|courier|tracking_link|brand)\}/g;

// ── helpers ─────────────────────────────────────────────────────────────────
const errMsg = (e, fallback) => e?.response?.data?.message || (typeof e?.message === 'string' && e.message) || (typeof e === 'string' && e) || fallback;
const isCancel = (e) => e?.name === 'CanceledError' || e?.name === 'AbortError' || e?.code === 'ERR_CANCELED';
const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
function initials(name) { return String(name || '?').trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2) || '?'; }
function phoneLabel(p) {
  const d = String(p || '').replace(/\D/g, '');
  if (d.length === 12 && d.startsWith('91')) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  return d ? `+${d}` : '';
}
function listTime(date, now) {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  if (now - d.getTime() < 6 * 86400000) return d.toLocaleDateString('en-IN', { weekday: 'short' });
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function msgTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}
function whenLabel(date, now) {
  if (!date) return '';
  const d = new Date(date);
  const t = msgTime(d);
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return `today at ${t}`;
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return `yesterday at ${t}`;
  return `on ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${t}`;
}
function dayLabel(d, now) {
  const today = new Date(now);
  if (d.toDateString() === today.toDateString()) return 'Today';
  const y = new Date(now); y.setDate(y.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}
function waitingBadge(since, now) {
  if (!since) return null;
  const mins = Math.max(0, Math.floor((now - new Date(since).getTime()) / 60000));
  let text;
  if (mins < 60) text = `Waiting ${Math.max(1, mins)} min`;
  else if (mins < 1440) text = `Waiting ${Math.floor(mins / 60)} h`;
  else text = `Waiting ${Math.floor(mins / 1440)} d`;
  const tone = mins >= 240 ? 'danger' : mins >= 30 ? 'warn' : 'info';
  return { text, tone };
}
function windowLeftLabel(closesAt, now) {
  const ms = new Date(closesAt).getTime() - now;
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60000);
  return mins < 60 ? `${Math.max(1, mins)} min left` : `${Math.floor(mins / 60)} h left`;
}
const normShortcut = (s) => String(s || '').toLowerCase().replace(/^\//, '').trim();
const mergeMessages = (existing, incoming) => {
  const byId = new Map();
  for (const m of existing) byId.set(m.id, m);
  for (const m of incoming) byId.set(m.id, { ...byId.get(m.id), ...m });
  return Array.from(byId.values()).sort((a, b) => {
    const ta = typeof a.id === 'number' ? a.id : Number.MAX_SAFE_INTEGER;
    const tb = typeof b.id === 'number' ? b.id : Number.MAX_SAFE_INTEGER;
    return ta - tb;
  });
};
const goView = (view) => {
  window.history.pushState({}, '', `/dashboard/${view}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

function Pill({ tone = 'muted', children, title }) {
  return <span className={`wib-pill wib-pill--${tone}`} title={title}>{children}</span>;
}

// Message-bubble placeholders for the thread while a chat's messages load:
// [side, bubble width, text lines]. Alternating sides and widths so it reads
// as a conversation, not a table.
const SKEL_THREAD = [
  ['in', '58%', 2], ['in', '34%', 1], ['out', '46%', 1], ['in', '66%', 3],
  ['out', '52%', 2], ['out', '28%', 1], ['in', '42%', 1], ['out', '60%', 2],
];
const SKEL_OLDER = [['in', '44%', 1], ['out', '32%', 1]];
function ThreadSkeleton({ rows = SKEL_THREAD, day = true, label = 'Loading messages…' }) {
  return (
    <div className="wib-msgs-sk" role="status" aria-busy="true" aria-live="polite">
      <span className="ds-sr-only">{label}</span>
      {day && <div className="wib-day" aria-hidden="true"><Skeleton w={72} h={20} r={999} /></div>}
      {rows.map(([side, w, lines], i) => (
        <div key={i} className={`wib-msg is-${side}`} style={{ width: w }} aria-hidden="true">
          <div className="wib-bubble wib-bubble--sk">
            {Array.from({ length: lines }, (_, j) => (
              <Skeleton key={j} h={10} w={lines > 1 && j === lines - 1 ? '62%' : '100%'} />
            ))}
            <Skeleton className="wib-sk-time" w={36} h={8} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// One of our messages from the last 10 minutes that WhatsApp hasn't confirmed
// (delivered / read) or rejected yet.
function hasUnconfirmed(list) {
  const cutoff = Date.now() - 10 * 60 * 1000;
  return (list || []).some((m) => m.direction === 'outbound'
    && (m.status === 'sent' || m.status === 'sending' || !m.status)
    && new Date(m.createdAt || m.sent_at || 0).getTime() > cutoff);
}

export default function InboxPage({ brandId = '', brands = [], goTo, extra, onUnreadChange }) {
  const { canAccessView } = useAuth();
  const canOrders = canAccessView ? canAccessView('orders') : true;
  const canCustomer = canAccessView ? canAccessView('customer') : true;

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60000); return () => clearInterval(t); }, []);

  const brandName = useCallback((id) => brands.find((b) => b.id === id)?.name || (id ? `Brand ${id}` : ''), [brands]);

  // ── Chat list ──────────────────────────────────────────────────────────────
  const [q, setQ] = useState('');
  const [qDeb, setQDeb] = useState('');
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState('open');
  const [conversations, setConversations] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState(null);
  const [convLoading, setConvLoading] = useState(true);
  const [convError, setConvError] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const convReqRef = useRef(0);
  const pageRef = useRef(1);
  const conversationsRef = useRef([]);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);

  useEffect(() => { const t = setTimeout(() => setQDeb(q.trim()), 300); return () => clearTimeout(t); }, [q]);

  // ── Open chat ──────────────────────────────────────────────────────────────
  const [activeConv, setActiveConv] = useState(null);
  const activeRef = useRef(null);
  useEffect(() => { activeRef.current = activeConv; }, [activeConv]);
  const activeId = activeConv?.id || null;
  const [messages, setMessages] = useState([]);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState(null);
  const [hasMoreMsgs, setHasMoreMsgs] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const openReqRef = useRef(null);
  const msgAbortRef = useRef(null);
  const cacheRef = useRef(new Map());
  const prefetchingRef = useRef(new Set());
  const messagesBoxRef = useRef(null);
  const nearBottomRef = useRef(true);

  const [chatCtx, setChatCtx] = useState(null);
  const [ctxState, setCtxState] = useState('idle'); // idle | loading | ready | error
  const [confirmingOrder, setConfirmingOrder] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [closedOverride, setClosedOverride] = useState(null); // conv id the server refused a typed reply for

  // ── Composer ───────────────────────────────────────────────────────────────
  const [reply, setReply] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [canned, setCanned] = useState([]);
  const [slash, setSlash] = useState(null); // { start, end, query }
  const [slashIdx, setSlashIdx] = useState(0);
  const replyRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Template picker (window closed) ────────────────────────────────────────
  const [tplOptions, setTplOptions] = useState([]);
  const [tplState, setTplState] = useState('idle'); // idle | loading | ready | error
  const [tplPick, setTplPick] = useState(null);
  const [tplValues, setTplValues] = useState([]);
  const [tplSending, setTplSending] = useState(false);

  // ── Products ───────────────────────────────────────────────────────────────
  const [productModal, setProductModal] = useState(false);
  const [productBrand, setProductBrand] = useState(null);
  const [productSearch, setProductSearch] = useState('');
  const [productList, setProductList] = useState([]);
  const [productState, setProductState] = useState('idle');
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [sendingProduct, setSendingProduct] = useState(false);

  const touchCache = (id, msgs) => {
    const m = cacheRef.current;
    if (m.has(id)) m.delete(id);
    m.set(id, msgs);
    while (m.size > MSG_CACHE_MAX) m.delete(m.keys().next().value);
  };

  // ════ Conversations ══════════════════════════════════════════════════════
  const listParams = (page, limit) => {
    const p = { status, filter, page, limit, brandId: brandId || 'all' };
    if (qDeb) p.q = qDeb;
    return p;
  };

  const fetchConversations = async ({ silent = false } = {}) => {
    const req = ++convReqRef.current;
    if (!silent) { setConvLoading(true); setConvError(null); pageRef.current = 1; }
    try {
      // A silent (live) refresh re-reads everything already on screen so rows
      // paged in with "Load more" don't disappear.
      const limit = silent ? Math.min(100, Math.max(PAGE_SIZE, conversationsRef.current.length)) : PAGE_SIZE;
      const { data } = await adminApi.get(`${W}/conversations`, { params: listParams(1, limit) });
      if (req !== convReqRef.current) return;
      if (!data?.success) throw new Error(data?.message || 'Could not load chats');
      const openId = activeRef.current?.id;
      const rows = (data.conversations || []).map((c) => (c.id === openId ? { ...c, unread_count: 0 } : c));
      setConversations(rows);
      setTotal(Number(data.total) || rows.length);
      setCounts(data.counts || null);
      setConvError(null);
    } catch (e) {
      if (req !== convReqRef.current) return;
      if (!silent) { setConversations([]); setTotal(0); setConvError(errMsg(e, 'Could not load chats')); }
    } finally {
      if (req === convReqRef.current) setConvLoading(false);
    }
  };
  const fetchRef = useRef(fetchConversations);
  fetchRef.current = fetchConversations;

  useEffect(() => { fetchRef.current(); }, [qDeb, filter, status, brandId]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    const req = convReqRef.current;
    const next = pageRef.current + 1;
    try {
      const { data } = await adminApi.get(`${W}/conversations`, { params: listParams(next, PAGE_SIZE) });
      if (req !== convReqRef.current) return;
      if (!data?.success) throw new Error(data?.message);
      pageRef.current = next;
      setTotal(Number(data.total) || 0);
      setConversations((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...(data.conversations || []).filter((c) => !seen.has(c.id))];
      });
    } catch (e) {
      showError('loadingFailed', errMsg(e, 'Could not load more chats'));
    } finally {
      setLoadingMore(false);
    }
  };

  // Unread badge on the studio nav.
  const unreadTotal = counts && counts.unread != null
    ? Number(counts.unread)
    : conversations.filter((c) => c.unread_count > 0).length;
  useEffect(() => { if (onUnreadChange) onUnreadChange(convLoading ? null : unreadTotal); }, [unreadTotal, convLoading, onUnreadChange]);

  // ════ Messages ═══════════════════════════════════════════════════════════
  const scrollToBottom = () => {
    const el = messagesBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  useEffect(() => { if (nearBottomRef.current) scrollToBottom(); }, [messages]);
  const onMessagesScroll = () => {
    const el = messagesBoxRef.current;
    if (el) nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  const prefetch = (conv) => {
    if (!conv || cacheRef.current.has(conv.id) || prefetchingRef.current.has(conv.id)) return;
    if (prefetchingRef.current.size >= 2) return;
    prefetchingRef.current.add(conv.id);
    adminApi.get(`${W}/conversations/${conv.id}/messages`)
      .then(({ data }) => { if (data?.success) touchCache(conv.id, data.messages || []); })
      .catch(() => {})
      .finally(() => prefetchingRef.current.delete(conv.id));
  };

  const openChat = async (conv) => {
    if (!conv?.id) return;
    openReqRef.current = conv.id;
    if (msgAbortRef.current) { try { msgAbortRef.current.abort(); } catch { /* ignore */ } }
    const ac = new AbortController();
    msgAbortRef.current = ac;
    const listed = conversationsRef.current.find((c) => c.id === conv.id);
    const base = listed ? { ...listed, ...conv } : conv;
    setActiveConv(base);
    setReply(''); setReplyTo(null); setShowEmoji(false); setSlash(null);
    setNote(base.agent_notes || '');
    setTplPick(null); setTplValues([]);
    setMsgError(null);
    // Mark read locally (the server clears it when the messages are fetched).
    if (listed?.unread_count > 0) {
      setConversations((prev) => prev.map((c) => (c.id === conv.id ? { ...c, unread_count: 0 } : c)));
      setCounts((prev) => (prev && prev.unread != null ? { ...prev, unread: Math.max(0, Number(prev.unread) - 1) } : prev));
    }
    const cached = cacheRef.current.get(conv.id);
    nearBottomRef.current = true;
    if (cached) { setMessages(cached); setMsgLoading(false); } else { setMessages([]); setMsgLoading(true); }
    try {
      const { data } = await adminApi.get(`${W}/conversations/${conv.id}/messages`, { signal: ac.signal });
      if (openReqRef.current !== conv.id) return;
      if (!data?.success) throw new Error(data?.message || 'Could not load messages');
      const msgs = data.messages || [];
      touchCache(conv.id, msgs);
      nearBottomRef.current = true;
      setMessages(msgs);
      setHasMoreMsgs(!!data.hasMore);
      if (data.conversation) {
        setActiveConv((prev) => (prev && prev.id === conv.id ? { ...prev, ...data.conversation, unread_count: 0 } : prev));
        if (!listed) setNote(data.conversation.agent_notes || '');
      }
    } catch (e) {
      if (isCancel(e) || openReqRef.current !== conv.id) return;
      if (!cached) { setMessages([]); setHasMoreMsgs(false); setMsgError(errMsg(e, 'Could not load messages')); }
    }
    if (openReqRef.current === conv.id) setMsgLoading(false);
  };

  const closeChat = () => {
    openReqRef.current = null;
    setActiveConv(null); setMessages([]); setShowInfo(false);
    setReply(''); setReplyTo(null); setShowEmoji(false); setSlash(null);
  };

  const loadOlder = async () => {
    if (!activeConv || loadingOlder || !messages.length) return;
    const convId = activeConv.id;
    setLoadingOlder(true);
    const oldest = messages.find((m) => typeof m.id === 'number')?.id;
    const el = messagesBoxRef.current;
    const prevH = el ? el.scrollHeight : 0;
    const prevTop = el ? el.scrollTop : 0;
    try {
      const { data } = await adminApi.get(`${W}/conversations/${convId}/messages`, { params: oldest ? { before: oldest } : {} });
      if (openReqRef.current === convId && data?.success) {
        nearBottomRef.current = false;
        setMessages((prev) => mergeMessages(data.messages || [], prev));
        setHasMoreMsgs(!!data.hasMore);
        requestAnimationFrame(() => {
          const el2 = messagesBoxRef.current;
          if (el2) el2.scrollTop = prevTop + (el2.scrollHeight - prevH);
        });
      }
    } catch (e) {
      showError('loadingFailed', errMsg(e, 'Could not load older messages'));
    }
    setLoadingOlder(false);
  };

  const refreshActiveMessages = async (convId) => {
    try {
      const { data } = await adminApi.get(`${W}/conversations/${convId}/messages`);
      if (data?.success && openReqRef.current === convId) {
        setMessages((prev) => {
          const merged = mergeMessages(prev, data.messages || []);
          touchCache(convId, merged);
          return merged;
        });
      }
    } catch { /* next live update will retry */ }
  };

  // Deep link (Orders, customer profile, search, abandoned carts…).
  useEffect(() => {
    if (extra?.conversationId) openChat({ id: Number(extra.conversationId) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extra]);

  // ════ Live updates (long-poll /stream) ═══════════════════════════════════
  const onLive = (streamConvs) => {
    fetchRef.current({ silent: true });
    const open = activeRef.current;
    if (!open) return;
    const updated = streamConvs.find((c) => c.id === open.id);
    if (updated && (!open.last_message_at || new Date(updated.last_message_at) > new Date(open.last_message_at))) {
      activeRef.current = { ...open, last_message_at: updated.last_message_at };
      setActiveConv((prev) => (prev && prev.id === open.id ? { ...prev, last_message_at: updated.last_message_at, last_message: updated.last_message } : prev));
      refreshActiveMessages(open.id);
    } else if (hasUnconfirmed(messagesRef.current)) {
      // Delivered / read / failed ticks don't move last_message_at, so keep
      // re-reading the open chat while one of our recent messages is unconfirmed.
      refreshActiveMessages(open.id);
    }
  };
  const onLiveRef = useRef(onLive);
  onLiveRef.current = onLive;

  useEffect(() => {
    let alive = true;
    let controller = null;
    let timer = null;
    let since = null;
    const MIN_GAP = 3000; // never hot-loop if the server answers instantly
    const loop = async () => {
      if (!alive) return;
      controller = new AbortController();
      const started = Date.now();
      try {
        const { data } = await adminApi.get(`${W}/stream`, {
          params: { brandId: brandId || 'all', status: 'all', ...(since ? { since } : {}) },
          signal: controller.signal,
          timeout: 40000,
        });
        if (!alive) return;
        if (data?.success) {
          const convs = data.conversations || [];
          const first = since === null;
          const newest = convs[0]?.last_message_at || null;
          since = newest || data.serverTime || since || new Date().toISOString();
          if (!first) onLiveRef.current(convs);
        }
        timer = setTimeout(loop, Math.max(0, MIN_GAP - (Date.now() - started)));
      } catch (e) {
        if (!alive || isCancel(e)) return;
        timer = setTimeout(loop, 5000);
      }
    };
    loop();
    return () => { alive = false; clearTimeout(timer); if (controller) { try { controller.abort(); } catch { /* ignore */ } } };
  }, [brandId]);

  // ════ Context (orders + reply window) ════════════════════════════════════
  const loadCtx = async (id) => {
    setCtxState((s) => (s === 'ready' && activeRef.current?.id === id ? s : 'loading'));
    try {
      const { data } = await adminApi.get(`${W}/conversations/${id}/context`);
      if (activeRef.current?.id !== id) return;
      if (!data?.success) throw new Error(data?.message);
      setChatCtx(data);
      setCtxState('ready');
    } catch {
      if (activeRef.current?.id !== id) return;
      setChatCtx(null);
      setCtxState('error');
    }
  };
  useEffect(() => {
    setChatCtx(null);
    setCtxState('idle');
    setShowInfo(false);
    if (activeId) loadCtx(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);
  // The customer wrote again → the window may have re-opened.
  const lastInboundId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) if (messages[i].direction === 'inbound') return messages[i].id;
    return null;
  }, [messages]);
  const prevInboundRef = useRef({ conv: null, id: null });
  useEffect(() => {
    const prev = prevInboundRef.current;
    prevInboundRef.current = { conv: activeId, id: lastInboundId };
    if (activeId && prev.conv === activeId && prev.id && lastInboundId && lastInboundId !== prev.id) {
      setClosedOverride(null);
      loadCtx(activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastInboundId, activeId]);

  const win = useMemo(() => {
    if (!activeConv) return null;
    const rw = chatCtx?.replyWindow;
    if (rw) return { known: true, closesAt: rw.closesAt, lastInboundAt: rw.lastInboundAt, open: !!rw.open };
    if (activeConv.window_open !== undefined) {
      return { known: true, closesAt: activeConv.window_closes_at, lastInboundAt: activeConv.last_inbound_at, open: !!activeConv.window_open };
    }
    return { known: false, open: true };
  }, [activeConv, chatCtx]);
  const windowOpen = !win || !win.known
    ? true
    : closedOverride === activeId
      ? false
      : win.closesAt ? new Date(win.closesAt).getTime() > now : win.open;
  const isResolved = activeConv?.status === 'resolved';
  const showTemplatePicker = !!activeConv && !isResolved && win?.known && !windowOpen;

  // ════ Sending ════════════════════════════════════════════════════════════
  const latestOrder = chatCtx?.orders?.[0] || null;
  const fillPlaceholders = (body) => {
    const conv = activeRef.current;
    const first = String(conv?.customer_name || chatCtx?.address?.name || '').trim().split(/\s+/)[0] || '';
    const o = latestOrder;
    const values = {
      name: first,
      order: o?.orderNumber || '',
      courier: o?.courier || '',
      tracking_link: o?.trackingUrl || o?.trackingLink || (o?.orderNumber ? `${API_BASE}/api/track/${encodeURIComponent(o.orderNumber)}` : ''),
      brand: o?.brand || brandName(conv?.brand_id) || '',
    };
    return String(body || '').replace(PLACEHOLDER_RE, (all, key) => values[key] || all);
  };
  const unfilled = useMemo(() => Array.from(new Set((reply.match(PLACEHOLDER_RE) || []))), [reply]);

  const deliverReply = async (msg) => {
    const tempId = msg.id;
    try {
      const { data } = await adminApi.post(`${W}/conversations/${msg.conversation_id}/reply`, {
        message: msg.body,
        brandId: msg._brandId,
        ...(msg._quotedWaId ? { quotedWaMessageId: msg._quotedWaId } : {}),
      });
      if (!data?.success) throw new Error(data?.message || 'Could not send the message');
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data.message, _quotedMsg: msg._quotedMsg || null } : m)));
      setConversations((prev) => prev.map((c) => (c.id === msg.conversation_id ? { ...c, last_message: msg.body, last_message_at: new Date().toISOString(), waiting_since: null } : c)));
      // The send to WhatsApp finishes in the background — pick up "Not sent"
      // (or the first tick) without waiting for the next live update.
      [4000, 12000].forEach((ms) => setTimeout(() => {
        if (activeRef.current?.id === msg.conversation_id) refreshActiveMessages(msg.conversation_id);
      }, ms));
    } catch (e) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m)));
      if (e?.response?.status === 409 && e.response.data?.code === 'WINDOW_CLOSED') {
        setClosedOverride(msg.conversation_id);
        showError('sendFailed', 'The 24-hour reply window has closed. Send an approved template instead.');
        loadCtx(msg.conversation_id);
      } else {
        showError('sendFailed', errMsg(e, 'Could not send the message'));
      }
    }
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || !activeConv) return;
    if (unfilled.length) { showError('fieldRequired', `Replace ${unfilled.join(', ')} before sending.`); return; }
    const optimistic = {
      id: `tmp-${Date.now()}`, _optimistic: true, conversation_id: activeConv.id,
      direction: 'outbound', type: 'text', body: text, status: 'sending', sent_at: new Date().toISOString(),
      _quotedMsg: replyTo || null, _quotedWaId: replyTo?.wa_message_id || null,
      _brandId: activeConv.brand_id || brandId || 1,
    };
    nearBottomRef.current = true;
    setMessages((prev) => [...prev, optimistic]);
    setReply(''); setReplyTo(null); setShowEmoji(false); setSlash(null);
    await deliverReply(optimistic);
  };
  const retryReply = async (msg) => {
    if (msg?.status !== 'failed') return;
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, status: 'sending' } : m)));
    nearBottomRef.current = true;
    await deliverReply({
      ...msg,
      status: 'sending',
      conversation_id: msg.conversation_id || activeConv?.id,
      _brandId: msg._brandId || activeConv?.brand_id || brandId || 1,
    });
  };

  const sendMediaFile = async (file) => {
    if (!file || !activeConv || uploadingMedia) return;
    if (file.size > 25 * 1024 * 1024) { showError('sendFailed', 'That file is larger than 25 MB. Please send a smaller file.'); return; }
    setUploadingMedia(true);
    const convId = activeConv.id;
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('brandId', activeConv.brand_id || brandId || 1);
      const { data } = await adminApi.post(`${W}/conversations/${convId}/send-media`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000,
      });
      if (!data?.success) throw new Error(data?.message || 'Could not send the file');
      if (openReqRef.current === convId && data.message) {
        nearBottomRef.current = true;
        setMessages((prev) => mergeMessages(prev, [data.message]));
      }
    } catch (e) {
      if (e?.response?.status === 409 && e.response.data?.code === 'WINDOW_CLOSED') {
        setClosedOverride(convId);
        showError('sendFailed', 'The 24-hour reply window has closed. Send an approved template instead.');
      } else showError('sendFailed', errMsg(e, 'Could not send the file'));
    }
    setUploadingMedia(false);
  };

  // ════ Conversation actions ═══════════════════════════════════════════════
  const setConvStatus = async (id, next) => {
    try {
      const { data } = await adminApi.put(`${W}/conversations/${id}/resolve`, { status: next });
      if (data && data.success === false) throw new Error(data.message);
      showSuccess('saved', next === 'resolved' ? 'Chat marked as resolved' : 'Chat re-opened');
      setActiveConv((prev) => (prev && prev.id === id ? { ...prev, status: next } : prev));
      setConversations((prev) => prev
        .map((c) => (c.id === id ? { ...c, status: next } : c))
        .filter((c) => status === 'all' || c.status === status));
      if (next === 'resolved' && status === 'open') closeChat();
      fetchRef.current({ silent: true });
    } catch (e) {
      showError('updateFailed', errMsg(e, next === 'resolved' ? 'Could not resolve the chat' : 'Could not re-open the chat'));
    }
  };

  const changeConvBrand = async (id, value) => {
    const bid = parseInt(value, 10);
    if (!bid) return;
    try {
      const { data } = await adminApi.put(`${W}/conversations/${id}/brand`, { brandId: bid });
      if (data && data.success === false) throw new Error(data.message);
      setActiveConv((prev) => (prev && prev.id === id ? { ...prev, brand_id: bid } : prev));
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, brand_id: bid } : c)));
      showSuccess('saved', `Store set to ${brandName(bid)}`);
    } catch (e) { showError('updateFailed', errMsg(e, 'Could not change the store')); }
  };

  const saveNote = async () => {
    if (!activeConv) return;
    const id = activeConv.id;
    const text = note.trim();
    setSavingNote(true);
    try {
      const { data } = await adminApi.put(`${W}/conversations/${id}/note`, { note: text });
      if (data && data.success === false) throw new Error(data.message);
      setActiveConv((prev) => (prev && prev.id === id ? { ...prev, agent_notes: text } : prev));
      setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, agent_notes: text } : c)));
      showSuccess('saved', 'Note saved');
    } catch (e) { showError('saveFailed', errMsg(e, 'Could not save the note')); }
    setSavingNote(false);
  };

  const confirmOrder = async (o) => {
    setConfirmingOrder(o.id);
    try {
      const { data } = await adminApi.put(`/api/orders/${o.id}/confirm`);
      if (data?.success === false) throw new Error(data.message || 'Could not confirm');
      showSuccess('orderConfirmed', `Order ${o.orderNumber} confirmed — booking the courier.`);
      if (activeRef.current) loadCtx(activeRef.current.id);
    } catch (e) { showError('confirmFailed', errMsg(e, 'Could not confirm the order')); }
    setConfirmingOrder(null);
  };
  const openInOrders = (orderNumber) => { try { sessionStorage.setItem('obz-orders-search', orderNumber); } catch { /* ignore */ } goView('orders'); };
  const openCustomer = (c) => { try { sessionStorage.setItem('obz-customer', JSON.stringify(c)); } catch { /* ignore */ } goView('customer'); };

  // ════ Quick replies ("/") ════════════════════════════════════════════════
  const cannedBrand = activeConv?.brand_id || brandId || '';
  useEffect(() => {
    if (!activeId) return undefined;
    let alive = true;
    adminApi.get(`${W}/canned-responses`, { params: { brandId: cannedBrand || 'all' } })
      .then(({ data }) => { if (alive) setCanned(data?.success ? (data.cannedResponses || data.rows || []) : []); })
      .catch(() => { if (alive) setCanned([]); });
    return () => { alive = false; };
  }, [cannedBrand, activeId]);

  const slashMatches = useMemo(() => {
    if (!slash) return [];
    const qq = slash.query.toLowerCase();
    return canned
      .map((c) => {
        const sc = normShortcut(c.shortcut);
        const title = String(c.title || '').toLowerCase();
        const rank = !qq ? 1 : sc.startsWith(qq) ? 0 : sc.includes(qq) || title.includes(qq) ? 1 : -1;
        return { c, rank };
      })
      .filter((x) => x.rank >= 0)
      .sort((a, b) => a.rank - b.rank || (Number(b.c.uses) || 0) - (Number(a.c.uses) || 0))
      .slice(0, 8)
      .map((x) => x.c);
  }, [slash, canned]);
  useEffect(() => { setSlashIdx(0); }, [slash?.query]);

  const topCanned = useMemo(() => [...canned].sort((a, b) => (Number(b.uses) || 0) - (Number(a.uses) || 0)).slice(0, 3), [canned]);

  const detectSlash = (value, caret) => {
    const before = value.slice(0, caret);
    const m = before.match(/(^|\s)\/([^\s/]*)$/);
    if (!m) { setSlash(null); return; }
    setSlash({ start: caret - m[2].length - 1, end: caret, query: m[2] });
  };

  const insertCanned = (c) => {
    const filled = fillPlaceholders(c.body || '');
    const el = replyRef.current;
    let next; let caret;
    if (slash) {
      next = reply.slice(0, slash.start) + filled + reply.slice(slash.end);
      caret = slash.start + filled.length;
    } else {
      const pos = el ? el.selectionStart : reply.length;
      const pre = reply.slice(0, pos);
      const sep = pre && !/\s$/.test(pre) ? ' ' : '';
      next = pre + sep + filled + reply.slice(pos);
      caret = pre.length + sep.length + filled.length;
    }
    setReply(next);
    setSlash(null);
    setShowEmoji(false);
    requestAnimationFrame(() => { if (el) { el.focus(); try { el.setSelectionRange(caret, caret); } catch { /* ignore */ } } });
    setCanned((prev) => prev.map((x) => (x.id === c.id ? { ...x, uses: (Number(x.uses) || 0) + 1 } : x)));
    adminApi.post(`${W}/canned-responses/${c.id}/used`).catch(() => {});
  };

  const insertAtCaret = (text) => {
    const el = replyRef.current;
    const pos = el ? el.selectionStart : reply.length;
    const next = reply.slice(0, pos) + text + reply.slice(pos);
    setReply(next);
    requestAnimationFrame(() => { if (el) { el.focus(); try { el.setSelectionRange(pos + text.length, pos + text.length); } catch { /* ignore */ } } });
  };

  // Auto-grow the composer (one line → up to ~6 lines).
  useEffect(() => {
    const el = replyRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [reply]);

  const onComposerKey = (e) => {
    if (slash && slashMatches.length) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSlashIdx((i) => (i + 1) % slashMatches.length); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSlashIdx((i) => (i - 1 + slashMatches.length) % slashMatches.length); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertCanned(slashMatches[Math.min(slashIdx, slashMatches.length - 1)]); return; }
    }
    if (e.key === 'Escape' && (slash || showEmoji)) { e.preventDefault(); setSlash(null); setShowEmoji(false); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent?.isComposing) { e.preventDefault(); sendReply(); }
  };

  // ════ Templates (window closed) ══════════════════════════════════════════
  const loadTemplateOptions = async (id) => {
    setTplState('loading');
    try {
      const { data } = await adminApi.get(`${W}/conversations/${id}/template-options`);
      if (activeRef.current?.id !== id) return;
      if (data && data.success === false) throw new Error(data.message);
      setTplOptions(data?.templates || data?.options || data?.rows || []);
      setTplState('ready');
    } catch (e) {
      if (activeRef.current?.id !== id) return;
      setTplOptions([]);
      setTplState('error');
    }
  };
  useEffect(() => {
    setTplPick(null); setTplValues([]);
    if (showTemplatePicker && activeId) loadTemplateOptions(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showTemplatePicker, activeId]);

  const pickTemplate = (t) => {
    setTplPick(t);
    setTplValues((t.params || []).map((p) => (p && p.value != null ? String(p.value) : '')));
  };
  const tplPreview = (t, values) => String(t?.body || '').replace(/\{\{(\d+)\}\}/g, (all, n) => values[Number(n) - 1] || all);

  const sendTemplate = async () => {
    if (!tplPick || !activeConv) return;
    if (tplValues.some((v) => !String(v).trim())) { showError('fieldRequired', 'Fill in every blank before sending.'); return; }
    const convId = activeConv.id;
    setTplSending(true);
    try {
      const body = { templateName: tplPick.name };
      if ((tplPick.params || []).length) body.params = tplValues.map((v) => String(v).trim());
      const { data } = await adminApi.post(`${W}/conversations/${convId}/template`, body);
      if (!data?.success) throw new Error(data?.message || 'Could not send the template');
      showSuccess('messageSent', 'Template sent. You can type again once they reply.');
      if (data.message && openReqRef.current === convId) { nearBottomRef.current = true; setMessages((prev) => mergeMessages(prev, [data.message])); }
      setTplPick(null); setTplValues([]);
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, last_message_at: new Date().toISOString(), waiting_since: null } : c)));
    } catch (e) { showError('sendFailed', errMsg(e, 'Could not send the template')); }
    setTplSending(false);
  };

  // ════ Products ═══════════════════════════════════════════════════════════
  const brandSlug = (bid) => {
    const b = brands.find((x) => x.id === bid);
    return b?.slug || (b?.name ? String(b.name).toLowerCase().replace(/\s+/g, '-') : '');
  };
  useEffect(() => {
    if (!productModal) return undefined;
    let alive = true;
    const t = setTimeout(async () => {
      setProductState('loading');
      try {
        const { productService } = await import('../../services');
        const data = await productService.getAllProducts(1, 20, productSearch, null, false, brandSlug(productBrand));
        if (!alive) return;
        setProductList(data?.products || data?.rows || []);
        setProductState('ready');
      } catch {
        if (!alive) return;
        setProductList([]);
        setProductState('error');
      }
    }, 300);
    return () => { alive = false; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productModal, productSearch, productBrand]);

  const openProducts = () => {
    setProductBrand(activeConv?.brand_id || brandId || brands[0]?.id || 1);
    setSelectedProducts([]);
    setProductSearch('');
    setProductList([]);
    setProductModal(true);
  };
  const toggleProduct = (p) => setSelectedProducts((prev) => (prev.find((x) => x.id === p.id) ? prev.filter((x) => x.id !== p.id) : [...prev, p]));
  const sendProducts = async () => {
    if (!selectedProducts.length || !activeConv) return;
    if (selectedProducts.length > 30) { showError('sendFailed', 'You can send up to 30 products at once.'); return; }
    setSendingProduct(true);
    const conv = activeConv;
    try {
      const { data } = await adminApi.post(`${W}/conversations/${conv.id}/send-product-link`, {
        productIds: selectedProducts.map((p) => p.id),
        brandId: productBrand || conv.brand_id || brandId || 1,
      });
      if (data && data.success === false) throw new Error(data.message);
      showSuccess('messageSent', selectedProducts.length > 1 ? `${data?.sent || selectedProducts.length} products sent` : 'Product sent');
      setProductModal(false);
      refreshActiveMessages(conv.id);
    } catch (e) { showError('sendFailed', errMsg(e, 'Could not send the products')); }
    setSendingProduct(false);
  };

  // ════ Render ═════════════════════════════════════════════════════════════
  const countFor = (key) => {
    if (!counts) return null;
    const v = counts[key];
    return v == null ? null : Number(v);
  };
  const emptyText = qDeb
    ? `No chats match “${qDeb}”.`
    : filter === 'unread' ? 'No unread chats. Nice work.'
      : filter === 'waiting' ? 'Nobody is waiting for a reply.'
        : filter === 'window_closed' ? 'No chats with a closed reply window.'
          : filter === 'has_order' ? 'No chats from customers with an order.'
            : status === 'resolved' ? 'No resolved chats yet.' : 'No chats yet. New WhatsApp messages will show up here.';

  const productBusy = productState === 'loading' || productState === 'idle';
  // Opened by id (deep link) and the chat's details haven't arrived yet.
  const convPending = !!activeConv && msgLoading && !activeConv.customer_phone && !activeConv.customer_name;
  const activeName = activeConv ? (activeConv.customer_name || phoneLabel(activeConv.customer_phone) || 'Customer') : '';
  const winLeft = win?.known && windowOpen && win.closesAt ? windowLeftLabel(win.closesAt, now) : null;
  const winTone = !windowOpen ? 'warn' : winLeft && new Date(win.closesAt).getTime() - now < 3 * 3600000 ? 'warn' : 'success';

  return (
    <div className={`wib${activeConv ? ' has-active' : ''}`}>
      {/* ─────────────── Chat list ─────────────── */}
      <section className="wib-list" aria-label="Chats">
        <div className="wib-list-top">
          <div className="wib-search">
            <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} aria-hidden="true" />
            <label htmlFor="wib-q" className="wib-sr">Search all chats</label>
            <input
              id="wib-q" type="search" value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone, message or order"
              autoComplete="off"
            />
            {q && (
              <button type="button" className="wib-search-clear" onClick={() => setQ('')} aria-label="Clear search">
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            )}
          </div>
          <div className="wib-chips" role="group" aria-label="Filter chats">
            {FILTERS.map((f) => {
              const n = countFor(f.key);
              return (
                <button key={f.key} type="button" className={`wib-chip${filter === f.key ? ' is-on' : ''}`}
                  aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label}{n != null ? <span className="wib-chip-n">{n.toLocaleString('en-IN')}</span> : null}
                </button>
              );
            })}
          </div>
          <div className="wib-list-sub">
            {convLoading && !conversations.length
              ? <Skeleton w={64} h={10} />
              : <span>{`${total.toLocaleString('en-IN')} chat${total === 1 ? '' : 's'}`}</span>}
            <label className="wib-status">
              <span className="wib-sr">Which chats</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          </div>
        </div>

        <div className="wib-list-scroll">
          {convLoading && !conversations.length ? (
            <SkeletonList rows={8} avatar className="wib-list-skel" label="Loading chats…" />
          ) : convError ? (
            <div className="wib-state wib-state--error" role="alert">
              <p>{convError}</p>
              <button type="button" className="wib-btn" onClick={() => fetchConversations()}>Try again</button>
            </div>
          ) : conversations.length === 0 ? (
            <div className="wib-state"><p>{emptyText}</p></div>
          ) : (
            <ul className={`wib-rows${convLoading ? ' is-stale' : ''}`} aria-busy={convLoading || undefined}>
              {conversations.map((c) => {
                const name = c.customer_name || phoneLabel(c.customer_phone) || 'Customer';
                const on = activeId === c.id;
                const wait = c.status !== 'resolved' ? waitingBadge(c.waiting_since, now) : null;
                const stage = c.latest_order ? stageInfo(c.latest_order.stage, c.latest_order.stage_label) : null;
                const closed = c.window_open === false && c.status !== 'resolved';
                return (
                  <li key={c.id}>
                    <button type="button" className={`wib-row${on ? ' is-on' : ''}${c.unread_count > 0 ? ' is-unread' : ''}`}
                      onClick={() => openChat(c)} onMouseEnter={() => prefetch(c)} onFocus={() => prefetch(c)}
                      aria-current={on ? 'true' : undefined}>
                      <span className="wib-av" aria-hidden="true">{initials(c.customer_name || c.customer_phone)}</span>
                      <span className="wib-row-main">
                        <span className="wib-row-line">
                          <b className="wib-row-name">{name}</b>
                          <span className="wib-row-time">{listTime(c.last_message_at, now)}</span>
                        </span>
                        <span className="wib-row-line">
                          <span className="wib-row-preview">{c.last_message || 'No messages yet'}</span>
                          {c.unread_count > 0 && <span className="wib-unread" aria-label={`${c.unread_count} unread`}>{c.unread_count}</span>}
                        </span>
                        {(wait || stage || closed || (!brandId && c.brand_id)) && (
                          <span className="wib-row-tags">
                            {wait && <Pill tone={wait.tone}>{wait.text}</Pill>}
                            {stage && <Pill tone={stage.tone} title={c.latest_order.order_number}>{stage.label}</Pill>}
                            {closed && <Pill tone="muted">Window closed</Pill>}
                            {!brandId && c.brand_id ? <span className="wib-brand-tag">{brandName(c.brand_id)}</span> : null}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {loadingMore ? (
            <SkeletonList rows={3} avatar className="wib-list-skel" label="Loading more chats…" />
          ) : !convLoading && !convError && conversations.length > 0 && conversations.length < total && (
            <div className="wib-more">
              <button type="button" className="wib-btn" onClick={loadMore}>Load more chats</button>
            </div>
          )}
        </div>
      </section>

      {/* ─────────────── Conversation ─────────────── */}
      <section className="wib-chat" aria-label="Conversation">
        {!activeConv ? (
          <div className="wib-chat-empty">
            <HugeiconsIcon icon={WhatsappIcon} size={40} strokeWidth={1.6} aria-hidden="true" />
            <h2>Pick a chat</h2>
            <p>Choose a conversation on the left to read and reply.</p>
          </div>
        ) : (
          <>
            <header className="wib-chat-hd">
              <button type="button" className="wib-icon-btn wib-back" onClick={closeChat} aria-label="Back to chats">
                <HugeiconsIcon icon={ArrowLeft01Icon} size={18} strokeWidth={2.2} aria-hidden="true" />
              </button>
              {convPending ? (
                // Opened from a link before we know who it is — placeholder name.
                <div className="wib-chat-title" aria-hidden="true">
                  <Skeleton w={140} h={14} />
                  <Skeleton w={110} h={10} />
                </div>
              ) : (
                <div className="wib-chat-title">
                  <b>{activeName}</b>
                  <span>
                    {[phoneLabel(activeConv.customer_phone), brandName(activeConv.brand_id)].filter(Boolean).join(' · ')}
                  </span>
                </div>
              )}
              {win?.known && !isResolved && (
                <Pill tone={winTone}>{windowOpen ? (winLeft ? `Reply window · ${winLeft}` : 'Reply window open') : 'Window closed'}</Pill>
              )}
              {isResolved && <Pill tone="success">Resolved</Pill>}
              <button type="button" className="wib-icon-btn wib-info-btn" onClick={() => setShowInfo(true)} aria-label="Customer and order details">
                <HugeiconsIcon icon={InformationCircleIcon} size={18} strokeWidth={2} aria-hidden="true" />
              </button>
              {isResolved ? (
                <button type="button" className="wib-btn" onClick={() => setConvStatus(activeConv.id, 'open')}>
                  <HugeiconsIcon icon={RefreshIcon} size={15} strokeWidth={2} aria-hidden="true" /> Re-open
                </button>
              ) : (
                <button type="button" className="wib-btn" onClick={() => setConvStatus(activeConv.id, 'resolved')}>
                  <HugeiconsIcon icon={Tick02Icon} size={15} strokeWidth={2} aria-hidden="true" /> Mark resolved
                </button>
              )}
            </header>

            <div className="wib-msgs" ref={messagesBoxRef} onScroll={onMessagesScroll}>
              {!msgLoading && hasMoreMsgs && (loadingOlder ? (
                <ThreadSkeleton rows={SKEL_OLDER} day={false} label="Loading older messages…" />
              ) : (
                <div className="wib-older">
                  <button type="button" className="wib-btn wib-btn--sm" onClick={loadOlder}>Load older messages</button>
                </div>
              ))}
              {msgLoading ? <ThreadSkeleton />
                : msgError ? (
                  <div className="wib-state wib-state--error" role="alert">
                    <p>{msgError}</p>
                    <button type="button" className="wib-btn" onClick={() => openChat(activeConv)}>Try again</button>
                  </div>
                )
                  : messages.length === 0 ? <div className="wib-state"><p>No messages in this chat yet.</p></div>
                    : (() => {
                      const items = [];
                      let lastDay = null;
                      messages.forEach((m) => {
                        const d = new Date(m.sent_at || m.createdAt || Date.now());
                        const day = dayLabel(d, now);
                        if (day !== lastDay) { lastDay = day; items.push(<div key={`d-${day}-${m.id}`} className="wib-day"><span>{day}</span></div>); }
                        const out = m.direction === 'outbound';
                        items.push(
                          <div key={m.id} className={`wib-msg ${out ? 'is-out' : 'is-in'}`}>
                            <div className="wib-bubble">
                              {m._quotedMsg && (
                                <div className="wib-quote">
                                  <b>{m._quotedMsg.direction === 'inbound' ? activeName : 'You'}</b>
                                  <span>{msgPreview(m._quotedMsg)}</span>
                                </div>
                              )}
                              <MsgContent msg={m} brandId={activeConv.brand_id || brandId} />
                              <div className="wib-meta">
                                {msgTime(m.sent_at || m.createdAt)}
                                {out && (
                                  m.status === 'sending' ? <HugeiconsIcon icon={Clock01Icon} size={11} strokeWidth={2} aria-label="Sending" />
                                    : m.status === 'failed' ? (
                                      <button type="button" className="wib-retry" onClick={() => retryReply(m)} title="Not sent — tap to send again">
                                        Not sent · Retry
                                      </button>
                                    )
                                      : <span className={`wib-ticks${m.status === 'read' ? ' is-read' : ''}`} aria-label={m.status || 'sent'}>
                                        {m.status === 'read' || m.status === 'delivered' ? '✓✓' : '✓'}
                                      </span>
                                )}
                              </div>
                            </div>
                            <button type="button" className="wib-reply-to" onClick={() => { setReplyTo(m); replyRef.current?.focus(); }} aria-label="Reply to this message">
                              <HugeiconsIcon icon={ArrowTurnBackwardIcon} size={13} strokeWidth={2.4} aria-hidden="true" />
                            </button>
                          </div>,
                        );
                      });
                      return items;
                    })()}
            </div>

            {/* Footer: resolved bar, template picker, or the composer */}
            {isResolved ? (
              <div className="wib-resolved">
                This chat is resolved.
                <button type="button" className="wib-btn wib-btn--sm" onClick={() => setConvStatus(activeConv.id, 'open')}>Re-open</button>
              </div>
            ) : showTemplatePicker ? (
              <div className="wib-tpl">
                <p className="wib-tpl-note">
                  <b>Reply window closed.</b>{' '}
                  {win.lastInboundAt ? `${activeName} last wrote ${whenLabel(win.lastInboundAt, now)}. ` : `${activeName} hasn't written to us yet. `}
                  WhatsApp only delivers typed messages within 24 hours of the customer&rsquo;s last message, so send an approved template instead — when they reply, the window opens again.
                </p>
                {tplState === 'loading' || tplState === 'idle' ? (
                  <div className="wib-tpl-grid" role="status" aria-busy="true">
                    <span className="ds-sr-only">Loading templates…</span>
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="wib-tpl-sk" h={44} r={10} />)}
                  </div>
                )
                  : tplState === 'error' ? (
                    <div className="wib-tpl-msg">
                      Couldn&rsquo;t load the templates. <button type="button" className="wib-link" onClick={() => loadTemplateOptions(activeConv.id)}>Try again</button>
                    </div>
                  )
                    : tplOptions.length === 0 ? (
                      <div className="wib-tpl-msg">
                        No approved templates can be sent to this chat yet.{' '}
                        {goTo && <button type="button" className="wib-link" onClick={() => goTo('templates')}>Open Templates</button>}
                      </div>
                    ) : (
                      <>
                        <div className="wib-tpl-grid" role="group" aria-label="Templates you can send">
                          {tplOptions.map((t) => (
                            <button key={t.name} type="button" className={`wib-tpl-opt${tplPick?.name === t.name ? ' is-on' : ''}`}
                              aria-pressed={tplPick?.name === t.name} onClick={() => pickTemplate(t)}>
                              {t.title || t.name.replace(/_/g, ' ')}
                            </button>
                          ))}
                        </div>
                        {tplPick && (
                          <div className="wib-tpl-pick">
                            <div className="wib-tpl-preview"><FormattedText text={tplPreview(tplPick, tplValues)} /></div>
                            {(tplPick.params || []).length > 0 && (
                              <div className="wib-tpl-fields">
                                {tplPick.params.map((p, i) => (
                                  <label key={i} className="wib-field">
                                    <span>{p.label || `Blank ${i + 1}`}</span>
                                    <input value={tplValues[i] ?? ''} onChange={(e) => setTplValues((v) => { const n = [...v]; n[i] = e.target.value; return n; })} />
                                  </label>
                                ))}
                              </div>
                            )}
                            <div className="wib-tpl-actions">
                              <button type="button" className="wib-btn" onClick={() => { setTplPick(null); setTplValues([]); }} disabled={tplSending}>Cancel</button>
                              <button type="button" className="wib-btn wib-btn--primary" onClick={sendTemplate} disabled={tplSending}>
                                {tplSending ? 'Sending…' : 'Send template'}
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
              </div>
            ) : (
              <div className="wib-composer">
                {topCanned.length > 0 && (
                  <div className="wib-qr-row">
                    <span className="wib-qr-label">Quick replies:</span>
                    {topCanned.map((c) => (
                      <button key={c.id} type="button" className="wib-qr-chip" onClick={() => insertCanned(c)} title={c.title || ''}>
                        /{normShortcut(c.shortcut)}
                      </button>
                    ))}
                  </div>
                )}
                <div className="wib-compose-box">
                  {replyTo && (
                    <div className="wib-replying">
                      <div>
                        <b>Replying to {replyTo.direction === 'inbound' ? activeName : 'your message'}</b>
                        <span>{msgPreview(replyTo)}</span>
                      </div>
                      <button type="button" className="wib-icon-btn" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
                        <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={2} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                  {slash && (
                    <div className="wib-pop wib-slash" role="listbox" aria-label="Quick replies">
                      <div className="wib-pop-head">
                        <HugeiconsIcon icon={FlashIcon} size={13} strokeWidth={2} aria-hidden="true" /> Quick replies
                        <span>↑↓ to pick · Enter to insert · Esc to close</span>
                      </div>
                      {slashMatches.length === 0 ? (
                        <div className="wib-pop-empty">
                          {canned.length === 0 ? 'No quick replies yet.' : `No quick reply matches “/${slash.query}”.`}
                          {goTo && <> <button type="button" className="wib-link" onMouseDown={(e) => e.preventDefault()} onClick={() => goTo('quick-replies')}>Manage quick replies</button></>}
                        </div>
                      ) : slashMatches.map((c, i) => (
                        <button key={c.id} type="button" role="option" aria-selected={i === slashIdx}
                          className={`wib-slash-item${i === slashIdx ? ' is-on' : ''}`}
                          onMouseDown={(e) => e.preventDefault()} onMouseEnter={() => setSlashIdx(i)} onClick={() => insertCanned(c)}>
                          <span className="wib-slash-key">/{normShortcut(c.shortcut)}</span>
                          <span className="wib-slash-title">{c.title || ''}</span>
                          <span className="wib-slash-body">{c.body}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {showEmoji && (
                    <div className="wib-pop wib-emoji" role="dialog" aria-label="Emoji">
                      {QUICK_EMOJIS.map((em) => (
                        <button key={em} type="button" onClick={() => insertAtCaret(em)} aria-label={`Insert ${em}`}>{em}</button>
                      ))}
                    </div>
                  )}
                  <form className="wib-compose" onSubmit={(e) => { e.preventDefault(); sendReply(); }}>
                    <input ref={fileInputRef} type="file" hidden
                      accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) sendMediaFile(f); e.target.value = ''; }} />
                    <label htmlFor="wib-reply" className="wib-sr">Reply</label>
                    <textarea
                      id="wib-reply" ref={replyRef} rows={1} value={reply}
                      placeholder="Type a message, or / for quick replies"
                      onChange={(e) => { setReply(e.target.value); detectSlash(e.target.value, e.target.selectionStart); }}
                      onKeyDown={onComposerKey}
                      onKeyUp={(e) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) detectSlash(e.currentTarget.value, e.currentTarget.selectionStart); }}
                      onClick={(e) => detectSlash(e.currentTarget.value, e.currentTarget.selectionStart)}
                      onBlur={() => setTimeout(() => setSlash(null), 150)}
                    />
                    <div className="wib-compose-tools">
                      <button type="button" className={`wib-icon-btn${showEmoji ? ' is-on' : ''}`} onClick={() => setShowEmoji((s) => !s)} aria-label="Emoji" aria-expanded={showEmoji}>
                        <HugeiconsIcon icon={SmileIcon} size={18} strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button type="button" className="wib-icon-btn" onClick={openProducts} aria-label="Send products" title="Send products">
                        <HugeiconsIcon icon={ShoppingBag01Icon} size={18} strokeWidth={2} aria-hidden="true" />
                      </button>
                      <button type="button" className="wib-icon-btn" onClick={() => fileInputRef.current?.click()} disabled={uploadingMedia}
                        aria-label="Attach a photo, video or document" title="Attach a photo, video or document">
                        {uploadingMedia ? <span className="wib-spin" aria-hidden="true" /> : <HugeiconsIcon icon={Attachment01Icon} size={18} strokeWidth={2} aria-hidden="true" />}
                      </button>
                      <button type="submit" className="wib-send" disabled={!reply.trim()}>
                        <HugeiconsIcon icon={SentIcon} size={16} strokeWidth={2} aria-hidden="true" /> <span>Send</span>
                      </button>
                    </div>
                  </form>
                  {unfilled.length > 0 && (
                    <div className="wib-unfilled" role="status">
                      We don&rsquo;t know {unfilled.join(', ')} for this customer — replace {unfilled.length === 1 ? 'it' : 'them'} before sending.
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* ─────────────── Customer & order ─────────────── */}
      {activeConv && showInfo && <div className="wib-side-backdrop" onClick={() => setShowInfo(false)} aria-hidden="true" />}
      {activeConv && (
        <aside className={`wib-side${showInfo ? ' is-open' : ''}`} aria-label="Customer and order">
          <div className="wib-side-close">
            <b>Customer and order</b>
            <button type="button" className="wib-icon-btn" onClick={() => setShowInfo(false)} aria-label="Close details">
              <HugeiconsIcon icon={Cancel01Icon} size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {/* Latest order */}
          {ctxState === 'loading' || ctxState === 'idle' ? (
            <section className="wib-card">
              <span className="wib-eyebrow">Latest order</span>
              <SkeletonText lines={4} label="Loading orders…" />
            </section>
          ) : ctxState === 'error' ? (
            <section className="wib-card wib-state--error" role="alert">
              <p className="wib-muted">Couldn&rsquo;t load this customer&rsquo;s orders.</p>
              <button type="button" className="wib-btn wib-btn--sm" onClick={() => loadCtx(activeConv.id)}>Try again</button>
            </section>
          ) : !latestOrder ? (
            <section className="wib-card">
              <span className="wib-eyebrow">Latest order</span>
              <p className="wib-muted">No orders with this phone number.</p>
            </section>
          ) : (() => {
            const o = latestOrder;
            const st = stageInfo(o.stage, o.stageLabel) || { label: o.status, tone: 'muted' };
            return (
              <section className={`wib-card wib-order wib-order--${st.tone}`}>
                <div className="wib-card-hd">
                  <span className="wib-eyebrow">Latest order</span>
                  <Pill tone={st.tone}>{st.label}</Pill>
                </div>
                <div className="wib-order-main">
                  <b className="wib-mono">{o.orderNumber}</b>
                  <span>{rupees(o.total)} · {o.paymentType}{o.brand ? ` · ${o.brand}` : ''}</span>
                  {o.items?.length > 0 && (
                    <span className="wib-muted">{o.items.slice(0, 3).join(', ')}{o.items.length > 3 ? ` +${o.items.length - 3} more` : ''}</span>
                  )}
                  {o.awb && <span className="wib-muted">AWB <span className="wib-mono">{o.awb}</span>{o.courier ? ` · ${o.courier}` : ''}</span>}
                </div>
                {chatCtx.address && (
                  <div className="wib-address">
                    {chatCtx.address.text}
                    {chatCtx.address.deliveredHere > 0 && (
                      <span className="wib-address-note">{chatCtx.address.deliveredHere} order{chatCtx.address.deliveredHere === 1 ? '' : 's'} delivered here before</span>
                    )}
                  </div>
                )}
                {canOrders && (
                  <div className="wib-order-actions">
                    {o.stage === 'to_confirm' && (
                      <button type="button" className="wib-btn wib-btn--primary" disabled={confirmingOrder === o.id} onClick={() => confirmOrder(o)}>
                        {confirmingOrder === o.id ? 'Confirming…' : 'Confirm order'}
                      </button>
                    )}
                    <button type="button" className="wib-btn" onClick={() => openInOrders(o.orderNumber)}>Open in Orders</button>
                    {o.awb && (
                      <a className="wib-btn" href={`${API_BASE}/api/track/${encodeURIComponent(o.orderNumber)}`} target="_blank" rel="noopener noreferrer">Track parcel</a>
                    )}
                  </div>
                )}
                {chatCtx.orders.length > 1 && (
                  <div className="wib-older-orders">
                    <span className="wib-eyebrow">Earlier orders</span>
                    {chatCtx.orders.slice(1).map((x) => (
                      <button key={x.id} type="button" className="wib-older-order" disabled={!canOrders} onClick={() => openInOrders(x.orderNumber)}>
                        <span className="wib-mono">{x.orderNumber}</span>
                        <span className="wib-muted">{rupees(x.total)} · {x.stageLabel}</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })()}

          {/* Customer */}
          <section className="wib-card">
            <div className="wib-card-hd">
              <b>Customer</b>
              {chatCtx?.customer && canCustomer && (
                <button type="button" className="wib-link" onClick={() => openCustomer(chatCtx.customer)}>Full customer profile →</button>
              )}
            </div>
            {!chatCtx?.stats && (ctxState === 'loading' || ctxState === 'idle') && <Skeleton w="80%" h={11} />}
            {chatCtx?.stats && (
              <span className="wib-history">
                {chatCtx.stats.orders} order{chatCtx.stats.orders === 1 ? '' : 's'} · {chatCtx.stats.delivered} delivered · {rupees(chatCtx.stats.spent)} spent
                {chatCtx.stats.rto ? ` · ${chatCtx.stats.rto} returned` : ''}
              </span>
            )}
            <dl className="wib-dl">
              <div><dt>Name</dt><dd>{convPending ? <Skeleton w={110} h={11} /> : activeConv.customer_name || '—'}</dd></div>
              <div><dt>Phone</dt><dd>{convPending ? <Skeleton w={96} h={11} /> : phoneLabel(activeConv.customer_phone) || '—'}</dd></div>
              <div>
                <dt><label htmlFor="wib-store">Store</label></dt>
                <dd>
                  <select id="wib-store" value={activeConv.brand_id || ''} onChange={(e) => changeConvBrand(activeConv.id, e.target.value)}>
                    {!activeConv.brand_id && <option value="">Choose a store…</option>}
                    {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </dd>
              </div>
              <div><dt>Messages</dt><dd>{activeConv.opted_out ? <Pill tone="danger">Opted out (replied STOP)</Pill> : 'Allowed'}</dd></div>
            </dl>
            <label htmlFor="wib-note" className="wib-note-label">Note for the team <span>(customer can&rsquo;t see this)</span></label>
            <textarea id="wib-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} disabled={savingNote}
              placeholder="e.g. Prefers delivery after 6 pm" />
            {(note.trim() !== String(activeConv.agent_notes || '').trim()) && (
              <div className="wib-note-actions">
                <button type="button" className="wib-btn wib-btn--sm" onClick={() => setNote(activeConv.agent_notes || '')} disabled={savingNote}>Undo</button>
                <button type="button" className="wib-btn wib-btn--sm wib-btn--primary" onClick={saveNote} disabled={savingNote}>{savingNote ? 'Saving…' : 'Save note'}</button>
              </div>
            )}
          </section>
        </aside>
      )}

      {/* ─────────────── Send products ─────────────── */}
      <Modal isOpen={productModal} onClose={() => setProductModal(false)} title="Send products" closeOnOverlayClick={false}>
        <div className="modal-body wib-products">
          <p className="wib-muted">Pick one or more products. Each is sent as a photo with its name, price and a link to buy.</p>
          {brands.length > 0 && (
            <label className="wib-field">
              <span>Store</span>
              <select value={productBrand || ''} onChange={(e) => { setProductBrand(Number(e.target.value)); setSelectedProducts([]); }}>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          )}
          <label className="wib-field">
            <span>Search</span>
            <input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Product name" />
          </label>
          <div className={`wib-product-list${productBusy && productList.length ? ' is-stale' : ''}`} aria-busy={productBusy || undefined}>
            {productBusy && !productList.length ? <SkeletonList rows={5} meta={false} className="wib-product-sk" label="Loading products…" />
              : productState === 'error' ? <div className="wib-state wib-state--error"><p>Couldn&rsquo;t load products.</p></div>
                : productList.length === 0 ? <div className="wib-state"><p>No products found.</p></div>
                  : productList.map((p) => {
                    const on = !!selectedProducts.find((x) => x.id === p.id);
                    const price = p.ProductVariations?.[0]?.price || p.price;
                    return (
                      <button key={p.id} type="button" className={`wib-product${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => toggleProduct(p)}>
                        <span className="wib-check" aria-hidden="true">{on && <HugeiconsIcon icon={Tick02Icon} size={11} strokeWidth={3} />}</span>
                        <span className="wib-product-text">
                          <span className="wib-product-name">{p.name}</span>
                          <span className="wib-muted">{price != null ? rupees(price) : '—'}</span>
                        </span>
                      </button>
                    );
                  })}
          </div>
          {selectedProducts.length > 0 && <p className="wib-muted">{selectedProducts.length} selected</p>}
        </div>
        <div className="modal-footer">
          <button type="button" className="wib-btn" onClick={() => setProductModal(false)}>Cancel</button>
          <button type="button" className="wib-btn wib-btn--primary" disabled={!selectedProducts.length || sendingProduct} onClick={sendProducts}>
            {sendingProduct ? 'Sending…' : selectedProducts.length > 1 ? `Send ${selectedProducts.length} products` : 'Send product'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
