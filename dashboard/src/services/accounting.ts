import { Transaction } from './api'

export type AccountingPlatform = 'quickbooks' | 'xero' | 'generic'

const escapeCsvValue = (value: string): string => {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

const toCsv = (headers: string[], rows: Array<Array<string | number>>): string =>
  [headers, ...rows].map((row) => row.map((value) => escapeCsvValue(String(value))).join(',')).join('\n')

const transactionDate = (timestamp: string): string => timestamp.slice(0, 10)

/**
 * Generates CSV files using the import columns expected by common accounting tools.
 * These files can be imported without exposing credentials or requiring a server-side
 * accounting connection.
 */
export const generateAccountingCSV = (
  transactions: Transaction[],
  platform: AccountingPlatform
): string => {
  if (platform === 'quickbooks') {
    return toCsv(
      ['Date', 'Transaction Type', 'Name', 'Memo', 'Account', 'Amount', 'Reference'],
      transactions.map((tx) => [
        transactionDate(tx.settledAt || tx.timestamp),
        'Sales Receipt',
        tx.provider.toUpperCase(),
        `ProxyPay transaction ${tx.reference}`,
        'ProxyPay',
        tx.amount,
        tx.reference,
      ])
    )
  }

  if (platform === 'xero') {
    return toCsv(
      ['Date', 'Amount', 'Payee', 'Description', 'Reference'],
      transactions.map((tx) => [
        transactionDate(tx.settledAt || tx.timestamp),
        tx.amount,
        tx.provider.toUpperCase(),
        `ProxyPay transaction ${tx.reference}`,
        tx.reference,
      ])
    )
  }

  return toCsv(
    ['Date', 'Reference', 'Description', 'Amount', 'Currency', 'Status', 'Provider'],
    transactions.map((tx) => [
      transactionDate(tx.settledAt || tx.timestamp),
      tx.reference,
      `ProxyPay transaction ${tx.reference}`,
      tx.amount,
      'USD',
      tx.status,
      tx.provider,
    ])
  )
}

export const accountingFilename = (platform: AccountingPlatform): string => {
  const names: Record<AccountingPlatform, string> = {
    quickbooks: 'quickbooks_transactions',
    xero: 'xero_transactions',
    generic: 'accounting_transactions',
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${names[platform]}_${timestamp}.csv`
}
