import { describe, expect, it } from 'vitest'

import { describeUserError } from '@/features/users/errors'

const t = (key: string) => `t:${key}`

describe('describeUserError', () => {
  it('maps network failures to the i18n network message', () => {
    expect(describeUserError(new TypeError('Failed to fetch'), t)).toBe(
      't:admin.users.errors.network',
    )
  })

  it('surfaces server-provided messages', () => {
    expect(describeUserError(new Error('uid is required'), t)).toBe('uid is required')
  })

  it('falls back to the generic message', () => {
    expect(describeUserError(new Error('   '), t)).toBe('t:admin.users.errors.generic')
    expect(describeUserError('nope', t)).toBe('t:admin.users.errors.generic')
    expect(describeUserError(null, t)).toBe('t:admin.users.errors.generic')
  })
})
