import { addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore'

import { round2 } from '@/lib/calc'
import { loansQuery, repaymentsQuery } from '@/lib/db'
import { auth, db } from '@/lib/firebase'
import type { Loan, LoanStatus, Repayment } from '@/lib/types'

export function mapLoan(id: string, data: Record<string, unknown>): Loan {
  return {
    id,
    borrowerName: String(data.borrowerName ?? ''),
    borrowerPhone: String(data.borrowerPhone ?? ''),
    principal: Number(data.principal ?? 0),
    annualRatePct: Number(data.annualRatePct ?? 0),
    startDate: String(data.startDate ?? ''),
    dueDate: String(data.dueDate ?? ''),
    status: data.status === 'paid' ? 'paid' : 'active',
    createdBy: String(data.createdBy ?? ''),
    createdAt: String(data.createdAt ?? ''),
  }
}

export function mapRepayment(id: string, data: Record<string, unknown>): Repayment {
  return {
    id,
    loanId: String(data.loanId ?? ''),
    amount: Number(data.amount ?? 0),
    date: String(data.date ?? ''),
    recordedBy: String(data.recordedBy ?? ''),
    createdAt: String(data.createdAt ?? ''),
  }
}

export interface LoanInput {
  borrowerName: string
  borrowerPhone?: string
  principal: number
  annualRatePct: number
  startDate: string
  dueDate: string
}

export async function addLoan(input: LoanInput): Promise<string> {
  const reference = await addDoc(loansQuery, {
    borrowerName: input.borrowerName,
    borrowerPhone: input.borrowerPhone ?? '',
    principal: round2(input.principal),
    annualRatePct: input.annualRatePct,
    startDate: input.startDate,
    dueDate: input.dueDate,
    status: 'active',
    createdBy: auth.currentUser?.uid ?? '',
    createdAt: new Date().toISOString(),
  })
  return reference.id
}

export async function updateLoan(
  id: string,
  patch: Partial<LoanInput> & { status?: LoanStatus },
): Promise<void> {
  await updateDoc(doc(db, 'loans', id), {
    ...patch,
    ...(patch.principal !== undefined ? { principal: round2(patch.principal) } : {}),
  })
}

export async function deleteLoan(id: string): Promise<void> {
  await deleteDoc(doc(db, 'loans', id))
}

export interface RepaymentInput {
  loanId: string
  amount: number
  date: string
}

export async function addRepayment(input: RepaymentInput): Promise<string> {
  const reference = await addDoc(repaymentsQuery, {
    loanId: input.loanId,
    amount: round2(input.amount),
    date: input.date,
    recordedBy: auth.currentUser?.uid ?? '',
    createdAt: new Date().toISOString(),
  })
  return reference.id
}

export async function deleteRepayment(id: string): Promise<void> {
  await deleteDoc(doc(db, 'repayments', id))
}
