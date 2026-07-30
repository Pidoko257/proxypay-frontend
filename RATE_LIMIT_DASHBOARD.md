# Rate Limit Dashboard

A client-facing dashboard component for monitoring API rate limit status and usage in real-time.

## Features

- **Real-time Status Monitoring**: Displays current rate limit usage with visual progress bars
- **Health Indicators**: Status badges showing OK, Warning, or Critical states
- **Endpoint Usage Breakdown**: Table view of individual endpoint usage
- **Auto-refresh**: Optional automatic polling with configurable interval
- **Responsive Design**: Fully mobile-responsive interface
- **Smart Alerts**: Context-aware alerts based on usage thresholds
- **Plan Details**: Shows current tier, reset time, and time remaining
- **Help Section**: Built-in tips for optimizing API usage

## Component Structure

### Main Component: `RateLimitDashboard`

Located in `src/components/RateLimitDashboard.tsx`

```tsx
import RateLimitDashboard from '@site/src/components/RateLimitDashboard';

export default function MyPage() {
  return <RateLimitDashboard />;
}
```

### Page: `rate-limits.tsx`

A dedicated page showing the full dashboard at `/rate-limits`.

## Data Structure

The component expects rate limit status data with the following structure:

```typescript
interface RateLimitStatus {
  tier: string;                          // e.g., "Pro", "Enterprise"
  requestsLimit: number;                 // Total requests in period
  requestsUsed: number;                  // Requests already used
  requestsRemaining: number;             // Requests available
  resetTime: string;                     // ISO 8601 date string
  resetTimestamp: number;                // Unix timestamp (ms)
  percentageUsed: number;                // 0-100
  endpoints: EndpointUsage[];            // Per-endpoint usage
}

interface EndpointUsage {
  path: string;                          // e.g., "/api/transactions"
  method: string;                        // e.g., "GET", "POST"
  requestsUsed: number;                  // Requests used for this endpoint
  limit: number;                         // Limit for this endpoint
}
```

## API Integration

### Production Mode

To connect to a real API, modify `DEMO_MODE` constant in `RateLimitDashboard.tsx`:

```typescript
const DEMO_MODE = false;
```

The component will then fetch from `/api/rate-limit-status` with the following:

```typescript
const response = await fetch('/api/rate-limit-status', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('api_token')}`,
    'Content-Type': 'application/json',
  },
});
```

### Expected API Response

```json
{
  "tier": "Pro",
  "requestsLimit": 5000,
  "requestsUsed": 1250,
  "requestsRemaining": 3750,
  "resetTime": "2024-07-30T15:30:00Z",
  "resetTimestamp": 1722352200000,
  "percentageUsed": 25,
  "endpoints": [
    {
      "path": "/api/transactions",
      "method": "GET",
      "requestsUsed": 500,
      "limit": 1000
    }
  ]
}
```

## Status Levels

The dashboard automatically determines status based on usage percentage:

| Usage  | Status    | Color    | Behavior                      |
|--------|-----------|----------|-------------------------------|
| 0-70%  | OK        | Green    | No warnings, normal operation |
| 70-90% | Warning   | Orange   | Optimization suggestions      |
| 90%+   | Critical  | Red      | Urgent action recommended     |

## Configuration

Edit constants in `RateLimitDashboard.tsx`:

```typescript
// Polling interval in milliseconds
const POLLING_INTERVAL = 30000; // 30 seconds

// Use mock data (true) or real API (false)
const DEMO_MODE = true;
```

## Styling

All styles are in `src/css/custom.css` under the `/* ── Rate Limit Dashboard ──────────────────────────────────────────────────── */` section.

### CSS Variables Used

- `--ifm-color-primary`: Primary green
- `--ifm-color-primary-dark`: Darker green
- `--ifm-color-emphasis-*`: Various emphasis levels
- `--ifm-background-*`: Background colors
- `--ifm-font-color-base`: Text color

### Key Classes

- `.rate-limit-dashboard`: Main container
- `.rate-limit-card`: Overview cards
- `.rate-limit-table`: Endpoint usage table
- `.rate-limit-alert`: Alert messages
- `.rate-limit-progress-bar`: Usage progress visualization

## Components

### ProgressBar
Displays usage with visual bar and percentage.

```tsx
<ProgressBar
  used={123}
  limit={1000}
  status="ok"
/>
```

### StatusBadge
Shows health status indicator.

```tsx
<StatusBadge status="warning" />
// Output: ● Warning
```

### Alert
Contextual alert message.

```tsx
<Alert alert={{
  level: 'critical',
  message: 'You have used 90% or more of your rate limit.',
  timestamp: Date.now(),
}} />
```

### EndpointUsageRow
Table row for individual endpoint usage.

```tsx
<EndpointUsageRow endpoint={endpointData} />
```

## User Features

### Auto-refresh Toggle
Users can enable/disable automatic status polling via checkbox. When enabled, data refreshes every 30 seconds.

### Manual Refresh
"Refresh" button allows immediate data fetch.

### Last Updated Timestamp
Shows when data was last fetched with human-readable timestamp.

### Tips Section
Built-in help content with best practices:
- Use webhooks instead of polling
- Batch requests
- Implement caching
- Use exponential backoff
- Monitor usage patterns

## Mobile Responsiveness

- Desktop: 2-column cards, full table
- Tablet (≤768px): Single-column cards, condensed table
- Mobile (≤480px): Stacked layout, minimal padding

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Color-coded status is supplemented with text labels
- Keyboard navigation support
- Clear loading and error states

## Error Handling

- Displays error message if API fetch fails
- "Try Again" button to retry failed requests
- Graceful fallback with meaningful error text

## Loading States

- Spinner animation while fetching data
- Disabled refresh button during loading
- "Updating…" text on button

## Demo Mode

By default, the component runs in `DEMO_MODE = true`, which:

- Generates realistic mock data
- Simulates 500ms fetch delay
- Includes various usage scenarios
- Useful for testing and development

To test with different data, modify the `generateMockStatus()` function.

## Usage Examples

### Embed in Documentation Page

```tsx
import RateLimitDashboard from '@site/src/components/RateLimitDashboard';

export default function DocPage() {
  return (
    <div>
      <h1>Monitor Your Usage</h1>
      <RateLimitDashboard />
    </div>
  );
}
```

### Standalone Route

Access at `/rate-limits` (already configured in `src/pages/rate-limits.tsx`)

### Dashboard Tab in Application

```tsx
import RateLimitDashboard from '@site/src/components/RateLimitDashboard';

export default function Dashboard() {
  return (
    <div className="dashboard">
      <RateLimitDashboard />
    </div>
  );
}
```

## Testing

The component is fully functional in demo mode. Test features:

1. **Auto-refresh**: Toggle checkbox to see updates every 30 seconds
2. **Manual refresh**: Click button to fetch new data
3. **Responsive**: Resize window to test mobile layouts
4. **Alert handling**: Note different alert levels based on usage

## Future Enhancements

- Graphical trends (usage over time)
- Export usage data (CSV/PDF)
- Usage alerts and notifications
- Predictive rate limit exhaustion
- Integration with billing information
- Webhook event tracking
- Custom alert thresholds
- Usage forecast based on historical data

## Development Notes

- Uses React hooks for state management
- No external UI libraries (pure CSS)
- TypeScript interfaces for type safety
- Responsive with mobile-first approach
- Accessibility-compliant design
- Performance optimized with callbacks and memoization
