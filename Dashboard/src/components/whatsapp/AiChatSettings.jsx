import React, { useCallback, useEffect, useState } from 'react';
import { adminApi } from '../../services';
import { Switch, SkeletonForm } from '../ui';
import { showSuccess, showError } from '../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   AI auto chat (WhatsApp settings card, admins only).
   GET /api/whatsapp/settings/ai → { ready, settings:{ enabled, mode,
       instructions, pause_hours, max_replies_per_day } }
   PUT /api/whatsapp/settings/ai   (partial; returns the saved settings)
   `ready` is false until ANTHROPIC_API_KEY is set on the server.
   ────────────────────────────────────────────────────────────── */

const API = '/api/whatsapp/settings/ai';
const errText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

export default function AiChatSettings({ awayHours = null }) {
  const [ready, setReady] = useState(true);
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setErr('');
    try {
      const { data } = await adminApi.get(API);
      setReady(!!data?.ready);
      setSaved(data.settings);
      setDraft(data.settings);
    } catch (e) { setErr(errText(e, 'Could not load the AI settings.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(key, patch, okMsg) {
    setSaving(key);
    try {
      const { data } = await adminApi.put(API, patch);
      setReady(!!data?.ready);
      setSaved(data.settings);
      setDraft((d) => ({ ...data.settings, ...(key === 'notes' ? {} : { instructions: d?.instructions ?? data.settings.instructions }) }));
      if (okMsg) showSuccess('saved', okMsg);
    } catch (e) {
      showError('saveFailed', errText(e, 'Could not save.'));
    } finally { setSaving(''); }
  }

  const notesDirty = saved && draft && (draft.instructions !== saved.instructions
    || Number(draft.pause_hours) !== saved.pause_hours || Number(draft.max_replies_per_day) !== saved.max_replies_per_day);

  return (
    <section className="wpb-card wpb-form" aria-label="AI auto chat">
      <h2 className="wpb-h2">AI auto chat</h2>
      {loading && !saved ? (
        <SkeletonForm fields={3} label="Loading AI settings…" />
      ) : err && !saved ? (
        <div className="wpb-banner t-warn" role="status">
          <span>{err}</span>
          <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={load}>Try again</button>
        </div>
      ) : (
        <>
          {!ready && (
            <div className="wpb-banner t-warn" role="status">
              <span>Not connected yet: add <code>ANTHROPIC_API_KEY</code> to the main API app’s environment in cPanel, run NPM install, and restart it. Until then the AI stays off.</span>
            </div>
          )}
          <div className="wpb-toggle-row">
            <div className="wpb-toggle-text">
              <b>Reply to customers automatically</b>
              <span>The AI answers WhatsApp messages using your products, prices, policies, FAQs and the customer’s own orders, and writes a short summary of every chat for the team. Complaints, refunds, damaged items and “talk to a person” are handed to you with an alert.</span>
            </div>
            <Switch checked={!!saved.enabled} disabled={!!saving || (!ready && !saved.enabled)} aria-label="AI auto chat"
              onChange={(on) => save('enabled', { enabled: on }, on ? 'AI auto chat turned on' : 'AI auto chat turned off')} />
          </div>

          <div className="wpb-field">When should it reply?
            <div className="wpb-chips" role="group" aria-label="When the AI replies">
              {[
                { k: 'always', l: 'All the time' },
                { k: 'off_hours', l: awayHours ? `Only outside ${awayHours.start}–${awayHours.end}` : 'Only when the team is offline' },
              ].map((m) => (
                <button key={m.k} type="button" aria-pressed={saved.mode === m.k} disabled={!!saving}
                  className={`wpb-chip wpb-chip--sm${saved.mode === m.k ? ' is-on' : ''}`}
                  onClick={() => saved.mode !== m.k && save('mode', { mode: m.k }, 'Saved')}>{m.l}</button>
              ))}
            </div>
            <span className="wpb-hint">The offline option uses the team hours set for the away message below. While the AI is replying, it takes over from the away message and the automatic order-status reply.</span>
          </div>

          <form className="wpb-subform" onSubmit={(e) => { e.preventDefault(); save('notes', {
            instructions: draft.instructions,
            pause_hours: Number(draft.pause_hours),
            max_replies_per_day: Number(draft.max_replies_per_day),
          }, 'AI notes saved'); }}>
            <label className="wpb-field">Notes for the AI (optional)
              <textarea className="wpb-input wpb-textarea" rows={4} maxLength={4000} value={draft.instructions}
                placeholder={'Anything it should know or say, e.g.\nDispatch within 24 hours; delivery 3–6 days.\nFree shipping above ₹499.\nAlways suggest the 3-pair pack.'}
                onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))} />
            </label>
            <div className="wpb-form-row">
              <label className="wpb-field wpb-grow">Step back after a team reply (hours)
                <input className="wpb-input" type="number" min={1} max={72} value={draft.pause_hours}
                  onChange={(e) => setDraft((d) => ({ ...d, pause_hours: e.target.value }))} />
              </label>
              <label className="wpb-field wpb-grow">Max AI replies per chat per day
                <input className="wpb-input" type="number" min={3} max={100} value={draft.max_replies_per_day}
                  onChange={(e) => setDraft((d) => ({ ...d, max_replies_per_day: e.target.value }))} />
              </label>
            </div>
            {notesDirty && (
              <div className="wpb-actions">
                <button type="submit" className="wpb-btn wpb-btn--sm" disabled={saving === 'notes'}>{saving === 'notes' ? 'Saving…' : 'Save'}</button>
                <button type="button" className="wpb-btn wpb-btn--ghost wpb-btn--sm" onClick={() => setDraft(saved)}>Undo</button>
              </div>
            )}
          </form>
        </>
      )}
    </section>
  );
}
