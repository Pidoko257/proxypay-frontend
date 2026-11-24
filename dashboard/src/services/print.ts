import { format } from 'date-fns'
import { Transaction } from './api'

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
})

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

const value = (input: string | number | undefined): string =>
  escapeHtml(String(input ?? '—'))

const date = (input?: string): string => {
  if (!input) return '—'
  const parsed = new Date(input)
  return Number.isNaN(parsed.getTime()) ? value(input) : format(parsed, 'PPpp')
}

const documentStyles = `
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { color: #111827; font: 14px Arial, sans-serif; margin: 0; }
  h1 { color: #2563eb; font-size: 24px; margin: 0; }
  h2 { font-size: 18px; margin: 24px 0 10px; }
  p { margin: 4px 0; }
  .header { border-bottom: 2px solid #2563eb; display: flex; justify-content: space-between; padding-bottom: 12px; }
  .muted { color: #4b5563; font-size: 12px; }
  .status { border-radius: 4px; display: inline-block; font-weight: 700; padding: 4px 8px; text-transform: capitalize; }
  .status-settled { background: #d1fae5; color: #065f46; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .status-failed { background: #fee2e2; color: #991b1b; }
  .summary { display: grid; gap: 10px; grid-template-columns: repeat(3, 1fr); margin: 18px 0; }
  .summary-card { background: #f3f4f6; border-radius: 5px; padding: 10px; }
  .summary-card strong { display: block; font-size: 18px; margin-top: 3px; }
  table { border-collapse: collapse; margin-top: 10px; width: 100%; }
  th { background: #eff6ff; color: #1e3a8a; text-align: left; }
  th, td { border-bottom: 1px solid #d1d5db; padding: 8px 6px; vertical-align: top; }
  .amount { text-align: right; white-space: nowrap; }
  .detail-grid { display: grid; gap: 12px 20px; grid-template-columns: 1fr 1fr; }
  .detail { border-bottom: 1px solid #e5e7eb; padding-bottom: 7px; }
  .label { color: #4b5563; display: block; font-size: 11px; font-weight: 700; margin-bottom: 2px; text-transform: uppercase; }
  .mono { font-family: monospace; overflow-wrap: anywhere; }
  .footer { border-top: 1px solid #d1d5db; color: #4b5563; font-size: 11px; margin-top: 28px; padding-top: 8px; }
  @media print { .no-print { display: none; } }
`

const openPrintWindow = (title: string, body: string): void => {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    throw new Error('Unable to open the print window. Please allow pop-ups and try again.')
  }

  printWindow.document.write(`<!doctype html>
    <html><head><title>${escapeHtml(title)}</title><style>${documentStyles}</style></head>
    <body>${body}<script>
      window.addEventListener('load', function () {
        window.focus();
        window.print();
      });
    </script></body></html>`)
  printWindow.document.close()
}

export const printTransactionReceipt = (transaction: Transaction): void => {
  const feeTotal = transaction.feeBreakdown.platformFee +
    transaction.feeBreakdown.networkFee +
    transaction.feeBreakdown.providerFee

  openPrintWindow(
    `Receipt - ${transaction.reference}`,
    `<div class="header">
      <div><h1>ProxyPay</h1><p class="muted">Transaction Receipt</p></div>
      <div class="muted">Generated ${date(new Date().toISOString())}</div>
    </div>
    <h2>Payment details</h2>
    <div class="detail-grid">
      <div class="detail"><span class="label">Reference</span><span class="mono">${value(transaction.reference)}</span></div>
      <div class="detail"><span class="label">Status</span><span class="status status-${value(transaction.status)}">${value(transaction.status)}</span></div>
      <div class="detail"><span class="label">Transaction ID</span><span class="mono">${value(transaction.id)}</span></div>
      <div class="detail"><span class="label">Provider</span>${value(transaction.provider.toUpperCase())}</div>
      <div class="detail"><span class="label">Created</span>${date(transaction.timestamp)}</div>
      <div class="detail"><span class="label">Settled</span>${date(transaction.settledAt)}</div>
      <div class="detail"><span class="label">Mobile money reference</span><span class="mono">${value(transaction.mobileMoneyReference)}</span></div>
      <div class="detail"><span class="label">Stellar transaction hash</span><span class="mono">${value(transaction.stellarHash)}</span></div>
    </div>
    <h2>Amount summary</h2>
    <table><tbody>
      <tr><td>Transaction amount</td><td class="amount">${currency.format(transaction.amount)}</td></tr>
      <tr><td>Platform fee</td><td class="amount">${currency.format(transaction.feeBreakdown.platformFee)}</td></tr>
      <tr><td>Network fee</td><td class="amount">${currency.format(transaction.feeBreakdown.networkFee)}</td></tr>
      <tr><td>Provider fee</td><td class="amount">${currency.format(transaction.feeBreakdown.providerFee)}</td></tr>
      <tr><th>Total fees</th><th class="amount">${currency.format(feeTotal || transaction.fee)}</th></tr>
    </tbody></table>
    ${transaction.failureReason ? `<p><strong>Failure reason:</strong> ${value(transaction.failureReason)}</p>` : ''}
    <div class="footer">This receipt was generated from the ProxyPay transaction dashboard.</div>`,
  )
}

export const printTransactionReport = (transactions: Transaction[]): void => {
  if (transactions.length === 0) {
    throw new Error('No transactions available for a report.')
  }

  const settled = transactions.filter((transaction) => transaction.status === 'settled')
  const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const totalFees = transactions.reduce((sum, transaction) => sum + transaction.fee, 0)

  const rows = transactions.map((transaction) => `<tr>
    <td class="mono">${value(transaction.reference)}</td>
    <td>${date(transaction.timestamp)}</td>
    <td><span class="status status-${value(transaction.status)}">${value(transaction.status)}</span></td>
    <td>${value(transaction.provider.toUpperCase())}</td>
    <td class="amount">${currency.format(transaction.amount)}</td>
    <td class="amount">${currency.format(transaction.fee)}</td>
  </tr>`).join('')

  openPrintWindow(
    'ProxyPay Transaction Report',
    `<div class="header">
      <div><h1>ProxyPay</h1><p class="muted">Transaction Report</p></div>
      <div class="muted">Generated ${date(new Date().toISOString())}</div>
    </div>
    <div class="summary">
      <div class="summary-card">Transactions<strong>${transactions.length}</strong></div>
      <div class="summary-card">Settled<strong>${settled.length}</strong></div>
      <div class="summary-card">Total amount<strong>${currency.format(totalAmount)}</strong></div>
    </div>
    <p class="muted">Total fees: ${currency.format(totalFees)}</p>
    <table><thead><tr><th>Reference</th><th>Date</th><th>Status</th><th>Provider</th><th class="amount">Amount</th><th class="amount">Fees</th></tr></thead>
    <tbody>${rows}</tbody></table>
    <div class="footer">This report includes the transactions currently loaded in the dashboard.</div>`,
  )
}
