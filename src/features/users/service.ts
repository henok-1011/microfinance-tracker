import { deleteDoc, doc, setDoc } from 'firebase/firestore'

import { postJson } from '@/lib/api'
import { round2 } from '@/lib/calc'
import { db } from '@/lib/firebase'
import type { Role, Target, UserProfile } from '@/lib/types'

export function mapUser(id: string, data: Record<string, unknown>): UserProfile {
  return {
    uid: id,
    name: String(data.name ?? ''),
    phone: String(data.phone ?? ''),
    role: data.role === 'admin' ? 'admin' : 'user',
    expectedYearly: Number(data.expectedYearly ?? 0),
    active: data.active !== false,
    createdAt: String(data.createdAt ?? ''),
  }
}

export function mapTarget(id: string, data: Record<string, unknown>): Target {
  return {
    id,
    userId: String(data.userId ?? ''),
    year: Number(data.year ?? 0),
    amount: Number(data.amount ?? 0),
  }
}

export function targetDocId(userId: string, year: number): string {
  return `${userId}_${year}`
}

export async function setYearlyTarget(userId: string, year: number, amount: number): Promise<void> {
  await setDoc(doc(db, 'targets', targetDocId(userId, year)), {
    userId,
    year,
    amount: round2(amount),
  })
}

export interface CreateUserInput {
  name: string
  /** The sign-in credential, written however the admin prefers. */
  phone: string
  password: string
  role?: Role
  expectedYearly?: number
}

/**
 * Account creation has to run server-side: the client SDK's `createUser` would
 * sign the admin in as the new user. See `api/admin/create-user.ts`.
 */
export async function createUser(input: CreateUserInput): Promise<{ uid: string }> {
  return postJson<{ uid: string }>('/api/admin/create-user', input)
}

export type UserProfilePatch = Partial<Pick<UserProfile, 'name' | 'expectedYearly' | 'active'>>

/** Profile edits go through the admin API so every write is authorised server-side. */
export async function updateUser(uid: string, patch: UserProfilePatch): Promise<void> {
  await postJson('/api/admin/update-user', { uid, ...patch }, 'PUT')
}

/**
 * Removes the Auth account first, then the profile doc. An orphaned profile is
 * harmless (admin-only), whereas an orphaned Auth account could still sign in.
 */
export async function deleteUser(uid: string): Promise<void> {
  await postJson('/api/admin/delete-user', { uid })
  await deleteDoc(doc(db, 'users', uid))
}
