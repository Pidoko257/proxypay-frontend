import React from 'react'
import { SkeletonTableRow } from './Skeleton'
import '../styles/Skeleton.css'

interface TransactionTableSkeletonProps {
  rows?: number
}

/**
 * Skeleton screen for transaction table
 * Displays loading state with table structure
 * Prevents layout shift while data is being fetched
 */
export const TransactionTableSkeleton: React.FC<TransactionTableSkeletonProps> = ({
  rows = 5,
}) => {
  return (
    <div className="transactions-table-container">
      <table className="transactions-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Amount</th>
            <th>Status</th>
            <th>Provider</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <SkeletonTableRow key={i} columns={6} className="skeleton-loading" />
          ))}
        </tbody>
      </table>
    </div>
  )
}
