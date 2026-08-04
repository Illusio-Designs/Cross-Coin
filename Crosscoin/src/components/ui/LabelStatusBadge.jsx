import React from 'react';

const LabelStatusBadge = ({ hasLabel, downloadedAt }) => {
  if (hasLabel && downloadedAt) {
    const date = new Date(downloadedAt).toLocaleDateString();
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '14px', color: '#4caf50' }}>✓</span>
        <span
          style={{
            display: 'inline-block',
            backgroundColor: '#e8f5e9',
            color: '#2e7d32',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}
        >
          Downloaded
        </span>
        <span style={{ fontSize: '11px', color: '#999' }}>({date})</span>
      </div>
    );
  }

  if (hasLabel) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '14px', color: '#2196f3' }}>📥</span>
        <span
          style={{
            display: 'inline-block',
            backgroundColor: '#e3f2fd',
            color: '#1976d2',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: '500',
            whiteSpace: 'nowrap'
          }}
        >
          Label Ready
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={{ fontSize: '14px', color: '#999' }}>📄</span>
      <span
        style={{
          display: 'inline-block',
          backgroundColor: '#f5f5f5',
          color: '#999',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '500',
          whiteSpace: 'nowrap'
        }}
      >
        No Label
      </span>
    </div>
  );
};

export default LabelStatusBadge;
