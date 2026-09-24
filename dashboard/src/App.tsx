import { useState, useEffect } from 'react'
import { useTransactionStore } from './stores/transactionStore'
import { TransactionsTable } from './components/TransactionsTable'
import { TransactionDrawer } from './components/TransactionDrawer'
import { ExportButton } from './components/ExportButton'
import { NotificationSettings } from './components/NotificationSettings'
import { NotificationCenter } from './components/NotificationCenter'
import { canAccess } from './auth/access'
import './App.css'

type Page = 'transactions' | 'settings'

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('transactions')
  const { selectedTransaction, setSelectedTransaction, fetchTransactions, filters } =
    useTransactionStore()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [fullPageTransaction, setFullPageTransaction] = useState(false)
  const canManageNotifications = canAccess('notification-settings')

  // Initialize transactions on mount
  useEffect(() => {
    fetchTransactions(filters)
  }, [])

  const handleRowClick = (tx: any) => {
    setSelectedTransaction(tx)
    setFullPageTransaction(false)
    setDrawerOpen(true)
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    setFullPageTransaction(false)
    setTimeout(() => setSelectedTransaction(null), 300) // Delay to allow animation
  }

  return (
    <div className="app">
      {/* Header Navigation */}
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">ProxyPay Dashboard</h1>
          <NotificationCenter />
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${currentPage === 'transactions' ? 'active' : ''}`}
              onClick={() => setCurrentPage('transactions')}
            >
              Transactions
            </button>
            {canManageNotifications && (
              <button
                className={`nav-tab ${currentPage === 'settings' ? 'active' : ''}`}
                onClick={() => setCurrentPage('settings')}
              >
                Notification Settings
              </button>
            )}
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
        ) : canManageNotifications ? (
          <div className="settings-page">
            <NotificationSettings />
          </div>
        ) : null
        )}
      </main>

      {/* Transaction Detail Drawer */}
      <TransactionDrawer
        transaction={selectedTransaction}
        isOpen={drawerOpen}
        onClose={handleDrawerClose}
        fullPage={fullPageTransaction}
        onOpenFullPage={() => setFullPageTransaction(true)}
      />
    </div>
  )
}
