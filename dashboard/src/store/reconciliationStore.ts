import { create } from 'zustand';
import type { DashboardTransaction, ExternalRecord, ReconciliationResult } from '../types';

interface ReconciliationState {
  externalRecords: ExternalRecord[];
  dashboardTransactions: DashboardTransaction[];
  result: ReconciliationResult | null;
  isLoading: boolean;
  error: string | null;
  setExternalRecords: (records: ExternalRecord[]) => void;
  setDashboardTransactions: (txs: DashboardTransaction[]) => void;
  reconcile: () => void;
  reset: () => void;
}

function reconcileRecords(
  externalRecords: ExternalRecord[],
  dashboardTransactions: DashboardTransaction[]
): ReconciliationResult {
  const matched: ReconciliationResult['matched'] = [];
  const discrepancies: ReconciliationResult['discrepancies'] = [];
  const unmatchedExternal: ExternalRecord[] = [];
  const unmatchedDashboard: DashboardTransaction[] = [];

  const dashByReference = new Map<string, DashboardTransaction>();
  for (const tx of dashboardTransactions) {
    dashByReference.set(tx.reference.toLowerCase().trim(), tx);
  }

  const matchedRefs = new Set<string>();

  for (const ext of externalRecords) {
    const key = ext.reference.toLowerCase().trim();
    const dashTx = dashByReference.get(key);

    if (!dashTx) {
      unmatchedExternal.push(ext);
      continue;
    }

    matchedRefs.add(key);

    const amountMatches = Math.abs(ext.amount - dashTx.amount) < 0.01;
    const statusMatches =
      !ext.status ||
      !dashTx.status ||
      ext.status.toLowerCase() === dashTx.status.toLowerCase();

    if (amountMatches && statusMatches) {
      matched.push({ external: ext, dashboard: dashTx });
    } else {
      discrepancies.push({
        external: ext,
        dashboard: dashTx,
        amountMatches,
        statusMatches,
      });
    }
  }

  for (const tx of dashboardTransactions) {
    const key = tx.reference.toLowerCase().trim();
    if (!matchedRefs.has(key)) {
      unmatchedDashboard.push(tx);
    }
  }

  return {
    matched,
    discrepancies,
    unmatchedExternal,
    unmatchedDashboard,
    summary: {
      totalExternal: externalRecords.length,
      totalDashboard: dashboardTransactions.length,
      matchedCount: matched.length,
      discrepancyCount: discrepancies.length,
      unmatchedExternalCount: unmatchedExternal.length,
      unmatchedDashboardCount: unmatchedDashboard.length,
    },
  };
}

export const useReconciliationStore = create<ReconciliationState>((set, get) => ({
  externalRecords: [],
  dashboardTransactions: [],
  result: null,
  isLoading: false,
  error: null,

  setExternalRecords: (records) => set({ externalRecords: records }),
  setDashboardTransactions: (txs) => set({ dashboardTransactions: txs }),

  reconcile: () => {
    const { externalRecords, dashboardTransactions } = get();
    set({ isLoading: true, error: null });
    try {
      const result = reconcileRecords(externalRecords, dashboardTransactions);
      set({ result, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Reconciliation failed',
        isLoading: false,
      });
    }
  },

  reset: () =>
    set({
      externalRecords: [],
      dashboardTransactions: [],
      result: null,
      isLoading: false,
      error: null,
    }),
}));
