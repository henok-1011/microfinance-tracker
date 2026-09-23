/**
 * Bootstraps an admin account against the LOCAL Firebase Emulator Suite.
 *
 * Unlike `seed-admin.mjs`, this needs no service-account file and no shell
 * environment variables: the emulators accept any credential, so a throwaway
 * in-memory RSA key satisfies firebase-admin's parser. Run `npm run emulators`
 * first, then `npm run seed:emulator`.
 *
 * Override the defaults with ADMIN_PHONE / ADMIN_PASSWORD / ADMIN_NAME if you
 * like; they are optional.
 */

/**
 * Keep in step with `normalizePhone` / `phoneToAuthEmail` in `src/lib/phone.ts`:
 * the browser derives the same internal address from the typed phone number at
 * sign-in, so a mismatch here means the seeded admin cannot log in. Inlined
 * because this script runs as plain Node, with no TypeScript loader.
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

const projectId = process.env.FIREBASE_PROJECT_ID ?? 'microfinance-test'
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099'
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8181'
const phone = process.env.ADMIN_PHONE ?? '0912345678'
const password = process.env.ADMIN_PASSWORD ?? 'password123'
const name = process.env.ADMIN_NAME ?? 'Administrator'
const email = phoneToAuthEmail(phone)

// firebase-admin reads these when its modules are initialised, so they have to be
// set before the dynamic imports below (static imports would hoist above this).
process.env.FIREBASE_AUTH_EMULATOR_HOST = authHost
process.env.FIRESTORE_EMULATOR_HOST = firestoreHost
process.env.GCLOUD_PROJECT = projectId

const { generateKeyPairSync } = await import('node:crypto')
const { cert, initializeApp } = await import('firebase-admin/app')
const { getAuth } = await import('firebase-admin/auth')
const { getFirestore } = await import('firebase-admin/firestore')

// The emulator ignores this key, but cert() parses it eagerly and rejects
// placeholders with "Failed to parse private key".
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
})

const app = initializeApp({
  credential: cert({
    project_id: projectId,
    client_email: `seed@${projectId}.iam.gserviceaccount.com`,
    private_key: privateKey,
  }),
  projectId,
})

const auth = getAuth(app)
const db = getFirestore(app)

function fail(message) {
  console.error(`\n${message}`)
  process.exit(1)
}

const existing = await auth.getUserByEmail(email).catch((error) => {
  if (error?.code === 'auth/user-not-found') return null
  if (error?.code === 'app/network-error' || error?.code === 'auth/network-request-failed') {
    fail(`Could not reach the Auth emulator at ${authHost}. Is "npm run emulators" running?`)
  }
  fail(`Unexpected error from the Auth emulator: ${error?.message ?? error}`)
})

const user = existing ?? (await auth.createUser({ email, password, displayName: name }))

// The role custom claim is what firestore.rules and /api require. The profile
// doc's role is only a fallback for the UI, so both are written here.
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

console.log(`\nAdmin ready against the emulators (project ${projectId}).`)
console.log(`  phone:    ${phone}`)
console.log(`  password: ${existing ? '(unchanged — account already existed)' : password}`)
console.log(`  uid:      ${user.uid}`)
console.log('\nStart the app with "npm run dev" and sign in at http://localhost:5173')
process.exit(0)
