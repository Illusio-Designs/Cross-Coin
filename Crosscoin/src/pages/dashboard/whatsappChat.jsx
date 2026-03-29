import { useState, useEffect, useRef } from 'react';
import Loader from '../../components/common/Loader';
import { showSuccess, showError } from '../../utils/toastNotification';

const IC = {
  wa:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/></svg>,
  send:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  refresh: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>,
  user:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
};

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

function timeAgo(date) {
  if (!date) return '';
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function WhatsAppChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('open');
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const fetchConversations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/whatsapp/conversations?status=${statusFilter}&brandId=1`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setConversations(data.conversations || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const fetchMessages = async (conv) => {
    setActiveConv(conv);
    setMsgLoading(true);
    try {
      const res = await fetch(`${API}/api/whatsapp/conversations/${conv.id}/messages`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
        // Update unread count in list
        setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
      }
    } catch { /* silent */ }
    setMsgLoading(false);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim() || !activeConv) return;
    setSending(true);
    try {
      const res = await fetch(`${API}/api/whatsapp/conversations/${activeConv.id}/reply`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply.trim(), brandId: 1 })
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => [...prev, data.message]);
        setReply('');
        setConversations(prev => prev.map(c => c.id === activeConv.id ? { ...c, last_message: reply.trim(), last_message_at: new Date() } : c));
      } else {
        showError('sendFailed', data.message);
      }
    } catch (e) { showError('sendFailed', e.message); }
    setSending(false);
  };

  const resolveConv = async (id) => {
    try {
      await fetch(`${API}/api/whatsapp/conversations/${id}/resolve`, { method: 'PUT', credentials: 'include' });
      showSuccess('resolved');
      setConversations(prev => prev.filter(c => c.id !== id));
      if (activeConv?.id === id) { setActiveConv(null); setMessages([]); }
    } catch { showError('updateFailed'); }
  };

  // Scroll to bottom on new messages
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => { fetchConversations(); }, [statusFilter]);

  // Poll for new messages every 10s when a conversation is open
  useEffect(() => {
    if (!activeConv) return;
    pollRef.current = setInterval(() => fetchMessages(activeConv), 10000);
    return () => clearInterval(pollRef.current);
  }, [activeConv?.id]);

  return (
    <div className="dashboard-page">
      <div className="sl-page-header">
        <div className="sl-header-left">
          <div className="sl-header-icon">{IC.wa}</div>
          <div>
            <h1 className="sl-page-title">WhatsApp Inbox</h1>
            <p className="sl-page-sub">{conversations.length} conversation{conversations.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="sl-header-right">
          <div className="bset-category-tabs" style={{ marginBottom: 0 }}>
            {['open','resolved','all'].map(s => (
              <button key={s} className={`bset-cat-tab${statusFilter === s ? ' active' : ''}`} onClick={() => setStatusFilter(s)} style={{ textTransform: 'capitalize' }}>{s}</button>
            ))}
          </div>
          <button className="sl-add-btn" onClick={fetchConversations} disabled={loading}>
            <span className="sl-add-btn-icon">{IC.refresh}</span>Refresh
          </button>
        </div>
      </div>

      <div className="wac-layout">
        {/* Conversation list */}
        <div className="wac-sidebar">
          {loading ? <div className="sl-loader-wrap"><Loader /></div>
          : conversations.length === 0 ? (
            <div className="sl-empty" style={{ padding: '40px 20px' }}>
              <div className="sl-empty-icon">{IC.wa}</div>
              <p>No {statusFilter} conversations</p>
            </div>
          ) : conversations.map(conv => (
            <div
              key={conv.id}
              className={`wac-conv-item${activeConv?.id === conv.id ? ' active' : ''}`}
              onClick={() => fetchMessages(conv)}
            >
              <div className="wac-conv-avatar">
                {IC.user}
              </div>
              <div className="wac-conv-info">
                <div className="wac-conv-header">
                  <span className="wac-conv-name">{conv.customer_name || conv.customer_phone}</span>
                  <span className="wac-conv-time">{timeAgo(conv.last_message_at)}</span>
                </div>
                <div className="wac-conv-preview">
                  <span className="wac-conv-last">{conv.last_message || 'No messages yet'}</span>
                  {conv.unread_count > 0 && <span className="wac-unread-badge">{conv.unread_count}</span>}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chat window */}
        <div className="wac-chat">
          {!activeConv ? (
            <div className="wac-empty-chat">
              <div style={{ color: '#CE1E36', width: 48, height: 48, margin: '0 auto 12px' }}>{IC.wa}</div>
              <p style={{ color: '#6b7280', fontSize: 14 }}>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="wac-chat-header">
                <div className="wac-conv-avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{IC.user}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#180D3E' }}>{activeConv.customer_name || activeConv.customer_phone}</div>
                  <div style={{ fontSize: 12, color: '#9ca3af' }}>+{activeConv.customer_phone}</div>
                </div>
                {activeConv.status === 'open' && (
                  <button className="sl-btn-edit" title="Mark resolved" onClick={() => resolveConv(activeConv.id)} style={{ gap: 4, fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
                    {IC.check} Resolve
                  </button>
                )}
              </div>

              {/* Messages */}
              <div className="wac-messages">
                {msgLoading ? <div style={{ textAlign: 'center', padding: 20 }}><Loader /></div>
                : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: 13, padding: 20 }}>No messages yet</div>
                ) : messages.map(msg => (
                  <div key={msg.id} className={`wac-msg wac-msg-${msg.direction}`}>
                    <div className="wac-msg-bubble">{msg.body}</div>
                    <div className="wac-msg-meta">
                      {formatTime(msg.sent_at || msg.createdAt)}
                      {msg.direction === 'outbound' && (
                        <span className={`wac-msg-status wac-status-${msg.status}`}>
                          {msg.status === 'read' ? ' ✓✓' : msg.status === 'delivered' ? ' ✓✓' : ' ✓'}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              {activeConv.status === 'open' ? (
                <form className="wac-reply-box" onSubmit={sendReply}>
                  <textarea
                    className="wac-reply-input"
                    placeholder="Type a message..."
                    value={reply}
                    onChange={e => setReply(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(e); } }}
                    rows={2}
                  />
                  <button type="submit" className="wac-send-btn" disabled={sending || !reply.trim()}>
                    <span style={{ width: 18, height: 18, display: 'flex' }}>{IC.send}</span>
                  </button>
                </form>
              ) : (
                <div style={{ padding: '12px 16px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', fontSize: 13, color: '#9ca3af', textAlign: 'center' }}>
                  This conversation is resolved
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        .wac-layout { display:grid; grid-template-columns:320px 1fr; height:calc(100vh - 200px); border:1.5px solid #e5e7eb; border-radius:12px; overflow:hidden; background:#fff; }
        .wac-sidebar { border-right:1.5px solid #e5e7eb; overflow-y:auto; background:#fafafa; }
        .wac-conv-item { display:flex; align-items:center; gap:12px; padding:14px 16px; cursor:pointer; border-bottom:1px solid #f0f0f0; transition:background 0.15s; }
        .wac-conv-item:hover { background:#f5f5f7; }
        .wac-conv-item.active { background:#fff0f2; border-left:3px solid #CE1E36; }
        .wac-conv-avatar { width:40px; height:40px; border-radius:50%; background:#e5e7eb; display:flex; align-items:center; justify-content:center; color:#6b7280; flex-shrink:0; }
        .wac-conv-avatar svg { width:20px; height:20px; }
        .wac-conv-info { flex:1; min-width:0; }
        .wac-conv-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:3px; }
        .wac-conv-name { font-size:13px; font-weight:600; color:#180D3E; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .wac-conv-time { font-size:11px; color:#9ca3af; flex-shrink:0; margin-left:8px; }
        .wac-conv-preview { display:flex; align-items:center; justify-content:space-between; gap:6px; }
        .wac-conv-last { font-size:12px; color:#6b7280; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex:1; }
        .wac-unread-badge { background:#CE1E36; color:#fff; border-radius:50%; width:18px; height:18px; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .wac-chat { display:flex; flex-direction:column; overflow:hidden; }
        .wac-empty-chat { display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; }
        .wac-chat-header { display:flex; align-items:center; gap:12px; padding:12px 16px; border-bottom:1.5px solid #e5e7eb; background:#fff; flex-shrink:0; }
        .wac-messages { flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:8px; background:#f0f2f5; }
        .wac-msg { display:flex; flex-direction:column; max-width:70%; }
        .wac-msg-inbound { align-self:flex-start; }
        .wac-msg-outbound { align-self:flex-end; }
        .wac-msg-bubble { padding:9px 13px; border-radius:12px; font-size:13px; line-height:1.5; white-space:pre-wrap; word-break:break-word; }
        .wac-msg-inbound .wac-msg-bubble { background:#fff; color:#111827; border-radius:0 12px 12px 12px; box-shadow:0 1px 2px rgba(0,0,0,0.08); }
        .wac-msg-outbound .wac-msg-bubble { background:#CE1E36; color:#fff; border-radius:12px 0 12px 12px; }
        .wac-msg-meta { font-size:10px; color:#9ca3af; margin-top:3px; }
        .wac-msg-inbound .wac-msg-meta { text-align:left; padding-left:4px; }
        .wac-msg-outbound .wac-msg-meta { text-align:right; padding-right:4px; }
        .wac-msg-status { font-size:11px; }
        .wac-status-read { color:#34b7f1; }
        .wac-reply-box { display:flex; align-items:flex-end; gap:10px; padding:12px 16px; border-top:1.5px solid #e5e7eb; background:#fff; flex-shrink:0; }
        .wac-reply-input { flex:1; border:1.5px solid #e5e7eb; border-radius:20px; padding:10px 16px; font-size:13px; font-family:inherit; resize:none; outline:none; line-height:1.5; transition:border-color 0.15s; }
        .wac-reply-input:focus { border-color:#CE1E36; }
        .wac-send-btn { width:40px; height:40px; border-radius:50%; background:#CE1E36; border:none; cursor:pointer; display:flex; align-items:center; justify-content:center; color:#fff; flex-shrink:0; transition:background 0.15s; }
        .wac-send-btn:hover:not(:disabled) { background:#a8172b; }
        .wac-send-btn:disabled { opacity:0.5; cursor:not-allowed; }
        @media (max-width:768px) { .wac-layout { grid-template-columns:1fr; } .wac-sidebar { display:none; } }
      `}</style>
    </div>
  );
}
