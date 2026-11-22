/**
 * CSV parser for importing external transaction records during reconciliation.
 * Handles quoted fields, commas inside quotes, and flexible header names.
 */

export interface ExternalRecord {
  reference: string
  amount: number
  status: string
  date: string
  /** Any extra columns from the file preserved as-is */
  raw: Record<string, string>
}

export interface ParseResult {
  records: ExternalRecord[]
  errors: string[]
  totalRows: number
}

const AMOUNT_HEADERS = ['amount', 'amt', 'value', 'total']
const REFERENCE_HEADERS = ['reference', 'ref', 'id', 'transaction_id', 'txn_id', 'txid']
const STATUS_HEADERS = ['status', 'state', 'result']
const DATE_HEADERS = ['date', 'timestamp', 'created_at', 'time', 'datetime']

function normalise(header: string): string {
  return header.toLowerCase().trim().replace(/\s+/g, '_')
}

function findHeader(headers: string[], candidates: string[]): string | undefined {
  return headers.find((h) => candidates.includes(normalise(h)))
}

/**
 * Parses a single CSV string into rows.  Handles RFC-4180 quoting.
 */
export function parseCSVRows(csv: string): string[][] {
  const rows: string[][] = []
  const lines = csv.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const line of lines) {
    if (line.trim() === '') continue
    const cells: string[] = []
    let current = ''
    let inQuote = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') {
          // Escaped quote
          current += '"'
          i++
        } else {
          inQuote = !inQuote
        }
      } else if (ch === ',' && !inQuote) {
        cells.push(current)
        current = ''
      } else {
        current += ch
      }
    }
    cells.push(current)
    rows.push(cells)
  }
  return rows
}

/**
 * Parses a CSV string into ExternalRecord objects.
 * Returns matched records plus any parsing errors.
 */
export function parseExternalCSV(csvContent: string): ParseResult {
  const rows = parseCSVRows(csvContent)
  if (rows.length === 0) {
    return { records: [], errors: ['File is empty'], totalRows: 0 }
  }

  const headerRow = rows[0].map((h) => h.trim())
  const dataRows = rows.slice(1)

  const refHeader = findHeader(headerRow, REFERENCE_HEADERS)
  const amtHeader = findHeader(headerRow, AMOUNT_HEADERS)
  const statusHeader = findHeader(headerRow, STATUS_HEADERS)
  const dateHeader = findHeader(headerRow, DATE_HEADERS)

  const errors: string[] = []

  if (!refHeader) errors.push('Could not detect a reference/ID column')
  if (!amtHeader) errors.push('Could not detect an amount column')

  if (!refHeader || !amtHeader) {
    return { records: [], errors, totalRows: dataRows.length }
  }

  const refIdx = headerRow.indexOf(refHeader)
  const amtIdx = headerRow.indexOf(amtHeader)
  const statusIdx = statusHeader !== undefined ? headerRow.indexOf(statusHeader) : -1
  const dateIdx = dateHeader !== undefined ? headerRow.indexOf(dateHeader) : -1

  const records: ExternalRecord[] = []

  dataRows.forEach((row, i) => {
    if (row.every((c) => c.trim() === '')) return

    const rawAmt = row[amtIdx]?.trim() ?? ''
    const amount = parseFloat(rawAmt.replace(/[^0-9.-]/g, ''))

    if (isNaN(amount)) {
      errors.push(`Row ${i + 2}: invalid amount "${rawAmt}"`)
      return
    }

    const raw: Record<string, string> = {}
    headerRow.forEach((h, idx) => {
      raw[h] = row[idx]?.trim() ?? ''
    })

    records.push({
      reference: row[refIdx]?.trim() ?? '',
      amount,
      status: statusIdx >= 0 ? row[statusIdx]?.trim() ?? '' : '',
      date: dateIdx >= 0 ? row[dateIdx]?.trim() ?? '' : '',
      raw,
    })
  })

  return { records, errors, totalRows: dataRows.length }
}
