import React from 'react'
import '../styles/Skeleton.css'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'rect' | 'circle'
  className?: string
}

/**
 * Reusable Skeleton component for loading states
 * Prevents layout shift by maintaining space while data loads
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  variant = 'rect',
  className = '',
}) => {
  const style = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={style}
      aria-busy="true"
      aria-label="Loading..."
    />
  )
}

interface SkeletonTextProps {
  lines?: number
  width?: string | number
  className?: string
}

/**
 * Skeleton for text content (paragraph)
 * Generates multiple lines with varying widths for realistic appearance
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 3,
  width = '100%',
  className = '',
}) => {
  return (
    <div className={`skeleton-text ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height="0.875rem"
          width={i === lines - 1 ? '80%' : width}
          className="skeleton-line"
        />
      ))}
    </div>
  )
}

interface SkeletonTableRowProps {
  columns?: number
  className?: string
}

/**
 * Skeleton for table rows
 * Displays skeleton cells matching table structure
 */
export const SkeletonTableRow: React.FC<SkeletonTableRowProps> = ({
  columns = 6,
  className = '',
}) => {
  return (
    <tr className={`skeleton-table-row ${className}`}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="skeleton-cell">
          <Skeleton width="90%" height="1.25rem" />
        </td>
      ))}
    </tr>
  )
}

interface SkeletonCardProps {
  width?: string
  height?: string
  className?: string
}

/**
 * Skeleton for card/panel components
 * Shows header and content placeholders
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  width = '100%',
  height = '200px',
  className = '',
}) => {
  return (
    <div className={`skeleton-card ${className}`} style={{ width, height }}>
      {/* Card header */}
      <div className="skeleton-card-header">
        <Skeleton width="60%" height="1.5rem" />
      </div>

      {/* Card body */}
      <div className="skeleton-card-body">
        <Skeleton width="90%" height="1rem" className="skeleton-line" />
        <Skeleton width="85%" height="1rem" className="skeleton-line" />
        <Skeleton width="80%" height="1rem" />
      </div>
    </div>
  )
}

interface SkeletonListProps {
  count?: number
  className?: string
}

/**
 * Skeleton for lists (multiple cards/items)
 */
export const SkeletonList: React.FC<SkeletonListProps> = ({
  count = 3,
  className = '',
}) => {
  return (
    <div className={`skeleton-list ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} height="150px" />
      ))}
    </div>
  )
}
