import { createContext } from 'react'

import { yearRange, type DateRange } from '@/lib/calc'
import { todayIso } from '@/lib/clock'

/**
 * Home and Reports both open on the current year, taken from the server clock
 * rather than the device's, so a phone with a wrong year cannot open the
 * reports on an empty period.
 */
export function defaultDateRange(): DateRange {
  return yearRange(Number(todayIso().slice(0, 4)))
}

export interface DateRangeValue {
  range: DateRange
  setRange: (range: DateRange) => void
}

/**
 * Home and Reports share one range, so switching tabs keeps the period the
 * reader was looking at.
 */
export const DateRangeContext = createContext<DateRangeValue | null>(null)
