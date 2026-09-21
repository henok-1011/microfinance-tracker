import { describe, expect, it } from 'vitest'

import { round2, sum } from '@/lib/calc/money'

describe('money helpers', () => {
  it('rounds to two decimals', () => {
    expect(round2(10.005)).toBe(10.01)
    expect(round2(10.004)).toBe(10)
  })

  it('sums values without floating point drift', () => {
    expect(sum([0.1, 0.2])).toBe(0.3)
  })
})
