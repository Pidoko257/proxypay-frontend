# URL Filter State Management - Quick Start Guide

## For Dashboard Users

### Applying Filters
1. Open the dashboard (e.g., `/logs`)
2. Click **Advanced Filters** to expand the filter panel
3. Set your desired filters (date range, endpoint, method, status code, response time)
4. Filters automatically sync to the URL bar

### Sharing Filters
1. With filters applied, click the **🔗 Share Filters** button
2. URL is automatically copied to your clipboard
3. Share the URL with colleagues via Slack, email, etc.
4. When they click the link, all filters are pre-applied

### Browser Navigation
- Click **back/forward** buttons in your browser
- Filter state is automatically restored when navigating

### Resetting Filters
- Click **Reset Filters** button to return to defaults
- URL is cleaned up, keeping only the date range for context

---

## For Developers

### Using the useUrlFilters Hook

```typescript
import { useUrlFilters } from '../hooks/useUrlFilters';
import { FilterState } from '../components/ExportControls';

export const MyDashboard: React.FC = () => {
  // Define default filters
  const defaultFilters: FilterState = {
    startDate: '2026-01-01',
    endDate: '2026-01-31',
    endpoint: '',
    method: '',
    statusCode: '',
    minResponseTime: 0,
    maxResponseTime: 10000,
  };

  // Initialize hook
  const { 
    filters,                    // Current filter state
    updateFilter,               // Update single filter
    setFilters,                 // Set all filters
    clearFilters,               // Reset to defaults
    getShareableUrl,            // Get URL with filters
    copyShareableUrl,           // Copy URL to clipboard
    isDefaultState              // Check if at defaults
  } = useUrlFilters({
    defaultFilters,
    syncToUrl: true,            // Sync to URL (default)
    pushHistory: false,         // Use replaceState (default)
    onFiltersChange: (filters) => {
      // Optional: called when filters change
      console.log('Filters updated:', filters);
    }
  });

  return (
    <>
      {/* Filter inputs */}
      <input
        value={filters.endpoint}
        onChange={(e) => updateFilter('endpoint', e.target.value)}
        placeholder="Filter by endpoint"
      />

      {/* Share button */}
      <button onClick={() => copyShareableUrl()}>
        🔗 Share Filters
      </button>

      {/* Reset button */}
      <button onClick={clearFilters}>
        Reset Filters
      </button>
    </>
  );
};
```

### URL Encoding Utilities

```typescript
import {
  encodeFiltersToUrl,
  decodeFiltersFromUrl,
  buildFilterUrl,
  filtersAreDefault,
} from '../utils/urlFilters';

// Encode filters to URL
const filters: FilterState = { /* ... */ };
const params = encodeFiltersToUrl(filters);
const urlString = params.toString();
// Result: "startDate=2026-01-01&endpoint=%2Fapi%2Fusers&..."

// Decode filters from URL
const searchParams = new URLSearchParams(window.location.search);
const restored = decodeFiltersFromUrl(searchParams, defaultFilters);

// Build complete URL
const url = buildFilterUrl('/logs', filters);
// Result: "/logs?startDate=...&endpoint=%2Fapi%2Fusers&..."

// Check if filters are default
if (!filtersAreDefault(filters, defaultFilters)) {
  console.log('User has applied custom filters');
}
```

---

## URL Structure

### Query Parameter Format

```
/path?startDate=2026-01-15&endDate=2026-01-31&endpoint=%2Fapi%2Fusers&method=GET
```

**Parameters:**
- `startDate` (string) - Start of date range (YYYY-MM-DD)
- `endDate` (string) - End of date range (YYYY-MM-DD)
- `endpoint` (string, URL-encoded) - Endpoint pattern (supports regex)
- `method` (string) - HTTP method (GET, POST, etc.)
- `statusCode` (string) - HTTP status class (2, 3, 4, 5)
- `minResponseTime` (number) - Minimum response time in ms (omitted if 0)
- `maxResponseTime` (number) - Maximum response time in ms (omitted if 10000)

### Examples

```
# Only endpoint filter
/logs?startDate=2026-01-01&endDate=2026-01-31&endpoint=%2Fapi%2Fusers

# Complex regex pattern
/logs?endpoint=%5E%2Fapi%2Fv%5B1-2%5D%2F.*

# Unicode in endpoint
/logs?endpoint=%2Fapi%2F%E7%94%A8%E6%88%B7

# Multiple filters
/logs?startDate=2026-01-15&endDate=2026-01-20&method=POST&statusCode=5&minResponseTime=500

# Query params in endpoint (encoded)
/logs?endpoint=%2Fapi%2Fsearch%3Fq%3Dtest%26filter%3Dvalue
```

---

## Testing

### Run All Filter Tests
```bash
npm run test:watch -- src/utils/__tests__/urlFilters
```

### Run Specific Test
```bash
npx jest src/utils/__tests__/urlFilters.test.ts --no-coverage
npx jest src/utils/__tests__/urlFilters.integration.test.ts --no-coverage
```

### Test Coverage
- 29 unit tests for encoding/decoding
- 18 integration tests for browser navigation and edge cases
- All 47 tests passing ✓

---

## Common Use Cases

### 1. Redirect with Pre-Applied Filters
```typescript
// Generate a link to dashboard with specific filters
const filters: FilterState = { /* ... */ };
const dashboardUrl = buildFilterUrl('/logs', filters);
window.location.href = dashboardUrl;
```

### 2. Share Filters via Email
```typescript
const handleEmailShare = async () => {
  const url = getShareableUrl(window.location.origin + '/logs');
  const subject = 'Check out these filtered logs';
  const body = `Click here to view: ${url}`;
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
};
```

### 3. Save Filter Presets
```typescript
// Save user's current filters to localStorage
const savePreset = (name: string) => {
  const preset = { name, filters };
  localStorage.setItem(`filterPreset_${name}`, JSON.stringify(preset));
};

// Load preset and apply
const loadPreset = (name: string) => {
  const preset = JSON.parse(localStorage.getItem(`filterPreset_${name}`) || '{}');
  setFilters(preset.filters);
};
```

### 4. Track Filter Analytics
```typescript
const { filters } = useUrlFilters({
  defaultFilters,
  onFiltersChange: (newFilters) => {
    // Send to analytics
    analytics.track('filters_changed', {
      endpoint: newFilters.endpoint,
      method: newFilters.method,
      statusCode: newFilters.statusCode,
    });
  }
});
```

---

## Browser Compatibility

✅ Works on all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

Uses standard APIs:
- `URLSearchParams` - For encoding/decoding
- `useSearchParams` (React Router 6) - For URL state
- `navigator.clipboard` - For copy to clipboard (with fallback)

---

## Troubleshooting

### Filters Not Persisting on Page Reload
- Ensure `useUrlFilters` hook is properly initialized
- Check that `syncToUrl: true` (default)
- Verify React Router BrowserRouter is wrapping your component

### URL Not Updating When Filters Change
- Verify `updateFilter()` or `setFilters()` is called
- Check browser DevTools to see if URL is changing
- Ensure no other code is overriding setSearchParams

### Share Button Not Working
- Check browser console for errors
- Verify `navigator.clipboard` is available (HTTPS required for security)
- Test with a different browser if possible

### Special Characters Not Encoded Properly
- URLSearchParams handles encoding automatically
- If manual encoding needed, use: `encodeURIComponent(value)`
- Avoid double-encoding (don't encode before passing to URLSearchParams)

---

## Performance Tips

1. **Don't update filters on every keystroke** - Debounce input changes
   ```typescript
   const [endpoint, setEndpoint] = useState('');
   const debouncedUpdate = useCallback(
     debounce((value) => updateFilter('endpoint', value), 500),
     [updateFilter]
   );
   ```

2. **Batch multiple filter updates** - Use `setFilters()` instead of multiple `updateFilter()` calls
   ```typescript
   setFilters(prev => ({
     ...prev,
     endpoint: '/api/users',
     method: 'GET',
     statusCode: '2'
   }));
   ```

3. **Cache shareable URLs** - Don't regenerate on every render
   ```typescript
   const shareUrl = useMemo(
     () => getShareableUrl(),
     [filters, getShareableUrl]
   );
   ```

---

## Related Documentation

- `URL_FILTER_STATE_IMPLEMENTATION.md` - Full technical documentation
- `URL_FILTER_VERIFICATION.md` - Verification and test results
- Source code: `src/hooks/useUrlFilters.ts`, `src/utils/urlFilters.ts`
- Tests: `src/utils/__tests__/urlFilters*.test.ts`
