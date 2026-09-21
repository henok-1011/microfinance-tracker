export type Role = 'admin' | 'user'

export interface UserProfile {
  uid: string
  name: string
  email: string
  phone: string
  role: Role
  expectedYearly: number
  active: boolean
  createdAt: string
}

export interface Target {
  id: string
  userId: string
  year: number
  amount: number
}

export interface Contribution {
  id: string
  userId: string
  year: number
  amount: number
  date: string
  note: string
  recordedBy: string
  createdAt: string
}

export type LoanStatus = 'active' | 'paid'

export interface Loan {
  id: string
  borrowerName: string
  borrowerPhone: string
  principal: number
  annualRatePct: number
  startDate: string
  dueDate: string
  status: LoanStatus
  createdBy: string
  createdAt: string
}

export interface Repayment {
  id: string
  loanId: string
  amount: number
  date: string
  recordedBy: string
  createdAt: string
}
