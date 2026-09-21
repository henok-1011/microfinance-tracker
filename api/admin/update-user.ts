import type { VercelRequest, VercelResponse } from '@vercel/node'

import { adminAuth, adminDb } from '../_lib/firebaseAdmin'
import { HttpError, requireAdmin } from '../_lib/requireAdmin'

type UpdateUserBody = {
  uid?: string
  name?: string
  phone?: string
  expectedYearly?: number
  active?: boolean
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await requireAdmin(req)

    const { uid, name, phone, expectedYearly, active } = (req.body ?? {}) as UpdateUserBody
    if (!uid) {
      res.status(400).json({ error: 'uid is required' })
      return
    }

    const patch: Record<string, unknown> = {}
    if (typeof name === 'string') patch.name = name.trim()
    if (typeof phone === 'string') patch.phone = phone.trim()
    if (typeof expectedYearly === 'number' && Number.isFinite(expectedYearly)) {
      patch.expectedYearly = Math.max(0, expectedYearly)
    }
    if (typeof active === 'boolean') patch.active = active

    if (Object.keys(patch).length === 0) {
      res.status(400).json({ error: 'No updatable fields provided' })
      return
    }

    await adminDb.collection('users').doc(uid).set(patch, { merge: true })

    // Keep the Auth display name in sync; the Firestore profile stays the source of truth.
    if (typeof patch.name === 'string') {
      await adminAuth.updateUser(uid, { displayName: patch.name }).catch(() => undefined)
    }

    res.status(200).json({ uid, updated: Object.keys(patch) })
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}
