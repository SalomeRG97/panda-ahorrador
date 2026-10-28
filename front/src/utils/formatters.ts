const copFormatter = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number | string | null | undefined): string {
  if (value == null || value === '') return '$\u00A00';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$\u00A00';
  return copFormatter.format(num).replace(/\s/g, '\u00A0');
}
