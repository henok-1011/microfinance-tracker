import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { usePagination } from '@/lib/hooks/usePagination'

function items(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1)
}

describe('usePagination', () => {
  it('slices the list into pages', () => {
    const { result } = renderHook(() => usePagination(items(25), 10))

    expect(result.current.page).toBe(1)
    expect(result.current.pageCount).toBe(3)
    expect(result.current.total).toBe(25)
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(result.current.from).toBe(1)
    expect(result.current.to).toBe(10)
    expect(result.current.canPrevious).toBe(false)
    expect(result.current.canNext).toBe(true)
  })

  it('advances and retreats, stopping at both ends', () => {
    const { result } = renderHook(() => usePagination(items(25), 10))

    act(() => result.current.next())
    expect(result.current.page).toBe(2)
    expect(result.current.pageItems[0]).toBe(11)
    expect(result.current.from).toBe(11)
    expect(result.current.to).toBe(20)

    act(() => result.current.next())
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25])
    expect(result.current.to).toBe(25)
    expect(result.current.canNext).toBe(false)

    // Already on the last page: next does nothing rather than overflowing.
    act(() => result.current.next())
    expect(result.current.page).toBe(3)

    act(() => result.current.previous())
    act(() => result.current.previous())
    expect(result.current.page).toBe(1)
    act(() => result.current.previous())
    expect(result.current.page).toBe(1)
  })

  it('clamps back when the list shrinks under the current page', () => {
    const { result, rerender } = renderHook(({ list }) => usePagination(list, 10), {
      initialProps: { list: items(25) },
    })

    act(() => result.current.next())
    act(() => result.current.next())
    expect(result.current.page).toBe(3)

    // A new reporting period with fewer entries must not leave the user on a
    // page that no longer exists.
    rerender({ list: items(5) })
    expect(result.current.page).toBe(1)
    expect(result.current.pageItems).toEqual([1, 2, 3, 4, 5])
    expect(result.current.pageCount).toBe(1)
  })

  it('handles an empty list without inventing a page', () => {
    const { result } = renderHook(() => usePagination([], 10))

    expect(result.current.pageCount).toBe(1)
    expect(result.current.pageItems).toEqual([])
    expect(result.current.from).toBe(0)
    expect(result.current.to).toBe(0)
    expect(result.current.canPrevious).toBe(false)
    expect(result.current.canNext).toBe(false)
  })

  it('fits a list shorter than one page', () => {
    const { result } = renderHook(() => usePagination(items(3), 10))

    expect(result.current.pageCount).toBe(1)
    expect(result.current.pageItems).toEqual([1, 2, 3])
    expect(result.current.from).toBe(1)
    expect(result.current.to).toBe(3)
  })
})
