export const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

export const compactCurrency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatCurrency(value) {
  return currency.format(Number(value || 0));
}

export function formatPercent(value) {
  return `${Math.round(Number(value || 0))}%`;
}
