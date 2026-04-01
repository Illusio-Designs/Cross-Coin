import { useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

export default function WhatsAppChat() {
  const [open, setOpen]       = useState(false);
  const [showGreet, setShowGreet] = useState(true);
  const [phone, setPhone]     = useState('');
  const [message, setMessage] = useState('Hi, I need help with my order.');
  const [name, setName]       = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (phone.length < 10) { setError('Enter a valid 10-digit number'); return; }
    if (!message.trim())   { setError('Message cannot be empty'); return; }
    setSending(true); setError('');
    try {
      const res = await fetch(`${API}/api/whatsapp/customer/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, message, name, brandId: 1 }),
      });
      const data = await res.json();
      if (data.success) { setSent(true); }
      else setError(data.message || 'Failed to send. Try again.');
    } catch { setError('Network error. Please try again.'); }
    setSending(false);
  };

  return (
    <>
      {/* Greeting bubble */}
      {showGreet && !open && (
        <div className="wachat-greet" onClick={() => { setOpen(true); setShowGreet(false); }}>
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
              <div className="wachat-header-status"><span className="wachat-online-dot" />Typically replies instantly</div>
            </div>
            <button className="wachat-close-btn" onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="wachat-form-body">
            {sent ? (
              <div className="wachat-success">
                <svg viewBox="0 0 24 24" fill="none" stroke="#25D366" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="40" height="40">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <p>Message sent to your WhatsApp!</p>
                <span>We'll reply shortly on <strong>+91 {phone}</strong></span>
                <a
                  href={`https://wa.me/917434834000?text=${encodeURIComponent(message)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wachat-open-btn"
                >
                  Open WhatsApp Chat
                </a>
                <button className="wachat-reset-btn" onClick={() => { setSent(false); setPhone(''); setMessage('Hi, I need help with my order.'); setName(''); }}>Send another</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="wachat-form">
                <p className="wachat-form-desc">Enter your number and we'll send you a WhatsApp message.</p>
                <div className="wachat-field">
                  <label>Your Name (optional)</label>
                  <input value={name} onChange={e => setName(e.target.value)} placeholder="Rahul Shah" />
                </div>
                <div className="wachat-field">
                  <label>WhatsApp Number *</label>
                  <div className="wachat-phone-row">
                    <span className="wachat-prefix">+91</span>
                    <input
                      value={phone}
                      onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="10-digit number"
                      inputMode="numeric"
                      required
                    />
                  </div>
                </div>
                <div className="wachat-field">
                  <label>Message *</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} required />
                </div>
                {error && <div className="wachat-error">{error}</div>}
                <button type="submit" className="wachat-submit-btn" disabled={sending || phone.length < 10}>
                  {sending ? 'Sending…' : 'Send on WhatsApp'}
                </button>
              </form>
            )}
          </div>
          <div className="wachat-footer">Powered by Cross Coin</div>
        </div>
      )}

      {/* FAB */}
      <button className={`wachat-fab${open ? ' wachat-fab--open' : ''}`} onClick={() => { setOpen(o => !o); setShowGreet(false); }} aria-label="Chat on WhatsApp">
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
