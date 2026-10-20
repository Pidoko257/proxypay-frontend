/**
 * useWidgetResize — Issue #627
 *
 * Drag-to-resize hook for dashboard widgets.
 * Persists sizes in localStorage under `proxypay-widget-sizes`.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'proxypay-widget-sizes'
const MIN_WIDTH = 200
const MAX_WIDTH = 800
const MIN_HEIGHT = 150
const MAX_HEIGHT = 600

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WidgetSize {
  width: number
  height: number
}

interface StoredSizes {
  [widgetId: string]: WidgetSize
}

export interface UseWidgetResizeOptions {
  widgetId: string
  defaultWidth?: number
  defaultHeight?: number
}

export interface UseWidgetResizeResult {
  width: number
  height: number
  /** Spread onto the resize handle element */
  resizeHandleProps: {
    onMouseDown: (e: React.MouseEvent) => void
    onTouchStart: (e: React.TouchEvent) => void
    role: string
    'aria-label': string
    tabIndex: number
    onKeyDown: (e: React.KeyboardEvent) => void
  }
  /** Spread onto the widget container element */
  containerProps: {
    style: React.CSSProperties
  }
}

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function loadSizes(): StoredSizes {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSizes) : {}
  } catch {
    return {}
  }
}

function saveSize(widgetId: string, size: WidgetSize): void {
  try {
    const existing = loadSizes()
    existing[widgetId] = size
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // Storage may be full or unavailable
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useWidgetResize({
  widgetId,
  defaultWidth = 320,
  defaultHeight = 240,
}: UseWidgetResizeOptions): UseWidgetResizeResult {
  const [size, setSize] = useState<WidgetSize>(() => {
    const stored = loadSizes()
    return stored[widgetId] ?? { width: defaultWidth, height: defaultHeight }
  })

  // Refs for tracking drag state (avoid stale closures)
  const isDragging = useRef(false)
  const startX = useRef(0)
  const startY = useRef(0)
  const startWidth = useRef(size.width)
  const startHeight = useRef(size.height)

  // Persist whenever size changes
  useEffect(() => {
    saveSize(widgetId, size)
  }, [widgetId, size])

  const startResize = useCallback(
    (clientX: number, clientY: number) => {
      isDragging.current = true
      startX.current = clientX
      startY.current = clientY
      startWidth.current = size.width
      startHeight.current = size.height
    },
    [size.width, size.height],
  )

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current) return
    const newWidth = clamp(
      startWidth.current + (e.clientX - startX.current),
      MIN_WIDTH,
      MAX_WIDTH,
    )
    const newHeight = clamp(
      startHeight.current + (e.clientY - startY.current),
      MIN_HEIGHT,
      MAX_HEIGHT,
    )
    setSize({ width: newWidth, height: newHeight })
  }, [])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current) return
    const touch = e.changedTouches[0]
    const newWidth = clamp(
      startWidth.current + (touch.clientX - startX.current),
      MIN_WIDTH,
      MAX_WIDTH,
    )
    const newHeight = clamp(
      startHeight.current + (touch.clientY - startY.current),
      MIN_HEIGHT,
      MAX_HEIGHT,
    )
    setSize({ width: newWidth, height: newHeight })
  }, [])

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('touchend', handleTouchEnd)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      startResize(e.clientX, e.clientY)
    },
    [startResize],
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.changedTouches[0]
      startResize(touch.clientX, touch.clientY)
    },
    [startResize],
  )

  // Keyboard resize: arrow keys adjust by 10px increments
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const step = 10
    setSize((prev) => {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault()
          return { ...prev, width: clamp(prev.width + step, MIN_WIDTH, MAX_WIDTH) }
        case 'ArrowLeft':
          e.preventDefault()
          return { ...prev, width: clamp(prev.width - step, MIN_WIDTH, MAX_WIDTH) }
        case 'ArrowDown':
          e.preventDefault()
          return { ...prev, height: clamp(prev.height + step, MIN_HEIGHT, MAX_HEIGHT) }
        case 'ArrowUp':
          e.preventDefault()
          return { ...prev, height: clamp(prev.height - step, MIN_HEIGHT, MAX_HEIGHT) }
        default:
          return prev
      }
    })
  }, [])

  return {
    width: size.width,
    height: size.height,
    resizeHandleProps: {
      onMouseDown: handleMouseDown,
      onTouchStart: handleTouchStart,
      role: 'separator',
      'aria-label': 'Resize widget. Use arrow keys to adjust size.',
      tabIndex: 0,
      onKeyDown: handleKeyDown,
    },
    containerProps: {
      style: {
        width: size.width,
        height: size.height,
        position: 'relative',
        boxSizing: 'border-box',
      },
    },
  }
}
