import React, { useState } from 'react';
import styles from '../../styles/components/AlertModal.module.css';

export default function AlertModal({ message, onClose }) {
  if (!message) return null;
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.box} onClick={e => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <button className={styles.btn} onClick={onClose}>OK</button>
      </div>
    </div>
  );
}

export function ConfirmModal({ message, onConfirm, onCancel }) {
  if (!message) return null;
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.box} onClick={e => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <div className={styles.btnRow}>
          <button className={styles.btnCancel} onClick={onCancel}>Cancel</button>
          <button className={styles.btnDanger} onClick={onConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

export function PromptModal({ message, placeholder, onConfirm, onCancel }) {
  const [value, setValue] = useState('');
  if (!message) return null;
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.box} onClick={e => e.stopPropagation()}>
        <p className={styles.message}>{message}</p>
        <input
          className={styles.input}
          type="text"
          placeholder={placeholder || ''}
          value={value}
          onChange={e => setValue(e.target.value)}
          autoFocus
        />
        <div className={styles.btnRow}>
          <button className={styles.btnCancel} onClick={onCancel}>Cancel</button>
          <button className={styles.btnDanger} onClick={() => value.trim() && onConfirm(value.trim())}>Confirm</button>
        </div>
      </div>
    </div>
  );
}
