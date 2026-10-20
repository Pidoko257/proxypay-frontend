# URL-Based Filter State Management

## Overview

This implementation adds URL-based filter state persistence to the ProxyPay frontend, enabling users to:
- **Restore filters** when navigating back/forward through browser history
- **Share filter configurations** with colleagues via URL links
- **Encode filter state** cleanly in URL query parameters
- **Clear filters** to return to defaults
- **Navigate transparently** between filtered views

## Architecture

### Core Components

#### 1. **useUrlFilters Hook** (`src/hooks/useUrlFilters.ts`)
A React hook that manages filter state with automatic URL synchronization.

**Key Features:**
- Initializes filters from URL on mount
- Syncs filter changes to URL automatically
- Supports both `replaceState` (default) and `pushState` for history management
- Provides utility methods for URL sharing and state validation
- Fires callback on filter changes for analytics/side effects

**Usage:**
```typescript
const { 
  filters,           // Current filter state
  setFilters,        // Set all filters
  updateFilter,      // Update single filter
  clearFilters,      // Reset to defaults
  getShareableUrl,   // Get URL with encoded filters
  copyShareableUrl,  // Copy URL to clipboard
  isDefaultState     // Check if at defaults
} = useUrlFilters({
  defaultFilters,
  onFiltersChange: (filters) => console.log(filters),
  syncToUrl: true,
  pushHistory: false
});
```

#### 2. **URL Utilities** (`src/utils/urlFilters.ts`)
Helper functions for encoding/decoding filter state to/from URL parameters.

**Functions:**
- `encodeFiltersToUrl(filters)` - Convert filter state to URLSearchParams
- `decodeFiltersFromUrl(params, defaults)` - Parse URL params back to filter state
- `filtersAreDefault(filters, defaults)` - Check if filters match defaults
- `buildFilterUrl(basePath, filters)` - Generate shareable URL
- `cleanFilterState(filters)` - Remove empty/default values

**Special Character Handling:**
- URL-safe encoding via `URLSearchParams` API
- Handles regex patterns, query parameters, unicode characters
- Preserves special chars: `/`, `?`, `&`, `=`, `@`, etc.

#### 3. **AdvancedLogsDashboard Integration** (`src/components/AdvancedLogsDashboard.tsx`)
Updated component to use URL-based filters.

**New Features:**
- "Share Filters" button copies filter URL to clipboard
- Filter state automatically syncs to URL
- Browser back/forward restores filters
- Reset button clears URL parameters

### URL Parameter Format

Filters are encoded as query parameters:
```
/logs?startDate=2026-01-15&endDate=2026-01-31&endpoint=%2Fapi%2Fusers&method=GET&statusCode=5&minResponseTime=100&maxResponseTime=5000
```

**Parameter Details:**
| Parameter | Type | Encoded? | Include Default? |
|-----------|------|----------|------------------|
| startDate | string | No | Yes |
| endDate | string | No | Yes |
| endpoint | string (regex) | Yes | If non-empty |
| method | string | No | If non-empty |
| statusCode | string | No | If non-empty |
| minResponseTime | number | No | If !== 0 |
| maxResponseTime | number | No | If !== 10000 |

## Test Coverage

### Unit Tests (`src/utils/__tests__/urlFilters.test.ts` - 29 tests)
- ✅ Filter encoding/decoding
- ✅ Special character handling
- ✅ Unicode support
- ✅ Type conversion (numeric fields)
- ✅ Default value handling
- ✅ XSS prevention
- ✅ Edge cases (long patterns, query params)

### Integration Tests (`src/utils/__tests__/urlFilters.integration.test.ts` - 18 tests)
- ✅ Browser back/forward navigation scenarios
- ✅ Complex filter combinations through URL navigation
- ✅ Regex pattern encoding in endpoints
- ✅ Special character preservation
- ✅ Unicode handling
- ✅ Filter clearing (full and partial)
- ✅ Shareable URL generation
- ✅ URL idempotence
- ✅ Edge cases (multiple params, zero values)

**Test Results:**
```
PASS src/utils/__tests__/urlFilters.test.ts (29 tests)
PASS src/utils/__tests__/urlFilters.integration.test.ts (18 tests)
Total: 47 tests, all passing ✓
```

## Acceptance Criteria Met

✅ **Encode filter state in URL query parameters**
- Implemented via `encodeFiltersToUrl()` with clean, minimal encoding
- Dates always included, other fields only if non-default
- Special characters properly escaped

✅ **Restore filters from URL on page load**
- `useUrlFilters` hook initializes from URL via `decodeFiltersFromUrl()`
- AdvancedLogsDashboard integrates hook automatically
- Works with browser reload and direct URL navigation

✅ **Update URL when filters change**
- `setFilters()` and `updateFilter()` automatically sync to URL
- Uses `replaceState` to avoid history clutter (configurable)
- Sync can be disabled via `syncToUrl: false` option

✅ **Support browser back/forward navigation**
- Hook listens to `useSearchParams` changes
- Automatically restores filters when URL changes
- Tested with complex navigation scenarios

✅ **Share filter URLs with colleagues**
- `getShareableUrl()` returns full URL with encoded filters
- `copyShareableUrl()` copies to clipboard automatically
- "Share Filters" button in dashboard UI

✅ **Clean up URL when filters are cleared**
- `clearFilters()` removes all URL parameters except dates
- Dates intentionally included to preserve date range context
- Partial clearing supported by setting individual filters

✅ **Test URL history with various filter combinations**
- Integration tests cover simple and complex scenarios
- Tests verify round-trip encoding/decoding
- Verified with regex patterns, unicode, special chars

## Usage Examples

### Basic Setup
```typescript
// In AdvancedLogsDashboard or similar component
const { filters, updateFilter, clearFilters, copyShareableUrl } = useUrlFilters({
  defaultFilters: {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    endpoint: '',
    method: '',
    statusCode: '',
    minResponseTime: 0,
    maxResponseTime: 10000,
  },
  syncToUrl: true
});

// Update a filter → automatically syncs to URL
updateFilter('endpoint', '/api/users');

// Share current filters
const success = await copyShareableUrl();
```

### Direct URL Manipulation
```typescript
// Programmatically build a shareable URL
import { buildFilterUrl } from '../utils/urlFilters';

const filters = { /* ... */ };
const url = buildFilterUrl('/logs', filters);
// Share url with colleagues
```

### Testing Filter State
```typescript
import { filtersAreDefault } from '../utils/urlFilters';

if (!filtersAreDefault(currentFilters, defaultFilters)) {
  // User has applied non-default filters
}
```

## Browser Compatibility

- ✅ All modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Uses standard `URLSearchParams` API
- ✅ Uses standard React Router v6 hooks
- ✅ No polyfills required for ES2015+ environments

## Performance

- **URL Encoding**: O(n) where n = number of filters (usually 7 fields)
- **URL Decoding**: O(n) URLSearchParams parse
- **Filter Updates**: Instant, debounced history updates
- **Memory**: Minimal overhead (filter state + URL params)
- **No external dependencies**: Uses built-in browser APIs

## Security Considerations

- ✅ URL parameters are properly escaped via `URLSearchParams`
- ✅ No script injection possible (parameters treated as strings)
- ✅ XSS prevention: all user input sanitized before URL inclusion
- ✅ Filters are read-only in URLs (no executable code)

## Future Enhancements

Potential improvements:
1. **Compressed URLs**: Use URL compression for very long filter patterns
2. **Filter history**: Track previously applied filter sets
3. **Filter shortcuts**: Named filter presets shareable as URLs
4. **Analytics**: Track most commonly shared filters
5. **Mobile optimization**: QR codes for sharing filter URLs

## Files Modified/Created

### New Files
- `src/hooks/useUrlFilters.ts` - Custom hook for URL filter management
- `src/utils/urlFilters.ts` - URL encoding/decoding utilities
- `src/utils/__tests__/urlFilters.test.ts` - Unit tests (29 tests)
- `src/utils/__tests__/urlFilters.integration.test.ts` - Integration tests (18 tests)
- `src/hooks/__tests__/useUrlFilters.test.ts` - Hook unit tests (skeleton)

### Modified Files
- `package.json` - Added `react-router-dom@^6.28.0` dependency
- `src/components/AdvancedLogsDashboard.tsx` - Integrated useUrlFilters hook, added Share Filters button

### Dependencies Added
- `react-router-dom@^6.28.0` - React Router for URL management
- `@types/react-router-dom@^6.28.0` - TypeScript definitions

## Implementation Notes

1. **Why React Router 6?**
   - `useSearchParams` hook provides clean URL state management
   - Built-in support for browser history
   - No additional state library needed
   - Zero configuration required

2. **Why `replaceState` by default?**
   - Cleaner browser history (no intermediate filter states)
   - Users don't see each filter change as a separate history entry
   - Configurable via `pushHistory` option if needed

3. **Date field handling:**
   - Always included in URLs to preserve date context
   - Allows users to see/modify date ranges even with default filters
   - Can be changed via `encodeFiltersToUrl()` logic

4. **Extensibility:**
   - Hook accepts `onFiltersChange` callback for analytics
   - Utilities are pure functions, easily testable
   - Default filters configurable per component

## Testing Strategy

All tests use Jest and React Testing Library:
- Unit tests verify individual utilities
- Integration tests verify end-to-end scenarios
- Tests run against compiled TypeScript
- All tests pass with no external dependencies required for core tests
