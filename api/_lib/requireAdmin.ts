import type { VercelRequest } from '@vercel/node'

import { adminAuth } from './firebaseAdmin.js'

export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function requireAdmin(req: VercelRequest) {
  const header = req.headers.authorization ?? ''
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!idToken) {
    throw new HttpError(401, 'Missing bearer token')
  }

  const caller = await adminAuth.verifyIdToken(idToken)
  if (caller.role !== 'admin') {
    throw new HttpError(403, 'Admin role required')
  }

  return caller
}
