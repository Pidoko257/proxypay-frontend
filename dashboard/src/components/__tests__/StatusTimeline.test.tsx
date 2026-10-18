import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusTimeline } from '../StatusTimeline'
import { StatusTransition } from '../../services/api'

const transitions: StatusTransition[] = [
  {
    fromStatus: null,
    toStatus: 'pending',
    timestamp: '2026-01-01T10:00:00.000Z',
    actor: 'system',
    reason: 'Payment received',
  },
  {
    fromStatus: 'pending',
    toStatus: 'settled',
    timestamp: '2026-01-01T10:05:00.000Z',
    actor: 'settlement-worker',
    reason: 'Funds confirmed',
  },
]

describe('StatusTimeline', () => {
  it('renders each transition with status, timestamp, actor, and reason', () => {
    render(<StatusTimeline transitions={transitions} />)

    expect(screen.getByRole('list', { name: 'Transaction status transitions' })).toBeInTheDocument()
    expect(screen.getByText('pending')).toBeInTheDocument()
    expect(screen.getByText('pending → settled')).toBeInTheDocument()
    expect(screen.getByText('Changed by settlement-worker')).toBeInTheDocument()
    expect(screen.getByText('Funds confirmed')).toBeInTheDocument()
    expect(screen.getAllByRole('time')[1]).toHaveAttribute(
      'datetime',
      '2026-01-01T10:05:00.000Z'
    )
  })

  it('switches between vertical and horizontal layouts', () => {
    render(<StatusTimeline transitions={transitions} />)

    const horizontal = screen.getByRole('button', { name: 'Horizontal' })
    fireEvent.click(horizontal)

    expect(horizontal).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('list')).toHaveClass('status-timeline-horizontal')
  })
})
