/**
 * Phone numbers are the sign-in credential.
 *
 * Firebase has no phone-plus-password credential — its email/password provider
 * requires an address — so each phone number maps to a deterministic internal
 * address. That mapping has to be byte-identical on the client (sign-in) and the
 * server (account creation), or a user is created under one address and cannot
 * sign in with another. `api/admin/create-user.ts` therefore imports this file
 * rather than reimplementing it.
 */

/** Not routable, and never shown to a user. */
const AUTH_EMAIL_DOMAIN = 'users.microfinance.local'

/**
 * Digits only, with an Ethiopian country code and any trunk zero removed:
 * `+251 91 234 5678`, `251912345678`, `0912345678` and `912345678` all become
 * `912345678`.
 */
export function normalizePhone(input: string): string {
  let digits = input.replace(/\D/g, '')
  // Country code first, then the trunk zero, so `+2510912…` also normalises. The
  // length guard keeps a genuine nine-digit number that starts with 251 intact.
  if (digits.length > 9 && digits.startsWith('251')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

/** A nine-digit subscriber number, written however the user prefers. */
export function isPhoneValid(input: string): boolean {
  return /^\d{9}$/.test(normalizePhone(input))
}

/** The internal Auth address for a phone number. */
export function phoneToAuthEmail(input: string): string {
  return `${normalizePhone(input)}@${AUTH_EMAIL_DOMAIN}`
}
