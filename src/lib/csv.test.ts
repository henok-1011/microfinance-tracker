import { describe, expect, it } from 'vitest'

import { csvFile, toCsv } from '@/lib/csv'

describe('toCsv', () => {
  it('joins cells with commas and rows with CRLF', () => {
    expect(
      toCsv([
        ['Member', 'Paid'],
        ['Hana', 1500],
      ]),
    ).toBe('Member,Paid\r\nHana,1500')
  })

  it('quotes a field containing the delimiter', () => {
    expect(toCsv([['Hana, Bekele', 10]])).toBe('"Hana, Bekele",10')
  })

  it('doubles embedded quotes, per RFC 4180', () => {
    expect(toCsv([['"Quoted"', 10]])).toBe('"""Quoted""",10')
  })

  it('quotes a field containing a newline', () => {
    expect(toCsv([['line one\nline two', 10]])).toBe('"line one\nline two",10')
  })

  it('leaves plain fields unquoted and renders numbers as-is', () => {
    expect(toCsv([[1.5, 'plain']])).toBe('1.5,plain')
  })

  it('handles empty cells and an empty table', () => {
    expect(toCsv([['', 0]])).toBe(',0')
    expect(toCsv([])).toBe('')
  })
})

describe('csvFile', () => {
  it('leads with a BOM so spreadsheets read UTF-8', () => {
    const file = csvFile([['አባል', 100]])
    expect(file.startsWith('\uFEFF')).toBe(true)
    expect(file).toBe('\uFEFFአባል,100')
  })
})
