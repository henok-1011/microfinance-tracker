export function formatETB(value: number, language: string = 'en'): string {
  return new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(value)
}

/**
 * Grouped amount with no currency symbol, for dense report tables where the
 * unit is stated once in the caption.
 */
export function formatAmount(value: number, language: string = 'en'): string {
  return new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en-ET', {
    maximumFractionDigits: 2,
  }).format(value)
}
