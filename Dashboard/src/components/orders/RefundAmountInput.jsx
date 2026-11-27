import Input from '../ui/Input';

export function validRefundAmount(value, maximum) {
  const text = String(value).trim();
  const amount = Number(text);
  return /^\d+(?:\.\d{1,2})?$/.test(text) && amount > 0 && amount <= maximum;
}

export const formatRefundAmount = (amount) => Number(amount).toLocaleString('en-IN', {
  style: 'currency', currency: 'INR', minimumFractionDigits: 2, maximumFractionDigits: 2,
});

export default function RefundAmountInput({ value, maximum, onChange, disabled }) {
  return (
    <Input
      name="prepaid-refund-amount"
      label="Refund amount (₹)"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode="decimal"
      maxLength={16}
      autoComplete="off"
      helperText={`Up to ${formatRefundAmount(maximum)}. Enter up to two decimal places.`}
      disabled={disabled}
      required
    />
  );
}
