import { afterEach, describe, expect, it, vi } from 'vitest'

import { readServerClock } from '@/lib/clock'

/** A fresh module instance, so the clock's module state starts unsynced. */
async function freshClock() {
  vi.resetModules()
  return import('@/lib/clock')
}

function respondWith(payload: unknown, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({ ok, json: async () => payload } as unknown as Response),
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('readServerClock', () => {
  it('accepts a well-formed date', () => {
    expect(readServerClock({ now: '2026-09-23T10:00:00.000Z', today: '2026-09-23' })).toBe(
      '2026-09-23',
    )
  })

  it('rejects a missing, malformed, or impossible date', () => {
    expect(readServerClock(null)).toBeNull()
    expect(readServerClock({})).toBeNull()
    expect(readServerClock({ today: '' })).toBeNull()
    expect(readServerClock({ today: '2026-9-23' })).toBeNull()
    expect(readServerClock({ today: '2026-02-30' })).toBeNull()
    expect(readServerClock({ today: 'not a date' })).toBeNull()
  })
})

describe('syncServerClock', () => {
  it('starts on the device clock', async () => {
    const clock = await freshClock()
    expect(clock.clockSource()).toBe('device')
    expect(clock.todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('adopts the server date and reports the server as the source', async () => {
    respondWith({ now: '2026-09-23T21:30:00.000Z', today: '2026-09-24' })
    const clock = await freshClock()

    await expect(clock.syncServerClock()).resolves.toBe(true)
    expect(clock.todayIso()).toBe('2026-09-24')
    expect(clock.clockSource()).toBe('server')
  })

  it('keeps the device date when the server is unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    const clock = await freshClock()
    const before = clock.todayIso()

    await expect(clock.syncServerClock()).resolves.toBe(false)
    expect(clock.todayIso()).toBe(before)
    expect(clock.clockSource()).toBe('device')
  })

  it('keeps the device date on an error response', async () => {
    respondWith({ error: 'Method not allowed' }, false)
    const clock = await freshClock()

    await expect(clock.syncServerClock()).resolves.toBe(false)
    expect(clock.clockSource()).toBe('device')
  })

  it('keeps the device date when the payload is not a date', async () => {
    respondWith({ today: 'whenever' })
    const clock = await freshClock()

    await expect(clock.syncServerClock()).resolves.toBe(false)
    expect(clock.todayIso()).not.toBe('whenever')
    expect(clock.clockSource()).toBe('device')
  })

  it('does not replace the device date with garbage', async () => {
    respondWith({ today: '2026-13-45' })
    const clock = await freshClock()
    const before = clock.todayIso()

    await clock.syncServerClock()
    expect(clock.todayIso()).toBe(before)
  })
})
