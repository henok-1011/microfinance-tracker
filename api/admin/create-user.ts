import type { VercelRequest, VercelResponse } from '@vercel/node'

import { isPhoneValid, normalizePhone, phoneToAuthEmail } from '../../src/lib/phone.ts'
import { adminAuth, adminDb } from '../_lib/firebaseAdmin'
import { HttpError, requireAdmin } from '../_lib/requireAdmin'

type Role = 'admin' | 'user'

type CreateUserBody = {
  name?: string
  phone?: string
  password?: string
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
      phone,
      password,
      role = 'user',
      expectedYearly = 0,
    } = (req.body ?? {}) as CreateUserBody

    if (!name || !phone || !password) {
      res.status(400).json({ error: 'name, phone and password are required' })
      return
    }
    if (!isPhoneValid(phone)) {
      res.status(400).json({ error: 'Enter a valid phone number, for example 0912345678' })
      return
    }

    // The phone is the credential, so it is stored normalised: one account per
    // number, however the admin typed it.
    const normalizedPhone = normalizePhone(phone)

    let userRecord
    try {
      userRecord = await adminAuth.createUser({
        email: phoneToAuthEmail(phone),
        password,
        displayName: name,
      })
    } catch (error) {
      if ((error as { code?: string }).code === 'auth/email-already-exists') {
        res.status(409).json({ error: 'An account with that phone number already exists' })
        return
      }
      throw error
    }

    await adminAuth.setCustomUserClaims(userRecord.uid, { role })

    await adminDb.collection('users').doc(userRecord.uid).set({
      name,
      phone: normalizedPhone,
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
