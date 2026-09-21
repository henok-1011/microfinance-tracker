import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

/** Next year plus the recent past, which is all the app is expected to need. */
function recentYears(span = 2): number[] {
  const current = new Date().getFullYear()
  return Array.from({ length: span + 2 }, (_, index) => current + 1 - index)
}

interface YearSelectProps {
  value: number
  onChange: (year: number) => void
  years?: number[]
}

export function YearSelect({ value, onChange, years }: YearSelectProps) {
  const { t } = useTranslation()

  const options = useMemo(() => {
    const base = years ?? recentYears()
    return base.includes(value) ? base : [value, ...base]
  }, [years, value])

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
      {t('common.year')}
      <select
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}
