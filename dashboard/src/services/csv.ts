import { Transaction } from './api'

export interface ExportOptions {
  filename?: string
  includeAuditTrail?: boolean
}

/**
 * Converts transaction data to CSV format
 * Respects active filters and handles large datasets
 */
export class CSVExporter {
  static generateCSV(
    transactions: Transaction[],
    includeAuditTrail: boolean = false
  ): string {
    if (transactions.length === 0) {
      return ''
    }

    // Define column headers
    const headers = [
      'ID',
      'Reference',
      'Stellar Hash',
      'Mobile Money Reference',
      'Amount',
      'Fee',
      'Platform Fee',
      'Network Fee',
      'Provider Fee',
      'Status',
      'Provider',
      'Timestamp',
      'Settled At',
      'Failure Reason',
    ]

    if (includeAuditTrail) {
      headers.push('Audit Trail')
    }

    // Build CSV rows
    const rows: string[] = [headers.map(h => this.escapeCsvValue(h)).join(',')]

    for (const tx of transactions) {
      const row = [
        tx.id,
        tx.reference,
        tx.stellarHash,
        tx.mobileMoneyReference,
        tx.amount,
        tx.fee,
        tx.feeBreakdown.platformFee,
        tx.feeBreakdown.networkFee,
        tx.feeBreakdown.providerFee,
        tx.status,
        tx.provider,
        tx.timestamp,
        tx.settledAt || '',
        tx.failureReason || '',
      ]

      if (includeAuditTrail) {
        const auditStr = tx.auditTrail
          .map(
            (e) =>
              `[${e.timestamp}] ${e.event}: ${e.details} (${e.actor})`
          )
          .join('; ')
        row.push(auditStr)
      }

      rows.push(row.map((v) => this.escapeCsvValue(String(v))).join(','))
    }

    return rows.join('\n')
  }

  static downloadCSV(
    csvContent: string,
    filename: string = 'transactions.csv'
  ): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)

    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  /**
   * Escapes CSV values to handle commas, quotes, and newlines
   */
  private static escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"` // Escape quotes by doubling
    }
    return value
  }

  /**
   * Generates a timestamp-based filename
   */
  static generateFilename(prefix: string = 'transactions'): string {
    const now = new Date()
    const timestamp = now.toISOString().split('T')[0] // YYYY-MM-DD format
    const time = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS format
    return `${prefix}_${timestamp}_${time}.csv`
  }
}
