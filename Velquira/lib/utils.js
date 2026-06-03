import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function formatPrice(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

export function truncate(str, length) {
  if (str.length <= length) return str;
  return str.slice(0, length).trimEnd() + '…';
}

export function slugify(str) {
  return str.
  toLowerCase().
  replace(/[^a-z0-9]+/g, '-').
  replace(/(^-|-$)/g, '');
}