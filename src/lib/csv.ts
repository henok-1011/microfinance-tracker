export type CsvCell = string | number

/** Spreadsheets guess the wrong encoding without a BOM, which mangles Amharic. */
const UTF8_BOM = '\uFEFF'

/** RFC 4180: a field is quoted when it contains a delimiter, quote or newline. */
const NEEDS_QUOTING = /[",\r\n]/

function escapeField(value: CsvCell): string {
  const text = String(value)
  return NEEDS_QUOTING.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/** Encodes rows as comma-separated CSV with CRLF line endings. */
export function toCsv(rows: CsvCell[][]): string {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n')
}

/** The full file payload: BOM plus encoded rows. */
export function csvFile(rows: CsvCell[][]): string {
  return UTF8_BOM + toCsv(rows)
}

/** Downloads rows as a `.csv` file, client-side. */
export function downloadCsv(filename: string, rows: CsvCell[][]): void {
  const blob = new Blob([csvFile(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
