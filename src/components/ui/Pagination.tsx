import { useTranslation } from 'react-i18next'

import type { Pagination as PaginationState } from '@/lib/hooks/usePagination'

const buttonClass =
  'min-h-11 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40'

interface PaginationProps {
  /** Straight from `usePagination`. */
  pagination: PaginationState<unknown>
  /** Shown to the left, e.g. "12 entries". */
  label: string
}

/**
 * Page controls for a table. Renders nothing for an empty list, so a screen
 * reader hears no controls rather than a lone "Page 1 of 1".
 */
export function Pagination({ pagination, label }: PaginationProps) {
  const { t } = useTranslation()

  const { page, pageCount, from, to, total, canPrevious, canNext, previous, next } = pagination

  if (total === 0) return null

  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <p className="min-w-0 truncate text-xs text-slate-500">
        {label} · {from}–{to}
      </p>

      {pageCount > 1 ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={previous}
            disabled={!canPrevious}
            className={buttonClass}
            aria-label={t('common.pagination.previous')}
          >
            {t('common.pagination.previous')}
          </button>
          <span className="text-xs tabular-nums text-slate-600" aria-live="polite">
            {t('common.pagination.page', { page, total: pageCount })}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={!canNext}
            className={buttonClass}
            aria-label={t('common.pagination.next')}
          >
            {t('common.pagination.next')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
