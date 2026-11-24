import { create } from 'zustand'
import { Transaction } from '../services/api'
import { ExternalRecord, ParseResult, parseExternalCSV } from '../services/csvParser'

/** Tolerance used for amount comparison (0.01 = 1 cent) */
const AMOUNT_TOLERANCE = 0.01

export type ReconciliationStatus = 'matched' | 'unmatched_external' | 'unmatched_dashboard' | 'discrepancy'

export interface ReconciliationResult {
  id: string
  status: ReconciliationStatus
  /** External record – undefined when status is unmatched_dashboard */
  externalRecord?: ExternalRecord
  /** Dashboard transaction – undefined when status is unmatched_external */
  dashboardTransaction?: Transaction
  /** Human-readable description of discrepancies */
  discrepancies: string[]
}

export type ReconciliationFilter = 'all' | ReconciliationStatus

interface ReconciliationStore {
  // Upload state
  fileName: string | null
  parseResult: ParseResult | null
  isUploading: boolean

  // Results
  results: ReconciliationResult[]
  activeFilter: ReconciliationFilter

  // Actions
  uploadFile: (file: File) => Promise<void>
  runReconciliation: (transactions: Transaction[]) => void
  setFilter: (filter: ReconciliationFilter) => void
  reset: () => void
}

/**
 * Core reconciliation matching algorithm.
 * Matches by reference (case-insensitive), then checks amount and status.
 */
export function reconcileRecords(
  external: ExternalRecord[],
  dashboard: Transaction[]
): ReconciliationResult[] {
  const results: ReconciliationResult[] = []
  const matchedDashboardIds = new Set<string>()

  // Build a lookup map from reference → dashboard transaction
  const dashboardByRef = new Map<string, Transaction>()
  for (const tx of dashboard) {
    dashboardByRef.set(tx.reference.toLowerCase().trim(), tx)
  }

  // Process every external record
  for (const ext of external) {
    const key = ext.reference.toLowerCase().trim()
    const dashTx = dashboardByRef.get(key)

    if (!dashTx) {
      results.push({
        id: `ext-${ext.reference}`,
        status: 'unmatched_external',
        externalRecord: ext,
        discrepancies: ['No matching transaction found in dashboard'],
      })
      continue
    }

    matchedDashboardIds.add(dashTx.id)

    const discrepancies: string[] = []

    const amtDiff = Math.abs(ext.amount - dashTx.amount)
    if (amtDiff > AMOUNT_TOLERANCE) {
      discrepancies.push(
        `Amount mismatch: external $${ext.amount.toFixed(2)} vs dashboard $${dashTx.amount.toFixed(2)}`
      )
    }

    if (ext.status && ext.status.toLowerCase() !== dashTx.status.toLowerCase()) {
      discrepancies.push(
        `Status mismatch: external "${ext.status}" vs dashboard "${dashTx.status}"`
      )
    }

    results.push({
      id: `rec-${dashTx.id}`,
      status: discrepancies.length > 0 ? 'discrepancy' : 'matched',
      externalRecord: ext,
      dashboardTransaction: dashTx,
      discrepancies,
    })
  }

  // Any dashboard transaction not matched by an external record
  for (const tx of dashboard) {
    if (!matchedDashboardIds.has(tx.id)) {
      results.push({
        id: `dash-${tx.id}`,
        status: 'unmatched_dashboard',
        dashboardTransaction: tx,
        discrepancies: ['Transaction exists in dashboard but not in external file'],
      })
    }
  }

  return results
}

export const useReconciliationStore = create<ReconciliationStore>((set, get) => ({
  fileName: null,
  parseResult: null,
  isUploading: false,
  results: [],
  activeFilter: 'all',

  uploadFile: async (file: File) => {
    set({ isUploading: true })
    const text = await file.text()
    const parseResult = parseExternalCSV(text)
    set({ parseResult, fileName: file.name, isUploading: false })
  },

  runReconciliation: (transactions: Transaction[]) => {
    const { parseResult } = get()
    if (!parseResult) return
    const results = reconcileRecords(parseResult.records, transactions)
    set({ results, activeFilter: 'all' })
  },

  setFilter: (filter: ReconciliationFilter) => {
    set({ activeFilter: filter })
  },

  reset: () => {
    set({
      fileName: null,
      parseResult: null,
      isUploading: false,
      results: [],
      activeFilter: 'all',
    })
  },
}))
