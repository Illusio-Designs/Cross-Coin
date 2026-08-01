import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button } from '../ui';
import { orderService } from '../../services';
import { showSuccess, showError } from '../../utils/toastNotification';

/* ──────────────────────────────────────────────────────────────
   CourierSelectionModal — manual courier picker.

   Opened when an admin wants to choose the courier themselves —
   either directly, or automatically when an auto-sync came back
   failed (no serviceable courier / permanent error). Fetches the
   live rate/courier list from the provider (iThink) for the order's
   route, and on pick queues a sync with that specific courier.
   ────────────────────────────────────────────────────────────── */

const money = (n) => (n == null || n === '' ? null : `₹${Number(n).toLocaleString('en-IN')}`);

// The provider list comes back in a few shapes — read defensively.
function normalizeCourier(c, i) {
  const name = c.logistics_name || c.courier_name || c.courier || c.name || c.logistics || `Courier ${i + 1}`;
  const id = c.logistics || c.courier_id || c.id || c.courier_name || c.logistics_name || name;
  const rate = c.rate ?? c.total_charges ?? c.freight_charge ?? c.total_amount ?? c.price ?? null;
  const days = c.estimated_delivery_days || c.edd || c.delivery_days || c.tat || null;
  const rating = c.rating ?? c.courier_rating ?? null;
  const sType = c.s_type || c.service_type || c.serviceType || 'surface';
  return { key: `${id}-${sType}-${i}`, name, id, rate, days, rating, sType, raw: c };
}

export default function CourierSelectionModal({ isOpen, orderId, orderNumber, autoFailedReason, onClose, onSynced }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [couriers, setCouriers] = useState([]);
  const [route, setRoute] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [assigning, setAssigning] = useState(null); // courier key currently being assigned

  const load = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    setCouriers([]);
    try {
      const res = await orderService.getAvailableCouriers(orderId);
      if (res?.success) {
        setRoute(res.route || null);
        setWarnings(res.warnings || []);
        setCouriers((res.couriers || []).map(normalizeCourier));
      } else {
        setError(res?.message || 'Could not load couriers for this order.');
      }
    } catch (e) {
      setError(e?.message || e?.error || 'Failed to fetch couriers from the shipping provider.');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen) load();
    else { setCouriers([]); setError(null); setRoute(null); setWarnings([]); setAssigning(null); }
  }, [isOpen, load]);

  const assign = async (courier) => {
    if (assigning) return;
    setAssigning(courier.key);
    try {
      const res = await orderService.syncOrderWithCourier(orderId, {
        logistics: courier.id,
        s_type: courier.sType,
        auto: false,
      });
      if (res?.success) {
        showSuccess('orderSynced', res.message || `Assigned ${courier.name} to ${orderNumber}. Refresh status in a moment.`);
        onSynced?.();
        onClose?.();
      } else {
        showError('syncFailed', res?.message || 'Failed to assign courier.');
      }
    } catch (e) {
      showError('syncFailed', e?.message || e?.error || 'Failed to assign courier.');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Select Courier — ${orderNumber || ''}`}>
      <div style={{ minWidth: 'min(560px, 86vw)' }}>
        {/* Why the picker opened (auto-sync failed) */}
        {autoFailedReason && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', borderRadius: 8, padding: '10px 12px', fontSize: 13, marginBottom: 12 }}>
            Auto-sync couldn’t place this order: <strong>{autoFailedReason}</strong>. Pick a courier manually below.
          </div>
        )}

        {/* Route */}
        {route && (
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
            Route: <strong>{route.from}</strong> → <strong>{route.to}</strong>
          </div>
        )}

        {/* Warnings */}
        {warnings?.length > 0 && (
          <ul style={{ margin: '0 0 12px', paddingLeft: 18, fontSize: 12, color: '#b45309' }}>
            {warnings.map((w, i) => <li key={i}>{typeof w === 'string' ? w : (w.message || JSON.stringify(w))}</li>)}
          </ul>
        )}

        {loading ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
            Loading couriers from the shipping provider…
          </div>
        ) : error ? (
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <p style={{ color: '#dc2626', fontSize: 14, margin: '0 0 12px' }}>{error}</p>
            <Button variant="secondary" onClick={load}>Retry</Button>
          </div>
        ) : couriers.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
            No couriers are serviceable for this destination / payment mode.
            <div style={{ fontSize: 12, marginTop: 6 }}>Check the pincode, COD availability, or the shipping weight/dimensions.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '48vh', overflowY: 'auto' }}>
            {couriers.map((c) => (
              <div key={c.key} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 12px',
              }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: '#111827', textTransform: 'capitalize' }}>{c.name}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                    <span style={{ textTransform: 'capitalize' }}>{c.sType}</span>
                    {c.days && <span>· ETA {c.days} day{String(c.days) === '1' ? '' : 's'}</span>}
                    {c.rating != null && <span>· ★ {c.rating}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  {money(c.rate) && <span style={{ fontWeight: 700, fontSize: 14, color: '#059669', fontVariantNumeric: 'tabular-nums' }}>{money(c.rate)}</span>}
                  <Button variant="primary" onClick={() => assign(c)} disabled={!!assigning} style={{ fontSize: 12, padding: '6px 12px' }}>
                    {assigning === c.key ? 'Assigning…' : 'Assign'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="modal-footer" style={{ marginTop: 16 }}>
          <Button variant="secondary" onClick={onClose} disabled={!!assigning}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
