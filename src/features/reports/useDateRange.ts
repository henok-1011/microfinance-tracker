import { useContext } from 'react'

import { DateRangeContext, type DateRangeValue } from '@/features/reports/dateRangeContext'

/** Reads the reporting period shared by Home and Reports. */
export function useDateRange(): DateRangeValue {
  const value = useContext(DateRangeContext)
  if (!value) throw new Error('useDateRange must be used inside <DateRangeProvider>')
  return value
}
