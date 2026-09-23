import type { User } from 'firebase/auth'
import { createContext } from 'react'

import type { Role, UserProfile } from '@/lib/types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthState {
  status: AuthStatus
  user: User | null
  profile: UserProfile | null
  role: Role | null
  signIn: (phone: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshRole: () => Promise<void>
}

export const AuthContext = createContext<AuthState | undefined>(undefined)
