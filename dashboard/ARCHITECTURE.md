# ProxyPay Dashboard - Architecture & Implementation Guide

## Overview

This is a React 18 + TypeScript dashboard for managing ProxyPay transactions and notification settings. The application uses modern best practices: client-side state management, optimistic UI updates, and efficient CSV export without backend round-trips.

## Technology Choices & Rationale

### Frontend Framework: React 18
- Component-based architecture for maintainability
- Hooks API for clean state management
- Excellent TypeScript support
- Large ecosystem of tools and libraries

### Build Tool: Vite
- 10-100x faster than webpack for HMR
- Native ES modules support
- Minimal configuration needed
- Excellent DX with instant feedback

### State Management: Zustand
- Lightweight (~2KB) compared to Redux/MobX
- Minimal boilerplate for simple state updates
- Built-in middleware support (though not used here)
- Excellent TypeScript typing

### HTTP Client: Axios
- Promise-based API
- Interceptor support for auth tokens
- Request/response transformation
- Better error handling than fetch

### Date Library: date-fns
- Modular (import only what you need)
- Faster than Moment.js
- Better for tree-shaking in production builds
- Clear function-based API

### Icons: Lucide React
- 1000+ beautiful, consistent icons
- Small bundle size
- Great TypeScript support
- Perfect for dashboards

## Project Structure

```
dashboard/
├── src/
│   ├── components/              # React components
│   │   ├── TransactionsTable.tsx    # Main transaction list with sorting
│   │   ├── TransactionDrawer.tsx    # Side drawer for transaction details
│   │   ├── ExportButton.tsx         # CSV export with progress
│   │   └── NotificationSettings.tsx # Notification toggles
│   │
│   ├── services/                # Business logic & API
│   │   ├── api.ts              # ProxyPayAPI client class
│   │   └── csv.ts              # CSV generation utilities
│   │
│   ├── stores/                 # Zustand state management
│   │   ├── transactionStore.ts     # Transaction state & actions
│   │   ├── notificationStore.ts    # Notification settings state
│   │   ├── interceptorLogStore.ts  # Ring buffer of Axios request logs
│   │   └── retryStore.ts           # Per-request retry attempt tracking
│   │
│   ├── styles/                 # Component-scoped CSS
│   │   ├── TransactionsTable.css
│   │   ├── TransactionDrawer.css
│   │   ├── ExportButton.css
│   │   └── NotificationSettings.css
│   │
│   ├── App.tsx                 # Main app shell & routing
│   ├── App.css                 # Global app styles
│   ├── index.css               # CSS variables & resets
│   └── main.tsx                # React entry point
│
├── index.html                  # HTML template
├── vite.config.ts              # Vite configuration
├── tsconfig.json               # TypeScript configuration
├── package.json                # Dependencies & scripts
├── README.md                   # Full documentation
├── QUICKSTART.md               # Getting started guide
└── ARCHITECTURE.md             # This file
```

## Data Flow

### Transaction Loading Flow
```
App mounts
  ↓
useTransactionStore.fetchTransactions() called
  ↓
ProxyPayAPI.getTransactions() makes HTTP request
  ↓
Response stored in Zustand state
  ↓
TransactionsTable component re-renders with new data
```

### CSV Export Flow
```
User clicks "Export CSV"
  ↓
ExportButton shows options menu
  ↓
User clicks "Download CSV"
  ↓
CSVExporter.generateCSV() processes data locally
  ↓
Progress bar shown for large datasets (10,000+)
  ↓
CSVExporter.downloadCSV() triggers browser download
```

### Transaction Detail Flow
```
User clicks transaction row
  ↓
TransactionsTable calls onRowClick(transaction)
  ↓
App calls setSelectedTransaction()
  ↓
setDrawerOpen(true) opens drawer
  ↓
TransactionDrawer receives transaction prop
  ↓
Drawer renders with slide-in animation
  ↓
User presses Escape or clicks overlay
  ↓
onClose handler closes drawer
```

### Notification Settings Flow
```
NotificationSettings mounts
  ↓
useNotificationStore.fetchSettings() called
  ↓
ProxyPayAPI.getNotificationSettings() fetches data
  ↓
Settings cards render with toggles
  ↓
User toggles email/webhook checkbox
  ↓
updateSetting() called with optimistic update
  ↓
UI updates immediately (optimistic)
  ↓
API call made in background
  ↓
On success: optimisticUpdates cleared
  ↓
On error: Previous state restored, error shown
```

## Key Features Implementation

### 1. Transaction Table Sorting
**File**: `src/components/TransactionsTable.tsx`

```typescript
const [sort, setSort] = useState<SortState>({ column: null, direction: 'asc' })

// Click handler toggles direction
const handleSort = (column: keyof Transaction) => {
  setSort((prev) => ({
    column,
    direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
  }))
}

// Array sort applies to displayed data
const sortedTransactions = [...transactions].sort((a, b) => {
  // Numeric vs string comparison logic
})
```

**Why client-side sorting?** Reduces server load, faster UX, works offline.

### 2. CSV Export
**File**: `src/services/csv.ts`

```typescript
static generateCSV(transactions, includeAuditTrail): string {
  // Build headers
  // Escape values for CSV format (handle commas, quotes, newlines)
  // Generate CSV content
}

static downloadCSV(csvContent, filename): void {
  // Create blob
  // Create object URL
  // Trigger download
  // Clean up
}
```

**Why no server round-trip?** 
- Datasets under 10,000 rows are fast client-side
- Reduces server load
- Better privacy (data stays in browser)
- Instant feedback to user

**Large dataset handling:**
```typescript
if (isLargeExport) {
  // Show progress every 10% increment
  const increment = Math.max(1, Math.floor(totalRows / 10))
  for (let i = 0; i < totalRows; i += increment) {
    setProgress((i / totalRows) * 100)
    // Yield to browser with async delay
  }
}
```

### 3. Transaction Drawer
**File**: `src/components/TransactionDrawer.tsx`

**Right-side slide-in animation:**
```css
.transaction-drawer {
  transform: translateX(100%);
  transition: transform var(--transition-slow);
}

.transaction-drawer.open {
  transform: translateX(0);
}
```

**Keyboard handling:**
```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen) {
      onClose()
    }
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [isOpen, onClose])
```

**Click-outside behavior:**
```tsx
<div className="drawer-overlay" onClick={onClose} />
```

**Why no page navigation?** Preserves scroll position, maintains page state, better UX.

### 4. Optimistic Notification Updates
**File**: `src/stores/notificationStore.ts`

```typescript
updateSetting: async (eventType, emailEnabled, webhookEnabled) => {
  // 1. Store previous state
  const previousSetting = state.settings.find(s => s.eventType === eventType)
  
  // 2. Optimistic update UI immediately
  set({ settings: [...updated] })
  
  try {
    // 3. Make API call
    const updated = await proxyPayAPI.updateNotificationSetting(...)
    // 4. Confirm update was persisted
    set({ settings: [...] })
  } catch (error) {
    // 5. Rollback on failure
    set({ settings: previousSetting ? [...] : state.settings })
  }
}
```

**Benefits:**
- Instant user feedback
- No loading spinners needed
- Rollback ensures data consistency
- Better perceived performance

## Interceptor Pipeline

The `ProxyPayAPI` class registers three Axios interceptors on the shared `AxiosInstance`. They execute in registration order on the way out (request interceptors) and in reverse order on the way back in (response interceptors).

```
Outgoing request
  ↓
[1] Deduplication interceptor
      – Computes a cache key from method + URL + serialised params/body
      – If an identical in-flight request exists, returns its pending
        Promise instead of issuing a second network call
      – Cancelled when the first response resolves or rejects
  ↓
[2] Request-logging interceptor
      – Writes one entry to interceptorLogStore: { id, method, url,
        params, timestamp, status: 'pending' }
      – Attaches the entry id to config.meta so the response side can
        look it up
  ↓
Axios sends HTTP request
  ↓
[2] Response-logging interceptor (paired with #2 above)
      – Looks up the entry by config.meta.logId
      – Updates it: { status: 'success'|'error', statusCode, duration }
  ↓
[3] Retry interceptor (response error path only)
      – Reads retry state from retryStore for this request
      – On network error or 5xx, waits 2^attempt × 500 ms (capped at 30 s),
        increments the attempt counter in retryStore, then re-issues the
        request via axios(config)
      – Default ceiling: 3 attempts; 4xx errors are not retried
      – On final failure, removes the entry from retryStore and re-throws
  ↓
Caller receives resolved value or rejection
```

### interceptorLogStore (`src/stores/interceptorLogStore.ts`)

Holds a bounded ring buffer of the last 200 request log entries. Each entry shape:

```typescript
interface RequestLogEntry {
  id: string            // uuid assigned by the request interceptor
  method: string        // 'GET' | 'POST' | ...
  url: string           // full URL after baseURL expansion
  params?: unknown      // query params, if any
  body?: unknown        // request body, if any
  timestamp: number     // Date.now() at dispatch
  status: 'pending' | 'success' | 'error'
  statusCode?: number   // HTTP status, set on response
  duration?: number     // ms, set on response
  error?: string        // message, set on error response
}
```

The store is intentionally write-only from the interceptor's perspective. UI tooling (a debug panel, for example) reads from it via `useInterceptorLogStore()`. Nothing in normal application flow depends on this store; removing it does not affect request behaviour.

### Request deduplication

The deduplication layer targets `GET` requests only. The cache key is `method:url:JSON.stringify(params)`. Duplicate `POST`/`PUT`/`DELETE` calls are never collapsed because they carry side effects.

The in-flight map is a plain `Map<string, Promise>` held in module scope (not in a Zustand store). It has no maximum size; entries are deleted as soon as the underlying request settles.

### retryStore (`src/stores/retryStore.ts`)

Tracks the retry state for each active retry sequence, keyed by the same cache key the deduplication layer uses.

```typescript
interface RetryEntry {
  key: string           // cache key
  attempt: number       // 0-indexed, increments before each retry
  lastDelay: number     // ms waited before the most recent attempt
}
```

The store lets a UI surface show "retrying… attempt 2 of 3" without the interceptor needing to know about the display layer. It also provides `clearAll()`, which is called on explicit user sign-out so stale retry state does not carry over between sessions.

## State Management Patterns

### Zustand Store Structure
```typescript
interface Store {
  // Data state
  items: Item[]
  
  // UI state
  loading: boolean
  error: string | null
  
  // Actions
  fetchItems: () => Promise<void>
  updateItem: (id: string, data: Partial<Item>) => Promise<void>
}

export const useStore = create<Store>((set, get) => ({
  // Implementation
}))
```

### Component Usage
```typescript
const MyComponent = () => {
  const { items, loading, error, fetchItems } = useStore()
  
  useEffect(() => {
    fetchItems()
  }, [])
  
  return (...)
}
```

## Error Handling Strategy

### API Errors
```typescript
try {
  const data = await proxyPayAPI.getTransactions(filters)
  set({ data, loading: false })
} catch (error) {
  set({
    error: error instanceof Error ? error.message : 'Unknown error',
    loading: false
  })
}
```

### User Feedback
- Error messages in red banner
- Automatic or manual dismissal
- Errors don't block UI (graceful degradation)

### Retry Mechanism
Handled by the retry interceptor in the Axios pipeline. See [Interceptor Pipeline](#interceptor-pipeline) for the full back-off schedule and retryStore contract.

## Performance Optimizations

### Bundle Size
- Production build: ~75KB gzipped
- Code splitting not needed (single SPA)
- CSS scoped to components

### Runtime Performance
- React 18 concurrent rendering
- Zustand shallow state updates
- CSS transitions for animations
- Debouncing on sort/filter

### Memory Management
- Cleanup event listeners in useEffect
- Revoke object URLs after download
- Remove temporary DOM nodes

## Security Considerations

### API Communication
- HTTPS recommended in production
- CORS headers validated
- Auth token in Authorization header
- Input validation before CSV export

### Client-Side
- XSS protection via React (auto-escapes JSX)
- CSRF tokens if needed (backend responsibility)
- No sensitive data in localStorage (only auth token)

## Testing Strategy

### Unit Tests (Not included, recommendations)
```typescript
// Test CSV generation
describe('CSVExporter', () => {
  it('should escape CSV values', () => {
    const csv = CSVExporter.generateCSV([...])
    expect(csv).toContain('"value with, comma"')
  })
})

// Test store actions
describe('useTransactionStore', () => {
  it('should fetch transactions', async () => {
    // Mock API
    // Test async action
  })
})
```

### Integration Tests (Not included, recommendations)
```typescript
// Test component flows
describe('TransactionsPage', () => {
  it('should open drawer on row click', () => {
    // Render component
    // Simulate row click
    // Assert drawer open
  })
})
```

### E2E Tests (Not included, recommendations)
- Use Cypress or Playwright
- Test complete user flows
- Verify API integration

## Deployment Checklist

- [ ] Backend API URL configured
- [ ] Authentication working
- [ ] CORS headers correct
- [ ] SSL certificate valid
- [ ] Environment variables set
- [ ] Build succeeds: `npm run build`
- [ ] Tests pass: `npm run test` (if added)
- [ ] Type checking passes: `npm run type-check`
- [ ] No console errors/warnings
- [ ] Performance acceptable
- [ ] Accessibility tested (keyboard nav, screen readers)
- [ ] Mobile responsive tested
- [ ] Analytics/monitoring configured

## Future Enhancements

### Features
- [ ] Transaction filters (date range, status, provider)
- [ ] Pagination controls
- [ ] Search by reference/hash
- [ ] Bulk action support
- [ ] Custom report builder
- [ ] Webhook test feature
- [ ] Activity timeline

### Technical
- [ ] Unit & integration tests
- [ ] E2E tests (Cypress)
- [ ] Service worker for offline
- [ ] Error boundary component
- [ ] Advanced state persistence
- [ ] Real-time updates (WebSocket)
- [ ] Virtualized lists for large datasets

## Development Workflow

### Adding a New Component

1. Create component file in `src/components/`
2. Create styles file in `src/styles/`
3. Add to appropriate page in `App.tsx`
4. Test in dev server
5. Build to verify no errors

### Adding a New API Endpoint

1. Add method to `ProxyPayAPI` class
2. Add TypeScript types for request/response
3. Create Zustand store if needed
4. Use store hooks in component

### Updating Styles

1. Edit scoped CSS file in `src/styles/`
2. Or update CSS variables in `src/index.css` for global changes
3. Hot reload works instantly in dev mode

## Maintenance Notes

- Keep dependencies updated: `npm audit`, `npm update`
- Monitor bundle size: check build output
- Profile performance: React DevTools
- Review error logs: in production
- Backup important configurations

---

**Architecture designed for scalability, maintainability, and developer experience.** 🚀
