import { useMemo, useState, type ReactNode } from 'react'

import {
  DateRangeContext,
  defaultDateRange,
  type DateRangeValue,
} from '@/features/reports/dateRangeContext'
import type { DateRange } from '@/lib/calc'

/** Holds the reporting period shared by Home and Reports. */
export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [range, setRange] = useState<DateRange>(defaultDateRange)

  const value = useMemo<DateRangeValue>(() => ({ range, setRange }), [range])

  return <DateRangeContext.Provider value={value}>{children}</DateRangeContext.Provider>
}
