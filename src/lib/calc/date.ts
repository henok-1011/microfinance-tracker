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

/** Lexicographic comparison, valid for ISO-8601 date strings. */
export function compareIso(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

export function maxIso(a: string, b: string): string {
  return compareIso(a, b) >= 0 ? a : b
}
