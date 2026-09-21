const MS_PER_DAY = 86_400_000

/** Parses the `yyyy-mm-dd` prefix of an ISO string into UTC milliseconds. */
export function toUtcMillis(iso: string): number {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  return Date.UTC(year, month - 1, day)
}

/** Whole days between two ISO dates; never negative. */
export function daysBetween(fromIso: string, toIso: string): number {
  const diff = toUtcMillis(toIso) - toUtcMillis(fromIso)
  return Math.max(0, Math.round(diff / MS_PER_DAY))
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

/** True for a real `yyyy-mm-dd` calendar date, so `2026-02-30` is rejected. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

/** Lexicographic comparison, valid for ISO-8601 date strings. */
export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function maxIso(a: string, b: string): string {
  return compareIso(a, b) >= 0 ? a : b
}
