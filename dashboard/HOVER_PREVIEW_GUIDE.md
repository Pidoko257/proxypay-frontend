# Hover Preview Guide

This guide documents the hover preview functionality for transaction rows in the dashboard.

## Overview

When a user hovers over a transaction row, a preview tooltip appears after a short delay showing key transaction details. The preview is also accessible via keyboard focus and mobile long-press.

## Configuration

| Constant | Value | Description |
|----------|-------|-------------|
| `PREVIEW_DELAY_MS` | **200 ms** | Delay before showing preview on hover/focus |
| `LONG_PRESS_DELAY_MS` | 500 ms | Delay before showing preview on mobile long-press |

## Implementation

The preview delay is defined in `dashboard/src/components/TransactionRowPreview.tsx`:

```typescript
export const PREVIEW_DELAY_MS = 200
export const LONG_PRESS_DELAY_MS = 500
```

## Behavior

1. **Hover**: Preview appears after 200ms of continuous hover
2. **Keyboard Focus**: Preview appears after 200ms when row receives focus (Tab navigation)
3. **Mobile Long Press**: Preview appears after 500ms of touch hold
4. **Dismissal**: Preview dismisses on mouse leave, blur, or click outside

## Usage

```tsx
import { TransactionRowPreview, PREVIEW_DELAY_MS } from './TransactionRowPreview'

// Use the constant for consistent timing
setTimeout(() => showPreview(), PREVIEW_DELAY_MS)
```

## Testing

The preview behavior is tested in `dashboard/src/components/__tests__/TransactionPreview.test.tsx`:

- Hover preview appears after 200ms
- Keyboard focus preview appears after 200ms
- Mobile long press preview appears after 500ms
- Preview dismisses correctly on blur/leave

## Accessibility

- Preview uses `role="tooltip"` for screen readers
- Keyboard focus triggers preview (Tab navigation)
- Focus is managed correctly when preview opens/closes
- Respects `prefers-reduced-motion` for animations