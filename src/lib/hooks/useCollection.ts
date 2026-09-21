import { onSnapshot, type DocumentData, type Query } from 'firebase/firestore'
import { useEffect, useState } from 'react'

export interface CollectionState<T> {
  data: T[]
  loading: boolean
  error: Error | null
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
  const [state, setState] = useState<CollectionState<T>>({
    data: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        setState({
          data: snapshot.docs.map((document) => mapDoc(document.id, document.data())),
          loading: false,
          error: null,
        })
      },
      (error) => {
        setState({ data: [], loading: false, error })
      },
    )
    return unsubscribe
  }, [query, mapDoc])

  return state
}
