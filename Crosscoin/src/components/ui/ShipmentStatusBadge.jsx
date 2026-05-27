import React from 'react';

const ShipmentStatusBadge = ({ status, syncError }) => {
  const statusConfig = {
    pending: { icon: '⏳', label: 'Pending Sync', color: '#ff9800', bg: '#fff3e0' },
    syncing: { icon: '🔄', label: 'Syncing...', color: '#2196f3', bg: '#e3f2fd' },
    synced: { icon: '✓', label: 'Synced', color: '#4caf50', bg: '#e8f5e9' },
    failed: { icon: '❌', label: 'Sync Failed', color: '#f44336', bg: '#ffebee' }
  };

  const config = statusConfig[status] || statusConfig.pending;

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
        <span
          style={{
            fontSize: '12px',
            color: '#f44336',
            title: syncError
          }}
          title={syncError}
        >
          ⓘ
        </span>
      )}
    </div>
  );
};

export default ShipmentStatusBadge;
