import React from 'react';
import Tooltip from './Tooltip';
import StatusPill from './StatusPill';
import { showError } from '../../utils/toastNotification';

const SYNC_STATUS = {
  pending: ['needs', 'Pending Sync'],
  syncing: ['progress', 'Syncing…'],
  synced: ['done', 'Synced'],
  failed: ['problem', 'Sync Failed'],
};

const ShipmentStatusBadge = ({ status, syncError }) => {
  // A serviceability failure isn't a "sync error" the operator can retry away —
  // the pincode simply isn't served by any courier. Show it as its own clear
  // state so staff know to fix the address, not re-click Sync.
  const isNotServiceable =
    status === 'failed' && /not\s+serviceable|serviceab/i.test(String(syncError || ''));
  const [tone, label] = isNotServiceable ? ['problem', 'Not Serviceable'] : (SYNC_STATUS[status] || SYNC_STATUS.pending);

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <StatusPill tone={tone}>{label}</StatusPill>
      {syncError && status === 'failed' && (
        // Hover shows the reason; click shows it in full (it can be long).
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
    </span>
  );
};

export default ShipmentStatusBadge;
