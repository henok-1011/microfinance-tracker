const MS_PER_DAY = 86_400_000

/**
 * Days a partial month is billed over. Interest is charged per calendar month,
 * so the leftover days after the last whole month are prorated at 1/30 each.
 */
const DAYS_PER_MONTH = 30

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

function pad2(value: number): string {
  return String(value).padStart(2, '0')
}

/** Length of a 1-indexed calendar month, leap years included. */
function daysInUtcMonth(year: number, month: number): number {
  // Day 0 of the following month is the last day of this one.
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

/**
 * Adds whole calendar months, clamping the day to the target month's length so
 * 31 January + 1 month lands on 28 February rather than overflowing into March.
 */
export function addMonths(iso: string, months: number): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  const total = month - 1 + months
  const targetYear = year + Math.floor(total / 12)
  const targetMonth = ((total % 12) + 12) % 12
  const targetDay = Math.min(day, daysInUtcMonth(targetYear, targetMonth + 1))
  return `${targetYear}-${pad2(targetMonth + 1)}-${pad2(targetDay)}`
}

/**
 * Months from `fromIso` to `toIso`: whole calendar months plus the leftover
 * days billed at 1/30 of a month each. So 1 January → 1 June is exactly 5, and
 * 1 January → 11 January is 10/30 of a month. Never negative.
 */
export function monthsBetween(fromIso: string, toIso: string): number {
  const from = fromIso.slice(0, 10)
  const to = toIso.slice(0, 10)
  if (compareIso(to, from) <= 0) return 0

  const [fromYear, fromMonth, fromDay] = from.split('-').map(Number)
  const [toYear, toMonth, toDay] = to.split('-').map(Number)

  let months = (toYear - fromYear) * 12 + (toMonth - fromMonth)
  // A month only counts once its day-of-month is reached. The clamp keeps
  // 31 January → 28 February counting as one whole month, not zero.
  if (toDay < Math.min(fromDay, daysInUtcMonth(toYear, toMonth))) months -= 1
  if (months < 0) months = 0

  const leftoverDays = daysBetween(addMonths(from, months), to)
  return months + leftoverDays / DAYS_PER_MONTH
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

export function minIso(a: string, b: string): string {
  return compareIso(a, b) <= 0 ? a : b
}

/** Inclusive ISO date window, used to scope the reports to a period. */
export interface DateRange {
  from: string
  to: string
}

/** True when `date` falls inside the range, both bounds included. */
export function isWithinRange(date: string, range: DateRange): boolean {
  return compareIso(date, range.from) >= 0 && compareIso(date, range.to) <= 0
}

/**
 * Targets are stored per year, so a range is anchored to the year it starts in:
 * a January–June 2026 period is measured against the 2026 targets.
 */
export function targetYearForRange(range: DateRange): number {
  return Number(range.from.slice(0, 4))
}

/** A whole calendar year as a range. */
export function yearRange(year: number): DateRange {
  return { from: `${year}-01-01`, to: `${year}-12-31` }
}

/** 1 January of `asOf`'s year through `asOf` itself. */
export function yearToDateRange(asOf: string): DateRange {
  return { from: `${asOf.slice(0, 4)}-01-01`, to: asOf }
}

/** Both bounds are real calendar dates and `from` is not after `to`. */
export function isValidRange(range: DateRange): boolean {
  return isIsoDate(range.from) && isIsoDate(range.to) && compareIso(range.from, range.to) <= 0
}
