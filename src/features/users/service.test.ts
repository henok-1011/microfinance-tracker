import { describe, expect, it, vi } from 'vitest'

import { mapTarget, mapUser, targetDocId } from '@/features/users/service'

// The service imports the Firebase singletons; the mappers under test are pure.
vi.mock('@/lib/firebase', () => ({ db: {}, auth: { currentUser: null } }))

describe('mapUser', () => {
  it('maps a complete profile document', () => {
    expect(
      mapUser('uid-1', {
        name: 'Almaz',
        email: 'almaz@example.com',
        phone: '0911223344',
        role: 'admin',
        expectedYearly: 12000,
        active: true,
        createdAt: '2026-01-02T00:00:00.000Z',
      }),
    ).toEqual({
      uid: 'uid-1',
      name: 'Almaz',
      email: 'almaz@example.com',
      phone: '0911223344',
      role: 'admin',
      expectedYearly: 12000,
      active: true,
      createdAt: '2026-01-02T00:00:00.000Z',
    })
  })

  it('falls back to safe defaults for a sparse document', () => {
    expect(mapUser('uid-2', {})).toEqual({
      uid: 'uid-2',
      name: '',
      email: '',
      phone: '',
      role: 'user',
      expectedYearly: 0,
      active: true,
      createdAt: '',
    })
  })

  it('only accepts admin as a privileged role', () => {
    expect(mapUser('uid-1', { role: 'admin' }).role).toBe('admin')
    expect(mapUser('uid-1', { role: 'owner' }).role).toBe('user')
    expect(mapUser('uid-1', { role: 'user' }).role).toBe('user')
  })

  it('treats a missing active flag as active but honours an explicit false', () => {
    expect(mapUser('uid-1', {}).active).toBe(true)
    expect(mapUser('uid-1', { active: false }).active).toBe(false)
  })
})

describe('mapTarget', () => {
  it('maps a target document', () => {
    expect(mapTarget('uid-1_2026', { userId: 'uid-1', year: 2026, amount: 5000 })).toEqual({
      id: 'uid-1_2026',
      userId: 'uid-1',
      year: 2026,
      amount: 5000,
    })
  })

  it('falls back for a sparse document', () => {
    expect(mapTarget('doc-1', {})).toEqual({
      id: 'doc-1',
      userId: '',
      year: 0,
      amount: 0,
    })
  })
})

describe('targetDocId', () => {
  it('builds the userId_year document id used by setYearlyTarget', () => {
    expect(targetDocId('uid-1', 2026)).toBe('uid-1_2026')
  })
})
