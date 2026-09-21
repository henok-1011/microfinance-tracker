import { useTranslation } from 'react-i18next'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-slate-200/80 ${className ?? ''}`}
    />
  )
}

/** Card-shaped placeholder shown while a collection is still loading. */
export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  const { t } = useTranslation()

  return (
    <div role="status" className="space-y-2">
      <span className="sr-only">{t('common.loading')}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="mt-2.5 h-3 w-1/2" />
        </div>
      ))}
    </div>
  )
}
