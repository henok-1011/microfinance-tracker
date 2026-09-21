import { onSnapshot, type DocumentData, type Query } from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'

export interface CollectionState<T> {
  data: T[]
  loading: boolean
  error: Error | null
  /** Re-subscribes the query, e.g. after a failed or stale snapshot. */
  reload: () => void
}

interface SubscriptionState<T> {
  data: T[]
  error: Error | null
  /** Bumped by `reload` to force a fresh subscription. */
  attempt: number
  /** True until the current attempt reports back. */
  pending: boolean
}

/**
 * Subscribes to a Firestore query and maps documents to domain objects.
 * Pass stable `query` and `mapDoc` references (module-level constants) so the
 * subscription is not torn down on every render.
 */
export function useCollection<T>(
  query: Query<DocumentData>,
  mapDoc: (id: string, data: DocumentData) => T,
): CollectionState<T> {
  const [state, setState] = useState<SubscriptionState<T>>({
    data: [],
    error: null,
    attempt: 0,
    pending: true,
  })
  const { attempt } = state

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        setState((previous) => ({
          ...previous,
          data: snapshot.docs.map((document) => mapDoc(document.id, document.data())),
          error: null,
          pending: false,
        }))
      },
      (error) => {
        setState((previous) => ({ ...previous, data: [], error, pending: false }))
      },
    )
    return unsubscribe
  }, [query, mapDoc, attempt])

  const reload = useCallback(() => {
    // Marking the attempt pending here (rather than inside the effect) keeps the
    // view in its placeholder state without a cascading render.
    setState((previous) => ({
      ...previous,
      error: null,
      pending: true,
      attempt: previous.attempt + 1,
    }))
  }, [])

  return { data: state.data, loading: state.pending, error: state.error, reload }
}
