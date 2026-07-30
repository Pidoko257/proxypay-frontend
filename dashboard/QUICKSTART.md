# ProxyPay Dashboard - Quick Start Guide

## Installation & Setup

### 1. Install Dependencies
```bash
cd dashboard
npm install
```

### 2. Configure Backend API

Update the API base URL in `src/services/api.ts`:

```typescript
class ProxyPayAPI {
  private client: AxiosInstance

  constructor(baseURL = '/api') {
    // Update baseURL to match your backend
    // Default: '/api' (proxied to http://localhost:3001)
  }
}
```

If using Vite dev server, the default proxy is configured in `vite.config.ts`:
- Local requests to `/api` → `http://localhost:3001`

### 3. Backend API Requirements

Your ProxyPay backend must provide these endpoints:

**Transactions**
- `GET /api/transactions?limit=50&offset=0&dateFrom=...&dateTo=...&status=...&provider=...`
  - Returns: `{ data: Transaction[], total: number }`
- `GET /api/transactions/:id`
  - Returns: `Transaction`

**Notifications**
- `GET /api/notifications/settings`
  - Returns: `{ settings: NotificationSettings[] }`
- `PUT /api/notifications/settings/:eventType`
  - Body: `{ emailEnabled: boolean, webhookEnabled: boolean }`
  - Returns: `NotificationSettings`

**Health**
- `GET /api/health`
  - Returns: `{ status: "ok" }`

### 4. Authentication

If your API requires authentication, add your token to localStorage:

```javascript
localStorage.setItem('auth_token', 'your_jwt_token_here')
```

The API client automatically includes this in the `Authorization: Bearer` header.

## Development Server

```bash
npm run dev
```

Opens at `http://localhost:3000`

### Hot Module Reloading
Changes to React components, styles, and state are instantly reflected in the browser.

## Building for Production

```bash
npm run build
```

Outputs optimized bundle to `dist/` directory.

### Preview Production Build
```bash
npm run preview
```

## Features Guide

### 📊 Transactions Page

1. **View Transactions**
   - Transactions list loads automatically on page visit
   - Click any row to see full details in side drawer
   - Sort by clicking column headers
   - Status indicators: Green (settled), Yellow (pending), Red (failed)

2. **Export Transactions**
   - Click "Export CSV" button
   - Choose to include audit trail (optional)
   - See progress bar for large exports (10,000+ rows)
   - Downloaded file includes all visible transactions with applied filters

3. **Transaction Details Drawer**
   - Opens on right side when clicking a transaction
   - Close with: Escape key, X button, or click overlay
   - Shows: Stellar hash, mobile money reference, fees, timestamps, audit events
   - Maintains page state (doesn't navigate)

### 🔔 Notification Settings Page

1. **Configure Notifications**
   - Toggle email notifications per event type
   - Toggle webhook notifications per event type
   - Changes save immediately with optimistic UI
   - Rolls back if API call fails

2. **Event Types** (examples)
   - `payment.settled` - Payment successfully settled
   - `payment.failed` - Payment failed
   - `kyc.status_changed` - KYC status update
   - Custom events based on your backend

## Environment Variables

Create `.env` file in dashboard directory:

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3001

# Feature Flags
VITE_ENABLE_AUDIT_TRAIL=true
```

Access in code:
```typescript
const apiBase = import.meta.env.VITE_API_BASE_URL
```

## Troubleshooting

### API Connection Issues
- Check that backend is running on correct port
- Verify CORS headers if accessing different domain
- Check browser console for CORS errors

### CSV Export Not Working
- Ensure transactions are loaded
- Check browser console for errors
- Large exports may take time (shows progress)

### Notification Settings Not Updating
- Verify API endpoint is correct
- Check network tab in DevTools for failed requests
- Look for error toast notification

### TypeScript Errors
Run type check:
```bash
npm run type-check
```

## Performance Tips

- Limit transactions to 50-100 per page for best performance
- Large exports (10,000+) show progress indication
- Browser will handle CSV generation client-side
- For very large datasets, consider server-side CSV generation

## Browser DevTools

### React DevTools
Install React DevTools extension to inspect component state

### Network Tab
Monitor API calls and response times

### Performance Tab
Profile rendering performance

## Deployment

### Vercel
```bash
npm run build
# Deploy 'dist' folder to Vercel
```

### Netlify
```bash
npm run build
# Deploy 'dist' folder to Netlify
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Support & Issues

- Check README.md for full documentation
- Review component source code for implementation details
- Check API response format if data not displaying

---

**Happy coding!** 🚀
