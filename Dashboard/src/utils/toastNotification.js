// Re-export from toast.js with showSuccess/showError aliases
import { toast } from 'react-toastify';

const config = {
  position: 'top-right',
  autoClose: 1500,
  hideProgressBar: true,
  closeOnClick: true,
  pauseOnHover: false,
  pauseOnFocusLoss: false,
  draggable: false,
  theme: 'light',
};

const show = (type, message, toastId) => {
  const id = toastId || message;
  toast.dismiss(id);
  toast[type](message, { ...config, toastId: id });
  setTimeout(() => toast.dismiss(id), 1500);
};

export const showSuccess = (key, customMessage) => show('success', customMessage || key || 'Success!');
export const showError   = (key, customMessage) => show('error',   customMessage || key || 'Something went wrong.');
export const showInfo    = (key, customMessage) => show('info',    customMessage || key || 'Info');
export const showWarning = (key, customMessage) => show('warning', customMessage || key || 'Warning');
