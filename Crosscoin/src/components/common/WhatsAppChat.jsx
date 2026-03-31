import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

// ── WhatsApp Chat Widget ──────────────────────────────────────────────────────
export default function WhatsAppChat() {
  const [open, setOpen]       = useState(false);
  const [convId, setConvId]   = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput]     = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showGreet, setShowGreet] = useState(false);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  // Show greeting bubble after 3s
  useEffect(() => {
    const t = setTimeout(() => setShowGreet(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Poll for new messages when chat is open
  useEffect(() => {
    if (!open || !convId) return;
    pollRef.current = setInterval(() => fetchMessages(convId), 8000);
    return () => clearInterval(pollRef.current);
  }, [open, convId]);

  const fetchMessages = async (id) => {
    try {
      const res = await fetch(`${API}/api/whatsapp/conversations/${id}/messages`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setMessages(data.messages || []);
    } catch { /* silent */ }
  };

  const startOrOpenChat = async () => {
    setOpen(true);
    setShowGreet(false);
    if (convId) return;
    // Add a welcome message locally while we wait
    setMessages([{
      id: 'welcome',
      direction: 'inbound',
      body: '👋 Hi! Welcome to Cross Coin. How can we help you today?',
      sent_at: new Date().toISOString(),
    }]);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');

    // Optimistic UI
    const tempMsg = { id: 'temp_' + Date.now(), direction: 'outbound', body: text, sent_at: new Date().toISOString(), status: 'sending' };
    setMessages(prev => [...prev, tempMsg]);

    try {
      if (convId) {
        // Existing conversation — send reply
        const res = await fetch(`${API}/api/whatsapp/conversations/${convId}/reply`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, brandId: 1 }),
        });
        const data = await res.json();
        if (data.success) {
          setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...data.message, direction: 'outbound' } : m));
        }
      } else {
        // New conversation — use test endpoint to initiate
        const res = await fetch(`${API}/api/whatsapp/customer/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, brandId: 1 }),
        });
        const data = await res.json();
        if (data.success && data.conversationId) {
          setConvId(data.conversationId);
          await fetchMessages(data.conversationId);
        } else {
          // Fallback: show sent confirmation
          setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'sent' } : m));
        }
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === tempMsg.id ? { ...m, status: 'failed' } : m));
    }
    setSending(false);
  };

  return (
    <>
      {/* Greeting bubble */}
      {showGreet && !open && (
        <div className="wachat-greet" onClick={startOrOpenChat}>
          <span>👋 Hi! Need help? Chat with us</span>
          <button className="wachat-greet-close" onClick={e => { e.stopPropagation(); setShowGreet(false); }}>×</button>
        </div>
      )}

      {/* Chat window */}
      {open && (
        <div className="wachat-window">
          {/* Header */}
          <div className="wachat-header">
            <div className="wachat-header-avatar">
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z"/>
              </svg>
            </div>
            <div className="wachat-header-info">
              <div className="wachat-header-name">Cross Coin Support</div>
              <div className="wachat-header-status">
                <span className="wachat-online-dot" />Typically replies instantly
              </div>
            </div>
            <button className="wachat-close-btn" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="wachat-messages">
            {loading && <div className="wachat-loading">Loading…</div>}
            {messages.map((msg, i) => (
              <div key={msg.id || i} className={`wachat-msg wachat-msg--${msg.direction}`}>
                <div className="wachat-bubble">{msg.body}</div>
                <div className="wachat-meta">
                  {formatTime(msg.sent_at || msg.createdAt)}
                  {msg.direction === 'outbound' && (
                    <span className={`wachat-tick${msg.status === 'read' ? ' wachat-tick--read' : ''}`}>
                      {msg.status === 'sending' ? ' ○' : msg.status === 'failed' ? ' ✗' : ' ✓✓'}
                    </span>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form className="wachat-input-wrap" onSubmit={sendMessage}>
            <input
              className="wachat-input"
              placeholder="Type a message…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
              autoFocus
            />
            <button type="submit" className="wachat-send" disabled={sending || !input.trim()}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>

          <div className="wachat-footer">Powered by Cart Holder</div>
        </div>
      )}

      {/* FAB Button */}
      <button className={`wachat-fab${open ? ' wachat-fab--open' : ''}`} onClick={() => open ? setOpen(false) : startOrOpenChat()} aria-label="Chat on WhatsApp">
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="#fff">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        )}
      </button>
    </>
  );
}
