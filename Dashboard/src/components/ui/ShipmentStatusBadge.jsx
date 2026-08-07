import React from 'react';
import Tooltip from './Tooltip';

const ShipmentStatusBadge = ({ status, syncError }) => {
  const statusConfig = {
    pending: { icon: '⏳', label: 'Pending Sync', color: '#ff9800', bg: '#fff3e0' },
    syncing: { icon: '🔄', label: 'Syncing...', color: '#2196f3', bg: '#e3f2fd' },
    synced: { icon: '✓', label: 'Synced', color: '#4caf50', bg: '#e8f5e9' },
    failed: { icon: '❌', label: 'Sync Failed', color: '#f44336', bg: '#ffebee' }
  };

  // A serviceability failure isn't a "sync error" the operator can retry away —
  // the pincode simply isn't served by any courier. Show it as its own clear
  // state so staff know to fix the address, not re-click Sync.
  const isNotServiceable =
    status === 'failed' && /not\s+serviceable|serviceab/i.test(String(syncError || ''));
  const config = isNotServiceable
    ? { icon: '📍', label: 'Not Serviceable', color: '#d84315', bg: '#fbe9e7' }
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
        // long and the tooltip is single-line.
        <Tooltip text={syncError} position="top">
          <span
            role="button"
            tabIndex={0}
            onClick={() => { if (typeof window !== 'undefined') window.alert(syncError); }}
            style={{ fontSize: '14px', color: '#f44336', cursor: 'help', fontWeight: 700, lineHeight: 1 }}
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
