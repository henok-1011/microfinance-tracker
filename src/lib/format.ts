export function formatETB(value: number, language: string = 'en'): string {
  return new Intl.NumberFormat(language === 'am' ? 'am-ET' : 'en-ET', {
    style: 'currency',
    currency: 'ETB',
    maximumFractionDigits: 2,
  }).format(value)
}
