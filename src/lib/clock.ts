import { isIsoDate } from '@/lib/calc'

/**
 * The app's clock.
 *
 * Every date the app computes with comes from here, and its source is the
 * server rather than the device. A phone with a wrong clock would otherwise
 * show — and record — the wrong day, and in a book of monthly interest that is
 * money: on a 200,000 loan at 5% a month, one day's skew across a month
 * anniversary is 10,000.
 *
 * `syncServerClock()` resolves the date once, before React mounts (see
 * `main.tsx`), so the first render already has the right value and no component
 * has to re-derive it. Without that ordering, anything holding `today` in
 * `useState` — the reporting period, a form's default date, a year selector —
 * would keep whatever the device said at mount.
 *
 * The device clock is the fallback when `/api/time` cannot be reached, so the
 * app still works offline. `clockSource()` reports which one is in force.
 */

export type ClockSource = 'server' | 'device'

export interface ServerClock {
  /** Server timestamp in UTC. */
  now: string
  /** The server's calendar date in the ledger's timezone. */
  today: string
}

const ENDPOINT = '/api/time'

/**
 * Startup cannot hang on a slow network: past this the device clock stands and
 * the app proceeds. One cheap read, so the budget is generous.
 */
const TIMEOUT_MS = 2000

function deviceTodayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

let today = deviceTodayIso()
let source: ClockSource = 'device'

/**
 * The ledger's current date: the server's once synced, the device's otherwise.
 *
 * Re-read from the module on every call rather than captured, so a reload picks
 * up a new day. The value is fixed for the life of the page — matching the
 * agreed behaviour that balances are recomputed when the app is refreshed, not
 * on a timer.
 */
export function todayIso(): string {
  return today
}

/** Which clock `todayIso()` is reading. */
export function clockSource(): ClockSource {
  return source
}

/** The date from a `/api/time` payload, or null when it is not a usable date. */
export function readServerClock(payload: unknown): string | null {
  const value = String((payload as Partial<ServerClock> | null)?.today ?? '')
  return isIsoDate(value) ? value : null
}

/**
 * Replaces the device date with the server's. Returns false when the server is
 * unreachable or answers with something that is not a date, leaving the device
 * clock in place so the app keeps working.
 */
export async function syncServerClock(): Promise<boolean> {
  try {
    // `AbortSignal.timeout` is absent on older engines and on jsdom.
    const signal =
      typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(TIMEOUT_MS) : undefined

    const response = await fetch(ENDPOINT, {
      headers: { Accept: 'application/json' },
      signal,
    })
    if (!response.ok) return false

    const serverToday = readServerClock(await response.json())
    if (!serverToday) return false

    today = serverToday
    source = 'server'
    return true
  } catch {
    // Offline, no function host, or a timeout: the device clock stands.
    return false
  }
}
