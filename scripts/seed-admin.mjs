import { readFileSync } from 'node:fs'

import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * The sign-in credential is a phone number. Firebase's email/password provider
 * needs an address, so each phone maps to an internal one — keep this in step
 * with `normalizePhone` / `phoneToAuthEmail` in `src/lib/phone.ts`, since the
 * browser has to derive exactly the same address at sign-in.
 *
 * Inlined rather than imported because this script runs as plain Node, with no
 * TypeScript loader guaranteed.
 */
function normalizePhone(input) {
  let digits = input.replace(/\D/g, '')
  if (digits.length > 9 && digits.startsWith('251')) digits = digits.slice(3)
  if (digits.startsWith('0')) digits = digits.slice(1)
  return digits
}

function phoneToAuthEmail(phone) {
  return `${normalizePhone(phone)}@users.microfinance.local`
}

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
const phone = process.env.ADMIN_PHONE
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME ?? 'Administrator'

if (!serviceAccountPath || !phone || !password) {
  console.error('Set FIREBASE_SERVICE_ACCOUNT_PATH, ADMIN_PHONE and ADMIN_PASSWORD before running.')
  process.exit(1)
}

if (!/^\d{9}$/.test(normalizePhone(phone))) {
  console.error(`ADMIN_PHONE must be a nine-digit number, for example 0912345678 (got "${phone}").`)
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })

const auth = getAuth()
const db = getFirestore()

const email = phoneToAuthEmail(phone)
const existing = await auth.getUserByEmail(email).catch(() => null)
const user = existing ?? (await auth.createUser({ email, password, displayName: name }))

await auth.setCustomUserClaims(user.uid, { role: 'admin' })
await db
  .collection('users')
  .doc(user.uid)
  .set(
    {
      name,
      phone: normalizePhone(phone),
      role: 'admin',
      expectedYearly: 0,
      active: true,
      createdAt: new Date().toISOString(),
    },
    { merge: true },
  )

console.log(`Admin ready: ${user.uid}`)
process.exit(0)
