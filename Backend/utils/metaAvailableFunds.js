const currencySymbols = { INR: '₹', USD: '$', EUR: '€' };
const labelPattern = /^(?:available (?:funds|balance)|saldo dispon[ií]vel)\s*:?\s*/i;
const amountPattern = /^([₹$€]|[A-Z]{3})?\s*(\d[\d.,]*)\s*([₹$€]|[A-Z]{3})?$/;

function parseAvailableFunds(label, currency) {
  if (!Object.hasOwn(currencySymbols, currency) || !labelPattern.test(label)) return null;
  let amountText = label.replace(labelPattern, '').trim();
  if (amountText.startsWith('(') && amountText.endsWith(')')) amountText = amountText.slice(1, -1).trim();
  const match = amountText.match(amountPattern);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  if ([prefix, suffix].some((unit) => unit && unit !== currency && unit !== currencySymbols[currency])) return null;

  let amount;
  if (/^(?:\d+|\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3})(?:\.\d{1,2})?$/.test(digits)) {
    amount = digits.replace(/,/g, '');
  } else if (/^(?:\d+|\d{1,3}(?:\.\d{3})*),\d{1,2}$/.test(digits)) {
    amount = digits.replace(/\./g, '').replace(',', '.');
  }
  return /^\d{1,12}(?:\.\d{1,2})?$/.test(amount || '') ? amount : null;
}

module.exports = { parseAvailableFunds };
