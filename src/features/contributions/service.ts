import { addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'

import { round2 } from '@/lib/calc'
import { contributionsQuery } from '@/lib/db'
import { db, auth } from '@/lib/firebase'
import type { Contribution } from '@/lib/types'

export function mapContribution(id: string, data: Record<string, unknown>): Contribution {
  return {
    id,
    userId: String(data.userId ?? ''),
    year: Number(data.year ?? 0),
    amount: Number(data.amount ?? 0),
    date: String(data.date ?? ''),
    note: String(data.note ?? ''),
    recordedBy: String(data.recordedBy ?? ''),
    createdAt: String(data.createdAt ?? ''),
  }
}

export interface ContributionInput {
  userId: string
  year: number
  amount: number
  date: string
  note?: string
}

export async function addContribution(input: ContributionInput): Promise<string> {
  const reference = await addDoc(contributionsQuery, {
    userId: input.userId,
    year: input.year,
    amount: round2(input.amount),
    date: input.date,
    note: input.note ?? '',
    recordedBy: auth.currentUser?.uid ?? '',
    createdAt: new Date().toISOString(),
  })
  return reference.id
}

export async function updateContribution(
  id: string,
  patch: Partial<ContributionInput>,
): Promise<void> {
  await updateDoc(doc(db, 'contributions', id), {
    ...patch,
    ...(patch.amount !== undefined ? { amount: round2(patch.amount) } : {}),
  })
}

export async function deleteContribution(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contributions', id))
}
