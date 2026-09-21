import { mapTarget, mapUser } from '@/features/users/service'
import { targetsQuery, usersQuery } from '@/lib/db'
import { useCollection } from '@/lib/hooks/useCollection'

export function useUsers() {
  return useCollection(usersQuery, mapUser)
}

export function useTargets() {
  return useCollection(targetsQuery, mapTarget)
}
