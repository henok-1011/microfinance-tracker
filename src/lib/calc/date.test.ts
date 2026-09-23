import { describe, expect, it } from 'vitest'

import type { DateRange } from '@/lib/calc/date'

import {
  addMonths,
  compareIso,
  daysBetween,
  isIsoDate,
  isValidRange,
  isWithinRange,
  maxIso,
  minIso,
  monthsBetween,
  targetYearForRange,
  yearRange,
  yearToDateRange,
} from '@/lib/calc/date'

describe('daysBetween', () => {
  it('counts whole days between dates', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetween('2026-01-01', '2026-12-31')).toBe(364)
  })

  it('handles leap years', () => {
    expect(daysBetween('2024-02-28', '2024-03-01')).toBe(2)
    expect(daysBetween('2025-02-28', '2025-03-01')).toBe(1)
  })

  it('crosses year boundaries', () => {
    expect(daysBetween('2025-12-31', '2026-01-01')).toBe(1)
  })

  it('clamps negative ranges to zero', () => {
    expect(daysBetween('2026-02-01', '2026-01-01')).toBe(0)
    expect(daysBetween('2026-01-01', '2026-01-01')).toBe(0)
  })
})

describe('addMonths', () => {
  it('adds whole calendar months', () => {
    expect(addMonths('2026-01-15', 1)).toBe('2026-02-15')
    expect(addMonths('2026-01-15', 5)).toBe('2026-06-15')
    expect(addMonths('2026-01-01', 0)).toBe('2026-01-01')
  })

  it('crosses year boundaries', () => {
    expect(addMonths('2026-11-30', 3)).toBe('2027-02-28')
    expect(addMonths('2026-01-31', 12)).toBe('2027-01-31')
  })

  it('clamps the day to the target month length', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2024-01-31', 1)).toBe('2024-02-29')
    expect(addMonths('2026-08-31', 1)).toBe('2026-09-30')
  })
})

describe('monthsBetween', () => {
  it('counts exact month anniversaries as whole months', () => {
    expect(monthsBetween('2026-01-01', '2026-06-01')).toBe(5)
    expect(monthsBetween('2026-01-15', '2026-06-15')).toBe(5)
    expect(monthsBetween('2026-01-01', '2027-01-01')).toBe(12)
    expect(monthsBetween('2026-01-01', '2026-12-31')).toBe(12)
  })

  it('bills leftover days at 1/30 of a month', () => {
    expect(monthsBetween('2026-01-01', '2026-01-11')).toBeCloseTo(10 / 30, 10)
    expect(monthsBetween('2026-01-15', '2026-06-20')).toBeCloseTo(5 + 5 / 30, 10)
  })

  it('treats a month-end to month-end span as one month', () => {
    expect(monthsBetween('2026-01-31', '2026-02-28')).toBe(1)
    expect(monthsBetween('2024-01-31', '2024-02-29')).toBe(1)
  })

  it('returns zero for the same day or an earlier end date', () => {
    expect(monthsBetween('2026-01-01', '2026-01-01')).toBe(0)
    expect(monthsBetween('2026-06-01', '2026-01-01')).toBe(0)
  })

  it('never overshoots into the next whole month', () => {
    expect(monthsBetween('2026-01-01', '2026-02-28')).toBeLessThan(2)
  })
})

describe('isIsoDate', () => {
  it('accepts real calendar dates', () => {
    expect(isIsoDate('2026-01-01')).toBe(true)
    expect(isIsoDate('2024-02-29')).toBe(true)
    expect(isIsoDate('2026-12-31')).toBe(true)
  })

  it('rejects well-formed but impossible dates', () => {
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2025-02-29')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('2026-00-10')).toBe(false)
    expect(isIsoDate('2026-04-31')).toBe(false)
  })

  it('rejects other shapes', () => {
    expect(isIsoDate('')).toBe(false)
    expect(isIsoDate('2026-1-1')).toBe(false)
    expect(isIsoDate('01-01-2026')).toBe(false)
    expect(isIsoDate('2026-01-01T00:00:00.000Z')).toBe(false)
    expect(isIsoDate('not a date')).toBe(false)
  })
})

describe('iso helpers', () => {
  it('compares and picks the later date', () => {
    expect(compareIso('2026-01-01', '2026-02-01')).toBe(-1)
    expect(compareIso('2026-02-01', '2026-01-01')).toBe(1)
    expect(compareIso('2026-01-01', '2026-01-01')).toBe(0)
    expect(maxIso('2026-01-01', '2026-02-01')).toBe('2026-02-01')
    expect(minIso('2026-01-01', '2026-02-01')).toBe('2026-01-01')
    expect(minIso('2026-01-01', '2026-01-01')).toBe('2026-01-01')
  })
})

describe('ranges', () => {
  const june: DateRange = { from: '2026-01-01', to: '2026-06-30' }

  it('includes both bounds', () => {
    expect(isWithinRange('2026-01-01', june)).toBe(true)
    expect(isWithinRange('2026-06-30', june)).toBe(true)
    expect(isWithinRange('2026-03-15', june)).toBe(true)
  })

  it('excludes dates outside the bounds', () => {
    expect(isWithinRange('2025-12-31', june)).toBe(false)
    expect(isWithinRange('2026-07-01', june)).toBe(false)
  })

  it('anchors the target year to the start of the range', () => {
    expect(targetYearForRange(june)).toBe(2026)
    expect(targetYearForRange({ from: '2026-11-01', to: '2027-02-28' })).toBe(2026)
  })

  it('builds a whole-year range', () => {
    expect(yearRange(2026)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
  })

  it('builds a year-to-date range ending on the given day', () => {
    expect(yearToDateRange('2026-09-21')).toEqual({ from: '2026-01-01', to: '2026-09-21' })
  })

  it('accepts a single-day range and equal bounds', () => {
    expect(isValidRange({ from: '2026-05-01', to: '2026-05-01' })).toBe(true)
    expect(isWithinRange('2026-05-01', { from: '2026-05-01', to: '2026-05-01' })).toBe(true)
  })

  it('rejects an inverted or malformed range', () => {
    expect(isValidRange({ from: '2026-06-30', to: '2026-01-01' })).toBe(false)
    expect(isValidRange({ from: '', to: '2026-01-01' })).toBe(false)
    expect(isValidRange({ from: '2026-02-30', to: '2026-03-01' })).toBe(false)
  })
})
