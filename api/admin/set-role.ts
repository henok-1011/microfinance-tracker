import type { VercelRequest, VercelResponse } from '@vercel/node'

import { adminAuth, adminDb } from '../_lib/firebaseAdmin.js'
import { HttpError, requireAdmin } from '../_lib/requireAdmin.js'

type Role = 'admin' | 'user'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await requireAdmin(req)

    const { uid, role } = (req.body ?? {}) as { uid?: string; role?: Role }
    if (!uid || (role !== 'admin' && role !== 'user')) {
      res.status(400).json({ error: 'uid and a valid role are required' })
      return
    }

    await adminAuth.setCustomUserClaims(uid, { role })
    await adminDb.collection('users').doc(uid).set({ role }, { merge: true })

    res.status(200).json({ uid, role })
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}
