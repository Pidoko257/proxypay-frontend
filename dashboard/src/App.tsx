import { useState, useEffect } from 'react'
import { useTransactionStore } from './stores/transactionStore'
import { TransactionsTable } from './components/TransactionsTable'
import { TransactionDrawer } from './components/TransactionDrawer'
import { ExportButton } from './components/ExportButton'
import { NotificationSettings } from './components/NotificationSettings'
import { SessionExpirationDialog } from './components/SessionExpirationDialog'
import { useSessionExpiration } from './hooks/useSessionExpiration'
import './App.css'

type Page = 'transactions' | 'settings'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('transactions')
  const {
    selectedTransaction,
    detailLoading,
    detailError,
    setSelectedTransaction,
    fetchTransactionDetail,
    fetchTransactions,
    filters,
  } = useTransactionStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const handleSessionExpired = () => {
    window.location.reload()
  }
  const { showWarning, secondsRemaining, extendSession, signOut } =
    useSessionExpiration(handleSessionExpired)

  // Initialize transactions on mount
  useEffect(() => {
    fetchTransactions(filters)
  }, [])

  const handleRowClick = (tx: Parameters<typeof setSelectedTransaction>[0]) => {
    if (!tx) return
    setSelectedTransaction(tx)
    setDrawerOpen(true)
    void fetchTransactionDetail(tx.id)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setTimeout(() => setSelectedTransaction(null), 300) // Delay to allow animation
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
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {currentPage === 'transactions' ? (
          <div className="transactions-page">
            <div className="page-header">
              <h2>Transaction History</h2>
              <ExportButton />
            </div>
            <TransactionsTable onRowClick={handleRowClick} />
          </div>
        ) : (
          <div className="settings-page">
            <NotificationSettings />
          </div>
        )}
      </main>

      {/* Transaction Detail Drawer */}
      <TransactionDrawer
        transaction={selectedTransaction}
        isOpen={drawerOpen}
        loading={detailLoading}
        error={detailError}
        onClose={handleDrawerClose}
      />
      {showWarning && (
        <SessionExpirationDialog
          secondsRemaining={secondsRemaining}
          onExtend={() => void extendSession()}
          onSignOut={signOut}
        />
      )}
    </div>
  )
}
