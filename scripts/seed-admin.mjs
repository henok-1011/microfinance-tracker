import { readFileSync } from 'node:fs'

import { cert, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
const email = process.env.ADMIN_EMAIL
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME ?? 'Administrator'

if (!serviceAccountPath || !email || !password) {
  console.error('Set FIREBASE_SERVICE_ACCOUNT_PATH, ADMIN_EMAIL and ADMIN_PASSWORD before running.')
  process.exit(1)
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'))
initializeApp({ credential: cert(serviceAccount) })

const auth = getAuth()
const db = getFirestore()

const existing = await auth.getUserByEmail(email).catch(() => null)
const user = existing ?? (await auth.createUser({ email, password, displayName: name }))

await auth.setCustomUserClaims(user.uid, { role: 'admin' })
await db.collection('users').doc(user.uid).set(
  {
    name,
    email,
    phone: '',
    role: 'admin',
    expectedYearly: 0,
    active: true,
    createdAt: new Date().toISOString(),
  },
  { merge: true },
)

console.log(`Admin ready: ${user.uid}`)
process.exit(0)
