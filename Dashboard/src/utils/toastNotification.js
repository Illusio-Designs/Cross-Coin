// showSuccess/showError aliases — gooey toasts (lib/adminToast).
import { notify } from '../lib/adminToast';

// Friendly copy for the message keys used across the dashboard. Keys not listed
// here are turned into a sentence from their camelCase name (see humanize).
const MESSAGES = {
  createSuccess: 'Created successfully.',
  updateSuccess: 'Updated successfully.',
  deleteSuccess: 'Deleted successfully.',
  saved: 'Saved successfully.',
  deleted: 'Deleted successfully.',
  updated: 'Updated successfully.',
  fieldRequired: 'Please fill in all required fields.',
  loadingFailed: 'Failed to load data. Please try again.',
  loadFailed: 'Failed to load data. Please try again.',
  saveFailed: 'Failed to save changes. Please try again.',
  updateFailed: 'Failed to update. Please try again.',
  deleteFailed: 'Failed to delete. Please try again.',
  sendFailed: 'Failed to send. Please try again.',
  exportFailed: 'Export failed. Please try again.',
  syncInProgress: 'A sync is already in progress. Please wait for it to finish.',
};

const isKey = (value) => typeof value === 'string' && /^[a-z][a-zA-Z0-9]*$/.test(value);

// "brandUpdated" → "Brand updated"
const humanize = (key) => {
  const words = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const resolve = (key, customMessage, fallback) => {
  if (customMessage) return customMessage;
  if (isKey(key)) return MESSAGES[key] || humanize(key);
  return key || fallback;
};

const show = (type, message, toastId) => notify(type, message, toastId ? { id: toastId } : {});

export const showSuccess = (key, customMessage) => show('success', resolve(key, customMessage, 'Success!'));
export const showError   = (key, customMessage) => show('error',   resolve(key, customMessage, 'Something went wrong.'));
export const showInfo    = (key, customMessage) => show('info',    resolve(key, customMessage, 'Info'));
export const showWarning = (key, customMessage) => show('warning', resolve(key, customMessage, 'Warning'));
