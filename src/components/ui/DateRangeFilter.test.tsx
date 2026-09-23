import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { yearRange, yearToDateRange, type DateRange } from '@/lib/calc'
import { todayIso } from '@/lib/clock'

/** Wrapper that surfaces the committed range, so gating is observable. */
function Harness({ initial }: { initial: DateRange }) {
  const [range, setRange] = useState(initial)
  return (
    <>
      <DateRangeFilter range={range} onChange={setRange} />
      <p data-testid="committed">
        {range.from}..{range.to}
      </p>
    </>
  )
}

const INITIAL: DateRange = { from: '2026-01-01', to: '2026-06-30' }

beforeAll(async () => {
  await i18n.changeLanguage('en')
})

describe('DateRangeFilter', () => {
  it('shows the committed bounds', () => {
    render(<Harness initial={INITIAL} />)
    expect(screen.getByLabelText('From')).toHaveValue('2026-01-01')
    expect(screen.getByLabelText('To')).toHaveValue('2026-06-30')
  })

  it('commits a usable edit', () => {
    render(<Harness initial={INITIAL} />)
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-07-31' } })
    expect(screen.getByTestId('committed')).toHaveTextContent('2026-01-01..2026-07-31')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('holds an inverted edit locally instead of committing it', () => {
    render(<Harness initial={INITIAL} />)
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2025-01-01' } })

    // The report below keeps the last usable range while the edit is visible.
    expect(screen.getByTestId('committed')).toHaveTextContent('2026-01-01..2026-06-30')
    expect(screen.getByLabelText('To')).toHaveValue('2025-01-01')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The start date must be on or before the end date.',
    )
  })

  it('recovers through a preset after an unusable edit', () => {
    render(<Harness initial={INITIAL} />)
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '' } })
    expect(screen.getByRole('alert')).toBeInTheDocument()

    const thisYear = yearRange(Number(todayIso().slice(0, 4)))
    fireEvent.click(screen.getByRole('button', { name: 'This year' }))
    expect(screen.getByTestId('committed')).toHaveTextContent(`${thisYear.from}..${thisYear.to}`)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('marks the preset that matches the committed range', () => {
    const yearToDate = yearToDateRange(todayIso())
    render(<Harness initial={yearToDate} />)
    expect(screen.getByRole('button', { name: 'Year to date' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'This year' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })
})
