import React from 'react';
import StatusPill from './StatusPill';

// Shipping label: downloaded (done) · ready to print (needs you) · none yet.
const LabelStatusBadge = ({ hasLabel, downloadedAt }) => {
  if (hasLabel && downloadedAt) {
    const date = new Date(downloadedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <StatusPill tone="done">Downloaded</StatusPill>
        <span style={{ fontSize: '11.5px', color: 'var(--ds-color-text-muted)' }}>{date}</span>
      </span>
    );
  }
  if (hasLabel) return <StatusPill tone="needs">Label Ready</StatusPill>;
  return <StatusPill tone="neutral">No Label</StatusPill>;
};

export default LabelStatusBadge;
