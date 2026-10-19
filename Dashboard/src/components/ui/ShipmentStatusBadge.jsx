import React from 'react';
import Tooltip from './Tooltip';
import { showError } from '../../utils/toastNotification';

const ShipmentStatusBadge = ({ status, syncError }) => {
  const statusConfig = {
    pending: { icon: '⏳', label: 'Pending Sync', color: 'var(--ds-color-warn)', bg: 'var(--ds-color-warn-bg)' },
    syncing: { icon: '🔄', label: 'Syncing...', color: 'var(--ds-color-info)', bg: 'var(--ds-color-info-bg)' },
    synced: { icon: '✓', label: 'Synced', color: 'var(--ds-color-success)', bg: 'var(--ds-color-success-bg)' },
    failed: { icon: '❌', label: 'Sync Failed', color: 'var(--ds-color-danger)', bg: 'var(--ds-color-danger-bg)' }
  };

  // A serviceability failure isn't a "sync error" the operator can retry away —
  // the pincode simply isn't served by any courier. Show it as its own clear
  // state so staff know to fix the address, not re-click Sync.
  const isNotServiceable =
    status === 'failed' && /not\s+serviceable|serviceab/i.test(String(syncError || ''));
  const config = isNotServiceable
    ? { icon: '📍', label: 'Not Serviceable', color: 'var(--ds-color-danger)', bg: 'var(--ds-color-danger-bg)' }
    : (statusConfig[status] || statusConfig.pending);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '16px' }}>{config.icon}</span>
      <span
        style={{
          display: 'inline-block',
          backgroundColor: config.bg,
          color: config.color,
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          whiteSpace: 'nowrap'
        }}
      >
        {config.label}
      </span>
      {syncError && status === 'failed' && (
        // Real hover tooltip (the old native `title` was unreliable and never
        // showed). Click reveals the full reason too, since a sync error can be
        // long and the tooltip is single-line (shown as an error toast).
        <Tooltip text={syncError} position="top">
          <span
            role="button"
            tabIndex={0}
            onClick={() => showError('syncError', String(syncError))}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showError('syncError', String(syncError)); } }}
            style={{ fontSize: '14px', color: 'var(--ds-color-danger)', cursor: 'help', fontWeight: 700, lineHeight: 1 }}
            aria-label={`Sync error: ${syncError}`}
          >
            ⓘ
          </span>
        </Tooltip>
      )}
    </div>
  );
};

export default ShipmentStatusBadge;
