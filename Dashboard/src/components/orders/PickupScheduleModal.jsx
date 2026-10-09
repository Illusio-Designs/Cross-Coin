import { useState, useEffect, useCallback } from 'react';
import { Modal, Button, DateRangePicker } from '../ui';
import { pickupScheduleService } from '../../services';
import { showSuccess, showError } from '../../utils/toastNotification';

const fmt = (s) => {
  try { return new Date(s + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return s; }
};

// Shared pickup schedule: Sundays off by default + blocked date ranges (no
// pickup). Auto-sync stamps each order with the next allowed pickup date.
export default function PickupScheduleModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [weeklyOffDays, setWeeklyOffDays] = useState([0]);
  const [blockedRanges, setBlockedRanges] = useState([]);
  const [cutoffHour, setCutoffHour] = useState(15);
  const [nextDate, setNextDate] = useState(null);
  const [rStart, setRStart] = useState('');
  const [rEnd, setREnd] = useState('');
  const [affectedWarn, setAffectedWarn] = useState(null); // { count, orders } — already-booked orders a new block can't hold
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await pickupScheduleService.get();
      const s = d?.schedule || {};
      setWeeklyOffDays(Array.isArray(s.weeklyOffDays) ? s.weeklyOffDays : [0]);
      setBlockedRanges(Array.isArray(s.blockedRanges) ? s.blockedRanges : []);
      setCutoffHour(Number.isFinite(s.cutoffHour) ? s.cutoffHour : 15);
      setNextDate(d?.nextDate || null);
      setAffectedWarn(null);
    } catch (e) {
      showError(e?.response?.data?.message || 'Failed to load pickup schedule');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (open) load(); }, [open, load]);

  const toggleSunday = () => setWeeklyOffDays((prev) => (prev.includes(0) ? prev.filter((d) => d !== 0) : [...prev, 0]));

  const addRange = async () => {
    const from = rStart;
    const to = rEnd || rStart;
    if (!from) { showError('Pick a start date'); return; }
    const a = from <= to ? from : to;
    const b = from <= to ? to : from;
    setBlockedRanges((prev) => [...prev, { from: a, to: b }]);
    setRStart(''); setREnd('');
    // Warn about orders ALREADY booked for pickup in this range — a block can't
    // hold those (they're already with the courier).
    setChecking(true);
    setAffectedWarn(null);
    try {
      const d = await pickupScheduleService.affected(a, b);
      if (d?.count > 0) setAffectedWarn({ count: d.count, orders: Array.isArray(d.orders) ? d.orders : [] });
    } catch (_) { /* non-blocking — the block still saves */ }
    finally { setChecking(false); }
  };
  const removeRange = (idx) => setBlockedRanges((prev) => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      const d = await pickupScheduleService.save({ weeklyOffDays, blockedRanges, cutoffHour });
      setNextDate(d?.nextDate || null);
      showSuccess('Pickup schedule saved — applied to all stores');
      onClose();
    } catch (e) {
      showError(e?.response?.data?.message || 'Failed to save pickup schedule');
    } finally { setSaving(false); }
  };

  const lbl = { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--ds-color-text-muted)', marginBottom: 8 };

  return (
    <Modal isOpen={open} onClose={onClose} title="Pickup Schedule" closeOnOverlayClick={false}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 320, maxWidth: 440 }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-color-text-muted)', lineHeight: 1.5 }}>
          One shared schedule for all stores. Orders are booked in a daily 11:00 AM IST batch so the courier picks them up the next working day; pickups skip Sundays and your blocked ranges (an order whose pickup would fall on a blocked day waits for the next allowed day).
        </p>

        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={weeklyOffDays.includes(0)} onChange={toggleSunday} style={{ width: 16, height: 16 }} />
          Sundays off every week
        </label>

        <div>
          <div style={lbl}>Block a date range (no pickup)</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <DateRangePicker label="" startDate={rStart} endDate={rEnd} onStartChange={setRStart} onEndChange={setREnd} onClear={() => { setRStart(''); setREnd(''); }} inline />
            <Button variant="secondary" onClick={addRange} disabled={!rStart}>Mark no-pickup</Button>
          </div>
        </div>

        {checking && (
          <div style={{ fontSize: 12.5, color: 'var(--ds-color-text-muted)' }}>Checking already-booked orders…</div>
        )}
        {affectedWarn && (
          <div style={{ background: 'var(--ds-color-warning-bg,#fef3c7)', color: 'var(--ds-color-warning-text,#92400e)', border: '1px solid var(--ds-color-warning,#f59e0b)', borderRadius: 9, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.5 }}>
            <b>⚠ {affectedWarn.count} order{affectedWarn.count === 1 ? '' : 's'} already booked for pickup in this range.</b>
            <div style={{ marginTop: 3 }}>
              A block can't hold these — they're already with the courier. The courier will still attempt pickup, and reattempts the next working day if the warehouse is closed.
            </div>
            {affectedWarn.orders.length > 0 && (
              <div style={{ marginTop: 5, fontFamily: 'monospace', fontSize: 11.5, opacity: .9 }}>
                {affectedWarn.orders.slice(0, 8).map((o) => o.orderNumber).join(', ')}{affectedWarn.count > 8 ? ` +${affectedWarn.count - 8} more` : ''}
              </div>
            )}
          </div>
        )}

        <div>
          <div style={lbl}>Blocked ranges</div>
          {blockedRanges.length === 0 && (
            <div style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--ds-color-text-muted)' }}>No blocked ranges.</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {blockedRanges.map((r, i) => (
              <div key={`${r.from}_${r.to}_${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--ds-color-danger-bg,#fee2e2)', color: 'var(--ds-color-danger,#dc2626)', borderRadius: 9, padding: '8px 12px', fontSize: 13, fontWeight: 700 }}>
                <span>No pickup · {r.from === r.to ? fmt(r.from) : `${fmt(r.from)} → ${fmt(r.to)}`}</span>
                <button onClick={() => removeRange(i)} title="Remove" style={{ marginLeft: 'auto', border: 'none', background: 'rgba(0,0,0,.14)', color: 'inherit', width: 20, height: 20, borderRadius: '50%', cursor: 'pointer', fontWeight: 800 }}>×</button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 4, paddingTop: 14, borderTop: '1px solid var(--ds-color-border)' }}>
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>Next pickup: <b style={{ color: 'var(--ds-color-text)' }}>{nextDate ? fmt(nextDate) : '—'}</b></span>
          <Button variant="primary" onClick={save} loading={saving} disabled={loading}>Save schedule</Button>
        </div>
      </div>
    </Modal>
  );
}
