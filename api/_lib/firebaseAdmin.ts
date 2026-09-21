import { cert, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

function getAdminApp(): App {
  const existing = getApps()[0]
  if (existing) return existing

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  if (serviceAccount) {
    return initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
  }

  // Falls back to Application Default Credentials (Firebase emulators / GCP).
  return initializeApp()
}

export const adminApp = getAdminApp()
export const adminAuth = getAuth(adminApp)
export const adminDb = getFirestore(adminApp)
