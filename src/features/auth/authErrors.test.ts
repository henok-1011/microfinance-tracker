import { describe, expect, it } from 'vitest'

import { authErrorKey } from '@/features/auth/authErrors'

describe('authErrorKey', () => {
  it('maps known Firebase error codes', () => {
    expect(authErrorKey({ code: 'auth/invalid-credential' })).toBe('auth.errors.invalidCredentials')
    expect(authErrorKey({ code: 'auth/too-many-requests' })).toBe('auth.errors.tooManyRequests')
  })

  it('falls back to a generic key for unknown shapes', () => {
    expect(authErrorKey(new Error('boom'))).toBe('auth.errors.generic')
    expect(authErrorKey(null)).toBe('auth.errors.generic')
    expect(authErrorKey({ code: 'auth/unknown' })).toBe('auth.errors.generic')
  })
})
