const wholeRupees = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export function formatRupees(value) {
  return `₹${wholeRupees.format(Number(value) || 0)}`;
}
