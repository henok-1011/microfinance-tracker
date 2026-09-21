import { describe, expect, it } from 'vitest'

import { compareIso, daysBetween, maxIso, todayIso } from '@/lib/calc/date'

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

describe('iso helpers', () => {
  it('compares and picks the later date', () => {
    expect(compareIso('2026-01-01', '2026-02-01')).toBe(-1)
    expect(compareIso('2026-02-01', '2026-01-01')).toBe(1)
    expect(compareIso('2026-01-01', '2026-01-01')).toBe(0)
    expect(maxIso('2026-01-01', '2026-02-01')).toBe('2026-02-01')
  })
})
