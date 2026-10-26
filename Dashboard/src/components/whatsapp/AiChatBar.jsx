import React, { useCallback, useEffect, useRef, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { AiMagicIcon, RefreshIcon } from '@hugeicons/core-free-icons';
import { adminApi } from '../../services';
import { showError } from '../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   AI strip above a chat: what the customer talked about (AI summary),
   whether the chat was handed to the team, and AI on/paused for this chat.
   GET  /api/whatsapp/conversations/:id/ai            → { ai }
   PUT  /api/whatsapp/conversations/:id/ai {paused}   → { ai }
   POST /api/whatsapp/conversations/:id/ai/summarize  → { ai }
   ────────────────────────────────────────────────────────────── */

const INTENT = {
  order_status: 'Order status', product_question: 'Product question', size_help: 'Size help',
  price_offer: 'Price / offer', return_refund: 'Return / refund', complaint: 'Complaint',
  payment: 'Payment', cancel_order: 'Cancel order', address_change: 'Address change',
  greeting: 'Just saying hi', other: 'Other',
};
const MOOD = { happy: ['Happy', 'success'], neutral: null, upset: ['Upset', 'danger'] };

const errText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
function ago(v) {
  if (!v) return '';
  const m = Math.round((Date.now() - new Date(v).getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}
const clock = (v) => new Date(v).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' });

export default function AiChatBar({ convId, refreshKey }) {
  const [ai, setAi] = useState(null);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState(true);
  const lastId = useRef(null);

  const load = useCallback(async () => {
    try {
      const { data } = await adminApi.get(`/api/whatsapp/conversations/${convId}/ai`);
      setAi(data?.ai || null);
    } catch (_) { /* the strip is optional */ }
  }, [convId]);

  // Fresh chat → reset; new messages → reload a moment later (the AI writes
  // its summary a few seconds after the customer's message).
  useEffect(() => {
    if (lastId.current !== convId) { lastId.current = convId; setAi(null); load(); return undefined; }
    const t = setTimeout(load, 9000);
    return () => clearTimeout(t);
  }, [convId, refreshKey, load]);

  async function act(kind) {
    setBusy(kind);
    try {
      const { data } = kind === 'summarize'
        ? await adminApi.post(`/api/whatsapp/conversations/${convId}/ai/summarize`)
        : await adminApi.put(`/api/whatsapp/conversations/${convId}/ai`, { paused: kind === 'pause' });
      setAi(data?.ai || null);
      setOpen(true);
    } catch (e) {
      showError('aiFailed', errText(e, 'The AI could not do that just now.'));
    } finally { setBusy(''); }
  }

  if (!ai || (!ai.ready && !ai.summary)) return null;
  const paused = !!ai.paused_until;
  const mood = ai.sentiment ? MOOD[ai.sentiment] : null;

  return (
    <div className={`wai${ai.needs_human ? ' is-alert' : ''}`} role="region" aria-label="AI summary">
      <div className="wai-top">
        <span className="wai-badge"><HugeiconsIcon icon={AiMagicIcon} size={14} strokeWidth={2} aria-hidden="true" /> AI</span>
        {ai.needs_human
          ? <b className="wai-alert">Needs you{ai.handoff_reason ? `: ${ai.handoff_reason}` : ''}</b>
          : ai.enabled && ai.ready
            ? <span className="wai-state">{paused ? (ai.paused_forever ? 'Paused in this chat' : `Paused until ${clock(ai.paused_until)}`) : 'Replying in this chat'}</span>
            : <span className="wai-state">Auto chat is off</span>}
        <span className="wai-actions">
          {ai.summary && (
            <button type="button" className="wib-btn wib-btn--sm wai-ghost" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'Hide summary' : 'Show summary'}
            </button>
          )}
          {ai.ready && (
            <button type="button" className="wib-btn wib-btn--sm" onClick={() => act('summarize')} disabled={!!busy}
              title="Ask the AI to sum up this chat again">
              <HugeiconsIcon icon={RefreshIcon} size={13} strokeWidth={2} aria-hidden="true" />
              {busy === 'summarize' ? 'Summarizing…' : ai.summary ? 'Refresh' : 'Summarize chat'}
            </button>
          )}
          {ai.enabled && ai.ready && (
            paused
              ? <button type="button" className="wib-btn wib-btn--sm" onClick={() => act('resume')} disabled={!!busy}>{busy === 'resume' ? 'Resuming…' : 'Let AI reply'}</button>
              : <button type="button" className="wib-btn wib-btn--sm" onClick={() => act('pause')} disabled={!!busy}>{busy === 'pause' ? 'Pausing…' : 'Pause AI here'}</button>
          )}
        </span>
      </div>
      {ai.summary && open && (
        <div className="wai-body">
          <p className="wai-summary">{ai.summary}</p>
          <div className="wai-tags">
            {ai.intent && <span className="wib-pill wib-pill--info">{INTENT[ai.intent] || ai.intent}</span>}
            {mood && <span className={`wib-pill wib-pill--${mood[1]}`}>{mood[0]}</span>}
            {ai.summary_at && <span className="wai-when">Updated {ago(ai.summary_at)}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
