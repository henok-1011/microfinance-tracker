import { mapLoan, mapRepayment } from '@/features/loans/service'
import { loansQuery, repaymentsQuery } from '@/lib/db'
import { useCollection } from '@/lib/hooks/useCollection'

export function useLoans() {
  return useCollection(loansQuery, mapLoan)
}

export function useRepayments() {
  return useCollection(repaymentsQuery, mapRepayment)
}
