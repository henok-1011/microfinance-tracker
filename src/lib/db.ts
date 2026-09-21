import { collection } from 'firebase/firestore'

import { db } from '@/lib/firebase'

export const usersQuery = collection(db, 'users')
export const targetsQuery = collection(db, 'targets')
export const contributionsQuery = collection(db, 'contributions')
export const loansQuery = collection(db, 'loans')
export const repaymentsQuery = collection(db, 'repayments')
