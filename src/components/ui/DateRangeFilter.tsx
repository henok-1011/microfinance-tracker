import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { isValidRange, yearRange, yearToDateRange, type DateRange } from '@/lib/calc'
import { todayIso } from '@/lib/clock'

const inputClass =
  'mt-1 min-h-11 w-full rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700'

interface DateRangeFilterProps {
  range: DateRange
  onChange: (range: DateRange) => void
}

function sameRange(a: DateRange, b: DateRange): boolean {
  return a.from === b.from && a.to === b.to
}

/**
 * Period picker for the reports.
 *
 * Edits are held locally until both bounds are usable, so half-typed dates never
 * blank out the report below — only a valid range reaches `onChange`.
 */
export function DateRangeFilter({ range, onChange }: DateRangeFilterProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState<DateRange | null>(null)

  const shown = draft ?? range
  const valid = isValidRange(shown)
  const today = todayIso()

  const presets = [
    { key: 'thisYear', range: yearRange(Number(today.slice(0, 4))) },
    { key: 'yearToDate', range: yearToDateRange(today) },
  ]

  function update(patch: Partial<DateRange>) {
    const next = { ...shown, ...patch }
    if (isValidRange(next)) {
      setDraft(null)
      onChange(next)
      return
    }
    setDraft(next)
  }

  return (
    <section
      aria-label={t('reports.range.label')}
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
    >
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs font-medium text-slate-600">
          {t('reports.range.from')}
          <input
            type="date"
            value={shown.from}
            max={shown.to || undefined}
            onChange={(event) => update({ from: event.target.value })}
            className={inputClass}
          />
        </label>

        <label className="block text-xs font-medium text-slate-600">
          {t('reports.range.to')}
          <input
            type="date"
            value={shown.to}
            min={shown.from || undefined}
            onChange={(event) => update({ to: event.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.key}
            type="button"
            aria-pressed={sameRange(preset.range, range)}
            onClick={() => {
              setDraft(null)
              onChange(preset.range)
            }}
            className="min-h-11 rounded-md border border-slate-200 px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 aria-pressed:border-brand-300 aria-pressed:bg-brand-50 aria-pressed:text-brand-700"
          >
            {t(`reports.range.${preset.key}`)}
          </button>
        ))}
      </div>

      {!valid ? (
        <p role="alert" className="mt-2 text-xs font-medium text-red-600">
          {t('reports.range.invalid')}
        </p>
      ) : null}
    </section>
  )
}
