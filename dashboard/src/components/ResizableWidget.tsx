/**
 * ResizableWidget — Issue #627
 *
 * Wrapper component that makes any dashboard widget user-resizable.
 * Uses the `useWidgetResize` hook for drag/touch/keyboard resize support.
 */

import React from 'react'
import { useWidgetResize } from '../hooks/useWidgetResize'
import '../styles/ResizableWidget.css'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ResizableWidgetProps {
  widgetId: string
  defaultWidth?: number
  defaultHeight?: number
  title: string
  children: React.ReactNode
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ResizableWidget({
  widgetId,
  defaultWidth = 320,
  defaultHeight = 240,
  title,
  children,
}: ResizableWidgetProps): React.JSX.Element {
  const { width, height, resizeHandleProps, containerProps } = useWidgetResize({
    widgetId,
    defaultWidth,
    defaultHeight,
  })

  return (
    <div
      data-testid="resizable-widget"
      role="region"
      aria-label={title}
      className="resizable-widget"
      {...containerProps}
    >
      {/* Widget content area */}
      <div className="resizable-widget__content">{children}</div>

      {/* Resize handle — bottom-right corner */}
      <div
        className="resizable-widget__handle"
        {...resizeHandleProps}
        title={`Resize ${title}. Current size: ${width}×${height}px`}
      >
        {/* Grip icon — three diagonal lines */}
        <svg
          className="resizable-widget__grip"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <line x1="4" y1="12" x2="12" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="8" y1="12" x2="12" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="12" y1="12" x2="12" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  )
}
