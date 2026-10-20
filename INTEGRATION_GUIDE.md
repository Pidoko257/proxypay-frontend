# Integration Guide: Transaction Timestamp Validation

## Quick Start

### 1. Use the Component (Recommended)

Replace inline date formatting with the `TransactionDateField` component:

```tsx
import TransactionDateField from '@/components/TransactionDateField';

// In your transaction details view:
<TransactionDateField label="Created" timestamp={tx.createdAt} />
<TransactionDateField label="Settled" timestamp={tx.settledAt} showHint={true} />

// With relative time:
<TransactionDateField label="Created" timestamp={tx.createdAt} mode="relative" />
```

### 2. Use Utilities Directly

For non-UI logic or custom rendering:

```tsx
import { formatDate, validateTimestamp } from '@/utils/dateValidator';

// Validate before using
const validation = validateTimestamp(userInput);
if (validation.valid) {
  console.log('Date is valid:', validation.date);
} else {
  console.log('Invalid because:', validation.reason);
}

// Format a timestamp
const result = formatDate(tx.createdAt);
if (result.isAvailable) {
  return result.formatted; // "Sep 30, 2026, 8:02 AM"
} else {
  return '—'; // or custom unavailable UI
}
```

## Migration Examples

### Before: Manual Formatting (Fragile)

```tsx
function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso; // ❌ Returns raw data if invalid
  }
}

// Usage:
<span>{formatDateTime(tx.createdAt)}</span>

// Problems:
// ❌ No explicit error state
// ❌ Doesn't handle null/undefined
// ❌ Returns raw input on error (confusing UI)
// ❌ No validation reason
```

### After: Component-Based (Robust)

```tsx
import TransactionDateField from '@/components/TransactionDateField';

// Usage:
<TransactionDateField label="Created" timestamp={tx.createdAt} />

// Benefits:
// ✅ Explicit "Date unavailable" state
// ✅ Handles all edge cases
// ✅ Accessible (ARIA labels, roles)
// ✅ Reason tracking (missing, malformed, invalid-range)
// ✅ Type-safe
// ✅ Testable
```

## Real-World Scenarios

### Scenario 1: Transaction with Valid Timestamp

```tsx
const tx = {
  id: 'TXN-123',
  createdAt: '2026-09-30T08:02:11Z',
  settledAt: '2026-09-30T08:24:59Z',
};

<TransactionDateField label="Created" timestamp={tx.createdAt} />
// Renders: "Created" label with "Sep 30, 2026, 8:02 AM"
```

### Scenario 2: Missing Timestamp

```tsx
const tx = {
  id: 'TXN-456',
  createdAt: '2026-09-30T08:02:11Z',
  settledAt: null, // Not yet settled
};

<TransactionDateField label="Settled" timestamp={tx.settledAt} />
// Renders: "Settled" label with "Date unavailable" in gray italic
```

### Scenario 3: Malformed Data

```tsx
const tx = {
  id: 'TXN-789',
  createdAt: '2026-09-30T08:02:11Z',
  settledAt: 'invalid-date', // Bad data from API
};

<TransactionDateField label="Settled" timestamp={tx.settledAt} showHint={true} />
// Renders: "Settled" label with "Date unavailable" + warning hint
// aria-label: "Settled: Date unavailable (malformed)"
```

### Scenario 4: Relative Time Display

```tsx
const tx = {
  id: 'TXN-101',
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
};

<TransactionDateField label="Created" timestamp={tx.createdAt} mode="relative" />
// Renders: "Created" label with "2 hours ago"
```

## Common Patterns

### Dashboard Grid

```tsx
<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
  <TransactionDateField label="Started" timestamp={tx.startedAt} />
  <TransactionDateField label="Completed" timestamp={tx.completedAt} />
  <TransactionDateField label="Refunded" timestamp={tx.refundedAt} />
  <TransactionDateField label="Reconciled" timestamp={tx.reconciledAt} />
</div>
```

### With Status Badge

```tsx
<div>
  <div style={{ marginBottom: '1rem' }}>
    <span className="status-badge">{tx.status}</span>
  </div>
  <TransactionDateField label="Status Updated" timestamp={tx.updatedAt} showHint={true} />
</div>
```

### Export/Log View

```tsx
import { formatDateISO } from '@/utils/dateValidator';

// For technical logs or API responses:
const logEntry = {
  transactionId: tx.id,
  createdAt: formatDateISO(tx.createdAt), // Full ISO: "2026-09-30T08:02:11.000Z"
  status: tx.status,
};
```

## Testing Your Integration

### Unit Test Example

```typescript
import { renderWithProviders } from '@/test-utils';
import { screen } from '@testing-library/react';
import TransactionDateField from '@/components/TransactionDateField';

test('renders date field with valid timestamp', () => {
  const { getByRole } = renderWithProviders(
    <TransactionDateField label="Created" timestamp="2026-09-30T08:02:11Z" />
  );
  
  expect(getByRole('status')).toBeInTheDocument();
  expect(screen.getByText(/Sep 30, 2026/)).toBeInTheDocument();
});

test('shows unavailable for null timestamp', () => {
  renderWithProviders(
    <TransactionDateField label="Created" timestamp={null} />
  );
  
  expect(screen.getByText('Date unavailable')).toBeInTheDocument();
});
```

### Integration Test Example

```typescript
test('transaction details show valid and missing dates', async () => {
  const mockTx = {
    id: 'TXN-123',
    createdAt: '2026-09-30T08:02:11Z',
    settledAt: null,
    amount: 5000,
  };

  render(<TransactionDrawer transaction={mockTx} />);

  expect(screen.getByText(/Sep 30, 2026/)).toBeInTheDocument();
  expect(screen.getByText('Date unavailable')).toBeInTheDocument();
});
```

## API Reference

### TransactionDateField Props

```typescript
interface TransactionDateFieldProps {
  label: string;              // Field label (e.g., "Created")
  timestamp: unknown;         // Any timestamp value (handles all cases)
  mode?: 'standard' | 'relative'; // Default: 'standard'
  className?: string;         // Custom CSS class
  style?: React.CSSProperties; // Custom inline styles
  showHint?: boolean;         // Show warning for unavailable dates
}
```

### Formatting Functions

```typescript
// Validates timestamp
validateTimestamp(value: unknown): DateValidationResult

// Standard formatted date
formatDate(timestamp: unknown, locale?: string): FormattedDate

// ISO 8601 format (technical use)
formatDateISO(timestamp: unknown): string

// Relative time (e.g., "2 hours ago")
formatDateRelative(timestamp: unknown): FormattedDate
```

## Troubleshooting

### Issue: Component not rendering

**Solution:** Check that `TransactionDateField` is imported correctly:
```tsx
import TransactionDateField from '@/components/TransactionDateField';
```

### Issue: Date showing as "Date unavailable"

**Solution:** Check the validation reason in browser console:
```tsx
import { validateTimestamp } from '@/utils/dateValidator';

const result = validateTimestamp(tx.createdAt);
console.log(result); // { valid: false, reason: 'malformed' }
```

### Issue: Need to apply custom styles

**Solution:** Use `className` or `style` props:
```tsx
<TransactionDateField
  label="Created"
  timestamp={tx.createdAt}
  style={{ color: 'blue', fontSize: '14px' }}
/>
```

## Performance Notes

- ✅ Validation is O(1) — no loops or recursion
- ✅ Component is memoizable with React.memo
- ✅ No external dependencies — purely native Date API
- ✅ Suitable for rendering large transaction lists (1000+ items)

## Next Steps

1. Replace inline `formatDateTime()` calls with `TransactionDateField`
2. Add unit tests for transaction date handling
3. Enable visual regression testing for date display
4. Consider locale-aware formatting for global users
5. Review logs for "Date unavailable" entries to catch data issues

## Questions?

See **TIMESTAMP_VALIDATION.md** for implementation details and complete documentation.
