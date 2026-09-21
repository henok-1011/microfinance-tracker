import { mapContribution } from '@/features/contributions/service'
import { contributionsQuery } from '@/lib/db'
import { useCollection } from '@/lib/hooks/useCollection'

export function useContributions() {
  return useCollection(contributionsQuery, mapContribution)
}
