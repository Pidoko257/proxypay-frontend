import { Profiler, useState, useEffect } from 'react'
import { useTransactionStore } from './stores/transactionStore'
import { useFeatureFlagStore } from './stores/featureFlagStore'
import { TransactionsTable } from './components/TransactionsTable'
import { TransactionDrawer } from './components/TransactionDrawer'
import { ExportButton } from './components/ExportButton'
import { NotificationSettings } from './components/NotificationSettings'
import { FeatureFlagSettings } from './components/FeatureFlagSettings'
import { PerformanceDashboard } from './components/PerformanceDashboard'
import { DuplicateReview } from './components/DuplicateReview'
import { Transaction } from './services/api'
import { recordPerformanceMetric, startPerformanceMonitoring } from './services/performance'
import { TransactionMergeResult } from './services/duplicateDetection'
import './App.css'

type Page = 'transactions' | 'settings' | 'features' | 'performance'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('transactions')
  const {
    selectedTransaction,
    setSelectedTransaction,
    detailLoading,
    fetchTransactionDetail,
    fetchTransactions,
    filters,
    transactions,
  } = useTransactionStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const initializeFeatureFlags = useFeatureFlagStore((state) => state.initialize)

  useEffect(() => {
    initializeFeatureFlags()
    return startPerformanceMonitoring()
  }, [initializeFeatureFlags])

  const handleProfile = (_id: string, phase: string, actualDuration: number) => {
    recordPerformanceMetric('component-render', actualDuration, { component: 'dashboard-main', phase })
  }

  // Initialize transactions on mount
  useEffect(() => {
    fetchTransactions(filters)
  }, [])

  const handleRowClick = (tx: Transaction) => {
    setSelectedTransaction(tx)
    setDrawerOpen(true)
    void fetchTransactionDetail(tx.id)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setTimeout(() => setSelectedTransaction(null), 300) // Delay to allow animation
  }

  const handleMerged = (result: TransactionMergeResult) => {
    setSelectedTransaction(result.transaction)
    void fetchTransactions(filters)
  }

  return (
    <div className="app">
      {/* Header Navigation */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">ProxyPay Dashboard</h1>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${currentPage === 'transactions' ? 'active' : ''}`}
              onClick={() => setCurrentPage('transactions')}
            >
              Transactions
            </button>
            <button
              className={`nav-tab ${currentPage === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentPage('settings')}
            >
              Notification Settings
            </button>
            <button
              className={`nav-tab ${currentPage === 'features' ? 'active' : ''}`}
              onClick={() => setCurrentPage('features')}
            >
              Feature Flags
            </button>
            <button
              className={`nav-tab ${currentPage === 'performance' ? 'active' : ''}`}
              onClick={() => setCurrentPage('performance')}
            >
              Performance
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        <Profiler id="dashboard-main" onRender={handleProfile}>
          {currentPage === 'transactions' ? (
            <div className="transactions-page">
              <div className="page-header">
                <h2>Transaction History</h2>
                <ExportButton />
              </div>
              <TransactionsTable onRowClick={handleRowClick} loadOnMount={false} />
              <DuplicateReview transactions={transactions} onMerged={handleMerged} />
            </div>
          ) : currentPage === 'settings' ? (
            <div className="settings-page"><NotificationSettings /></div>
          ) : currentPage === 'features' ? (
            <div className="settings-page"><FeatureFlagSettings /></div>
          ) : (
            <div className="settings-page"><PerformanceDashboard /></div>
          )}
        </Profiler>
      </main>

      {/* Transaction Detail Drawer */}
      <TransactionDrawer
        transaction={selectedTransaction}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        loading={detailLoading}
      />
    </div>
  )
}
