# ProxyPay Transaction Dashboard

A modern React-based dashboard for viewing transaction history, exporting data as CSV, and managing notification settings for the ProxyPay mobile money ↔ Stellar bridge.

## Features

### 📊 Transaction Management
- **Transaction List**: Browse and search transaction history with sorting and filtering
- **Detailed View**: Click any transaction to open a right-side drawer with full details
  - Stellar transaction hash
  - Mobile money reference
  - Fee breakdown (platform, network, provider)
  - Timestamps and settlement information
  - Audit trail of all events

### 📥 CSV Export
- Export filtered transaction data to CSV format
- Respects active filters (date range, status, provider)
- Optional audit trail inclusion
- Progress indication for large datasets (10,000+ rows)
- No backend round-trip for client-side exports

### 🔔 Notification Settings
- Configure which events trigger notifications
- Independent email and webhook toggles per event type
- Optimistic UI updates with rollback on failure
- Real-time sync with backend

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Date Handling**: date-fns
- **Icons**: Lucide React
- **Styling**: CSS3 with CSS variables

## Getting Started

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Starts the development server at `http://localhost:3000` with API proxy to `http://localhost:3001`.

### Build

```bash
npm run build
```

Produces optimized production build in `dist/`.

### Preview

```bash
npm run preview
```

### Linting & Type Checking

```bash
npm run lint          # ESLint
npm run type-check    # TypeScript
```

## Project Structure

```
src/
├── components/           # React components
│   ├── TransactionsTable.tsx    # Main transaction list
│   ├── TransactionDrawer.tsx    # Detail sidebar drawer
│   ├── ExportButton.tsx         # CSV export functionality
│   └── NotificationSettings.tsx # Notification config page
├── services/            # API & utility services
│   ├── api.ts          # ProxyPay API client
│   └── csv.ts          # CSV export utilities
├── stores/             # Zustand state stores
│   ├── transactionStore.ts
│   └── notificationStore.ts
├── styles/             # Component stylesheets
├── App.tsx             # Main app component
├── App.css             # Global app styles
├── index.css           # CSS variables & global styles
└── main.tsx            # React entry point
```

## API Integration

The dashboard connects to a ProxyPay backend API at `/api`. Update the base URL in `src/services/api.ts` if needed.

### Required Endpoints

- `GET /api/transactions` - List transactions with filters
- `GET /api/transactions/:id` - Get transaction detail
- `GET /api/notifications/settings` - Fetch notification config
- `PUT /api/notifications/settings/:eventType` - Update notification setting
- `GET /api/health` - Health check

### Transaction Data Model

```typescript
interface Transaction {
  id: string
  reference: string
  stellarHash: string
  mobileMoneyReference: string
  amount: number
  fee: number
  feeBreakdown: {
    platformFee: number
    networkFee: number
    providerFee: number
  }
  status: 'pending' | 'settled' | 'failed'
  provider: 'vodafone' | 'mtn' | 'airtel'
  timestamp: string
  settledAt?: string
  failureReason?: string
  auditTrail: AuditEvent[]
}
```

## CSV Export Features

- **Client-side Processing**: Transactions under 10,000 rows are processed locally (no backend call)
- **Progress Indication**: Large exports show real-time progress bar
- **Optional Audit Trail**: Include full audit history in export
- **Proper Escaping**: Handles commas, quotes, and newlines in data
- **Timestamp-based Filenames**: Auto-generated filenames include date and time

## Notification Settings

- **Optimistic Updates**: UI updates immediately while API call completes
- **Rollback on Error**: Changes revert if API call fails
- **Error Handling**: Toast-style alerts for errors
- **Event Types**: Customizable event types (e.g., `payment.settled`, `kyc.status_changed`)

## Keyboard Shortcuts

- **Escape** - Close transaction detail drawer

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (responsive design)

## Performance Optimizations

- Code splitting with Vite
- CSS-in-JS eliminated for faster runtime
- Efficient re-renders with Zustand
- Lazy loading of large datasets
- Minimal bundle size (~200KB gzipped)

## Accessibility

- Semantic HTML elements
- ARIA labels for interactive elements
- Keyboard navigation support
- High contrast color scheme
- Responsive design for all screen sizes

## Security

- CORS-aware API requests
- Auth token support via localStorage
- Input validation and sanitization in CSV export
- Secure credential handling

## Development Notes

### Adding a New Page

1. Create component in `src/components/`
2. Add route to `App.tsx` nav tabs
3. Add page styling in `src/styles/`

### Adding API Endpoints

1. Extend `ProxyPayAPI` class in `src/services/api.ts`
2. Add TypeScript types for request/response
3. Create Zustand store actions if needed

### Styling

Uses CSS variables defined in `src/index.css`. Update variables to customize theme globally.

## License

ProxyPay © 2024
