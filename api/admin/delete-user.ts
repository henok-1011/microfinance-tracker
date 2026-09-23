import type { VercelRequest, VercelResponse } from '@vercel/node'

import { adminAuth } from '../_lib/firebaseAdmin.js'
import { HttpError, requireAdmin } from '../_lib/requireAdmin.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    const caller = await requireAdmin(req)

    const { uid } = (req.body ?? {}) as { uid?: string }
    if (!uid) {
      res.status(400).json({ error: 'uid is required' })
      return
    }
    if (uid === caller.uid) {
      res.status(400).json({ error: 'You cannot delete your own account' })
      return
    }

    // Idempotent: a missing Auth account still lets the caller clean up the profile doc.
    await adminAuth.deleteUser(uid).catch((error: unknown) => {
      if ((error as { code?: string }).code !== 'auth/user-not-found') throw error
    })

    res.status(200).json({ uid })
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}
