import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { AuthContext, type AuthState } from '@/features/auth/context'
import { auth, db } from '@/lib/firebase'
import { phoneToAuthEmail } from '@/lib/phone'
import type { Role, UserProfile } from '@/lib/types'

function resolveRole(claimRole: unknown, profileRole: Role | undefined): Role {
  if (claimRole === 'admin' || claimRole === 'user') return claimRole
  return profileRole ?? 'user'
}

async function loadProfile(uid: string): Promise<UserProfile | null> {
  const snapshot = await getDoc(doc(db, 'users', uid))
  if (!snapshot.exists()) return null
  return { uid, ...(snapshot.data() as Omit<UserProfile, 'uid'>) }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading')
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [role, setRole] = useState<Role | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async (nextUser) => {
      if (!nextUser) {
        setUser(null)
        setProfile(null)
        setRole(null)
        setStatus('unauthenticated')
        return
      }

      try {
        const [tokenResult, nextProfile] = await Promise.all([
          nextUser.getIdTokenResult(),
          loadProfile(nextUser.uid),
        ])
        setUser(nextUser)
        setProfile(nextProfile)
        setRole(resolveRole(tokenResult.claims.role, nextProfile?.role))
      } catch {
        setUser(nextUser)
        setProfile(null)
        setRole('user')
      } finally {
        setStatus('authenticated')
      }
    })
  }, [])

  // The typed phone number is mapped to its internal address here, so no caller
  // has to know how credentials are stored.
  const signIn = useCallback(async (phone: string, password: string) => {
    await signInWithEmailAndPassword(auth, phoneToAuthEmail(phone), password)
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  const refreshRole = useCallback(async () => {
    const current = auth.currentUser
    if (!current) return
    const [tokenResult, nextProfile] = await Promise.all([
      current.getIdTokenResult(true),
      loadProfile(current.uid),
    ])
    setProfile(nextProfile)
    setRole(resolveRole(tokenResult.claims.role, nextProfile?.role))
  }, [])

  const value = useMemo<AuthState>(
    () => ({ status, user, profile, role, signIn, signOut, refreshRole }),
    [status, user, profile, role, signIn, signOut, refreshRole],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
