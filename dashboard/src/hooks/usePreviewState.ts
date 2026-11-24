import { useCallback, useRef, useState } from 'react'
import { Transaction } from '../services/api'

export interface TransactionPreviewPosition {
  top: number
  left: number
}

export interface PreviewState {
  transaction: Transaction
  position: TransactionPreviewPosition
}

export const PREVIEW_DELAY_MS = 200
export const LONG_PRESS_DELAY_MS = 500

/**
 * Hook to manage preview state for transaction rows
 * Handles:
 * - Delayed preview activation (hover, focus, long-press)
 * - Position calculation (viewport-aware)
 * - Timer cleanup
 * - Touch long-press tracking
 */
export const usePreviewState = () => {
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const previewTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const calculatePosition = useCallback(
    (row: HTMLTableRowElement): TransactionPreviewPosition => {
      const rect = row.getBoundingClientRect()
      const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth
      const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight
      const previewWidth = Math.min(310, Math.max(240, viewportWidth - 32))

      // Horizontally: try to align with row, but keep within viewport
      const left = Math.min(
        Math.max(8, rect.left),
        Math.max(8, viewportWidth - previewWidth - 8)
      )

      // Vertically: show below if space, otherwise show above
      const estimatedHeight = 250
      const below = rect.bottom + 8
      const top =
        below + estimatedHeight > viewportHeight
          ? Math.max(8, rect.top - estimatedHeight - 8)
          : below

      return { top, left }
    },
    []
  )

  const schedulePreview = useCallback(
    (tx: Transaction, row: HTMLTableRowElement, delayMs: number = PREVIEW_DELAY_MS) => {
      // Clear any existing preview timer
      if (previewTimer.current) clearTimeout(previewTimer.current)

      previewTimer.current = setTimeout(() => {
        const position = calculatePosition(row)
        setPreview({ transaction: tx, position })
      }, delayMs)
    },
    [calculatePosition]
  )

  const hidePreview = useCallback(() => {
    if (previewTimer.current) {
      clearTimeout(previewTimer.current)
      previewTimer.current = null
    }
    setPreview(null)
  }, [])

  const scheduleLongPress = useCallback(
    (
      tx: Transaction,
      row: HTMLTableRowElement,
      onTrigger?: () => void
    ) => {
      if (touchTimer.current) clearTimeout(touchTimer.current)
      longPressTriggered.current = false

      touchTimer.current = setTimeout(() => {
        longPressTriggered.current = true
        schedulePreview(tx, row, 0) // Show immediately after long-press triggers
        onTrigger?.()
      }, LONG_PRESS_DELAY_MS)
    },
    [schedulePreview]
  )

  const cancelLongPress = useCallback(() => {
    if (touchTimer.current) {
      clearTimeout(touchTimer.current)
      touchTimer.current = null
    }
  }, [])

  return {
    preview,
    setPreview,
    schedulePreview,
    hidePreview,
    scheduleLongPress,
    cancelLongPress,
    longPressTriggered,
    previewTimer,
    touchTimer,
  }
}
