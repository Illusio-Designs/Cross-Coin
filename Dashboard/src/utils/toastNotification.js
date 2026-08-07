// showSuccess/showError aliases — render the custom Obzus toast.
import React from 'react';
import { toast } from 'react-toastify';
import ToastMessage from '../components/common/ToastMessage';

const config = {
  position: 'top-right',
  autoClose: 3000,
  hideProgressBar: true,
  closeOnClick: false,
  pauseOnHover: true,
  pauseOnFocusLoss: false,
  draggable: false,
  icon: false,
  closeButton: false,
};

const show = (type, message, toastId) => {
  const id = toastId || (typeof message === 'string' ? message : type);
  toast.dismiss(id);
  toast(React.createElement(ToastMessage, { type, message }), { ...config, toastId: id });
};

export const showSuccess = (key, customMessage) => show('success', customMessage || key || 'Success!');
export const showError   = (key, customMessage) => show('error',   customMessage || key || 'Something went wrong.');
export const showInfo    = (key, customMessage) => show('info',    customMessage || key || 'Info');
export const showWarning = (key, customMessage) => show('warning', customMessage || key || 'Warning');
