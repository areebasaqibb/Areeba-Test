export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export function formatCurrency(amount: number, currencyCode: string = 'USD', locale: string = 'en-US') {
  const roundedAmount = Math.round(amount / 10) * 10;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount);
}

