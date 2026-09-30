import { describe, it, expect } from 'vitest'
import { parseCSVRows, parseExternalCSV } from '../csvParser'

// ─── parseCSVRows ─────────────────────────────────────────────────────────────

describe('parseCSVRows', () => {
  it('splits a simple CSV into rows and cells', () => {
    const input = 'a,b,c\n1,2,3'
    expect(parseCSVRows(input)).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted fields containing commas', () => {
    const input = '"hello, world",2'
    expect(parseCSVRows(input)).toEqual([['hello, world', '2']])
  })

  it('handles escaped double-quotes inside a quoted field', () => {
    const input = '"say ""hi""",ok'
    expect(parseCSVRows(input)).toEqual([['say "hi"', 'ok']])
  })

  it('skips blank lines', () => {
    const input = 'a,b\n\n1,2\n'
    expect(parseCSVRows(input)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('handles Windows-style CRLF line endings', () => {
    const input = 'a,b\r\n1,2'
    expect(parseCSVRows(input)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

// ─── parseExternalCSV ─────────────────────────────────────────────────────────

describe('parseExternalCSV', () => {
  const baseCSV = `reference,amount,status,date
REF001,100.00,settled,2024-01-01
REF002,200.50,pending,2024-01-02`

  it('parses a well-formed CSV into ExternalRecords', () => {
    const result = parseExternalCSV(baseCSV)
    expect(result.errors).toHaveLength(0)
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toMatchObject({
      reference: 'REF001',
      amount: 100,
      status: 'settled',
      date: '2024-01-01',
    })
    expect(result.records[1]).toMatchObject({
      reference: 'REF002',
      amount: 200.5,
      status: 'pending',
    })
  })

  it('accepts alternate header names (ref, amt)', () => {
    const csv = `ref,amt\nR1,55.00`
    const result = parseExternalCSV(csv)
    expect(result.errors).toHaveLength(0)
    expect(result.records[0].reference).toBe('R1')
    expect(result.records[0].amount).toBe(55)
  })

  it('strips currency symbols from amounts', () => {
    const csv = `reference,amount\nREF001,$1,234.56`
    // Note: the comma inside the amount would normally split – so wrap in quotes
    const csv2 = `reference,amount\nREF001,"$1234.56"`
    const result = parseExternalCSV(csv2)
    expect(result.records[0].amount).toBe(1234.56)
  })

  it('returns an error when reference column is missing', () => {
    const csv = `amount,status\n100,settled`
    const result = parseExternalCSV(csv)
    expect(result.errors.some((e) => /reference/i.test(e))).toBe(true)
    expect(result.records).toHaveLength(0)
  })

  it('returns an error when amount column is missing', () => {
    const csv = `reference,status\nREF001,settled`
    const result = parseExternalCSV(csv)
    expect(result.errors.some((e) => /amount/i.test(e))).toBe(true)
    expect(result.records).toHaveLength(0)
  })

  it('records a row-level error for an invalid amount and skips that row', () => {
    const csv = `reference,amount\nREF001,not-a-number\nREF002,50.00`
    const result = parseExternalCSV(csv)
    expect(result.errors.length).toBeGreaterThan(0)
    // The invalid row is skipped; the valid row is still parsed
    expect(result.records).toHaveLength(1)
    expect(result.records[0].reference).toBe('REF002')
  })

  it('handles an empty file gracefully', () => {
    const result = parseExternalCSV('')
    expect(result.records).toHaveLength(0)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('populates the raw field with all original column values', () => {
    const result = parseExternalCSV(baseCSV)
    expect(result.records[0].raw).toMatchObject({
      reference: 'REF001',
      amount: '100.00',
      status: 'settled',
    })
  })

  it('sets totalRows based on data rows (excluding header)', () => {
    const result = parseExternalCSV(baseCSV)
    expect(result.totalRows).toBe(2)
  })
})
