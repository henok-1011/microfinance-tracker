type Translate = (key: string) => string

/**
 * Turns a thrown value into a display string. `postJson` surfaces server errors
 * as `Error` with a diagnostic message, and network failures as `TypeError`.
 */
export function describeUserError(error: unknown, t: Translate): string {
  if (error instanceof TypeError) return t('admin.users.errors.network')
  if (error instanceof Error && error.message.trim()) return error.message
  return t('admin.users.errors.generic')
}
