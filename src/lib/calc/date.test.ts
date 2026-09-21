import { describe, expect, it } from 'vitest'

import { compareIso, daysBetween, isIsoDate, maxIso, todayIso } from '@/lib/calc/date'

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

describe('todayIso', () => {
  it('returns a yyyy-mm-dd string', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
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
  })
})
