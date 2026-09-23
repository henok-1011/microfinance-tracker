import type { VercelRequest, VercelResponse } from '@vercel/node'

/**
 * The ledger's timezone.
 *
 * App dates are calendar dates in one fixed timezone, not in the reader's. Two
 * admins on phones set to different zones must agree on which day a payment
 * landed, and a monthly interest charge must not turn over at a different
 * moment for each of them. Ethiopia is UTC+3 with no daylight saving, so a UTC
 * date would roll over three hours late — a payment taken just after midnight
 * in Addis would be filed on the previous day.
 */
const APP_TIMEZONE = 'Africa/Addis_Ababa'

/** `yyyy-mm-dd` for `at` as read in `timeZone`. */
function isoDateIn(timeZone: string, at: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at)

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? ''

  return `${part('year')}-${part('month')}-${part('day')}`
}

/**
 * GET /api/time — the server's date, so the client never computes with a device
 * clock that may be wrong.
 *
 * Deliberately public and unauthenticated: it exposes nothing but the time, and
 * the app needs it before it can render any balance. It is not privilege-bearing
 * like `api/admin/*`, so it does not call `requireAdmin()`.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const now = new Date()
  // Never cached: a stale clock is the bug this endpoint exists to prevent.
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({
    now: now.toISOString(),
    today: isoDateIn(APP_TIMEZONE, now),
    timeZone: APP_TIMEZONE,
  })
}
