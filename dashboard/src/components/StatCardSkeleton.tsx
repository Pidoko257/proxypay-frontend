import React from 'react'
import { SkeletonCard } from './Skeleton'
import '../styles/Skeleton.css'

interface StatCardSkeletonProps {
  count?: number
}

/**
 * Skeleton screen for stat cards
 * Used for dashboard widgets, rate cards, summary cards
 * Maintains layout while data loads
 */
export const StatCardSkeleton: React.FC<StatCardSkeletonProps> = ({
  count = 3,
}) => {
  return (
    <div className="stat-cards-grid">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height="160px" />
      ))}
    </div>
  )
}
