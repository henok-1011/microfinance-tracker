import type { VercelRequest, VercelResponse } from '@vercel/node'

import { adminAuth, adminDb } from '../_lib/firebaseAdmin'
import { HttpError, requireAdmin } from '../_lib/requireAdmin'

type Role = 'admin' | 'user'

type CreateUserBody = {
  name?: string
  email?: string
  password?: string
  phone?: string
  role?: Role
  expectedYearly?: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  try {
    await requireAdmin(req)

    const {
      name,
      email,
      password,
      phone,
      role = 'user',
      expectedYearly = 0,
    } = (req.body ?? {}) as CreateUserBody

    if (!name || !email || !password) {
      res.status(400).json({ error: 'name, email and password are required' })
      return
    }

    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    })
    await adminAuth.setCustomUserClaims(userRecord.uid, { role })

    await adminDb
      .collection('users')
      .doc(userRecord.uid)
      .set({
        name,
        email,
        phone: phone ?? '',
        role,
        expectedYearly,
        active: true,
        createdAt: new Date().toISOString(),
      })

    res.status(201).json({ uid: userRecord.uid })
  } catch (error) {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message })
      return
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ error: message })
  }
}
