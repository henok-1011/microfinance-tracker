import { useCallback, useMemo, useState } from 'react'

/** Rows per page: the app shell is phone-width, so a short page beats a long scroll. */
export const DEFAULT_PAGE_SIZE = 10

export interface Pagination<T> {
  page: number
  pageCount: number
  pageItems: T[]
  total: number
  /** 1-based index of the first row on this page, or 0 when there are none. */
  from: number
  to: number
  canPrevious: boolean
  canNext: boolean
  previous: () => void
  next: () => void
}

/**
 * Slices a list for display and tracks the current page.
 *
 * The requested page is clamped against the page count on every render rather
 * than corrected in an effect. When the data shrinks — a new reporting period, a
 * deleted entry — the view simply follows it, with no render that briefly shows
 * an out-of-range page.
 */
export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE): Pagination<T> {
  const [requestedPage, setRequestedPage] = useState(1)

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const page = Math.min(Math.max(1, requestedPage), pageCount)

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [items, page, pageSize])

  const previous = useCallback(() => {
    setRequestedPage((current) => Math.max(1, current - 1))
  }, [])

  const next = useCallback(() => {
    setRequestedPage((current) => Math.min(pageCount, current + 1))
  }, [pageCount])

  return {
    page,
    pageCount,
    pageItems,
    total: items.length,
    from: items.length === 0 ? 0 : (page - 1) * pageSize + 1,
    to: Math.min(page * pageSize, items.length),
    canPrevious: page > 1,
    canNext: page < pageCount,
    previous,
    next,
  }
}
