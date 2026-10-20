# ProxyPay Dashboard - Deployment & Backend Integration Guide

## Dashboard Entry Point

The dashboard is a separate Vite application. The portal links to it through the
`VITE_DASHBOARD_URL` environment variable, which defines the intended dashboard
deployment URL.

### Configuring the entry point

Set `VITE_DASHBOARD_URL` in the portal's environment (e.g. `.env`):

```env
# Local development (Vite dev server default)
VITE_DASHBOARD_URL=http://localhost:3000

# Deployed dashboard
VITE_DASHBOARD_URL=https://dashboard.proxypay.com
```

When `VITE_DASHBOARD_URL` is set, the portal renders a clearly labeled
**Open Dashboard** link pointing at that URL.

### Fallback when the dashboard is not deployed

If `VITE_DASHBOARD_URL` is unset, the portal does not render a broken link.
Instead it shows environment-aware guidance:

- **Development** (`import.meta.env.DEV`): instructs you to run the dashboard
  locally with `cd dashboard && npm run dev` (defaults to
  `http://localhost:3000`).
- **Production**: indicates the dashboard is not configured and asks an
  administrator to set `VITE_DASHBOARD_URL`.

### Validating the entry point

1. Start the dashboard locally: `cd dashboard && npm run dev`.
2. Set `VITE_DASHBOARD_URL=http://localhost:3000` in the portal environment and
   start the portal.
3. Confirm the **Open Dashboard** link is visible and navigates to the running
   dashboard.
4. Unset `VITE_DASHBOARD_URL`, reload the portal, and confirm the fallback
   guidance is shown instead of a broken link.

---

## Backend API Requirements

Your ProxyPay backend must implement these endpoints:

### 1. Transactions Endpoints

#### GET /api/transactions
List transactions with optional filtering and pagination.

**Query Parameters:**
```
limit=50          // Items per page (default: 50, max: 1000)
offset=0          // Pagination offset (default: 0)
dateFrom=...      // ISO date string (optional)
dateTo=...        // ISO date string (optional)
status=settled    // pending|settled|failed (optional)
provider=vodafone // vodafone|mtn|airtel (optional)
```

**Response:**
```json
{
  "data": [
    {
      "id": "tx_123456",
      "reference": "REF-001",
      "stellarHash": "abc123def456...",
      "mobileMoneyReference": "MM-789012",
      "amount": 100.00,
      "fee": 2.50,
      "feeBreakdown": {
        "platformFee": 1.00,
        "networkFee": 0.75,
        "providerFee": 0.75
      },
      "status": "settled",
      "provider": "vodafone",
      "timestamp": "2024-07-29T10:30:00Z",
      "settledAt": "2024-07-29T10:35:00Z",
      "failureReason": null,
      "auditTrail": [
        {
          "timestamp": "2024-07-29T10:30:00Z",
          "event": "transaction.created",
          "details": "Transaction initiated",
          "actor": "api_user_123"
        },
        {
          "timestamp": "2024-07-29T10:35:00Z",
          "event": "transaction.settled",
          "details": "Funds settled to account",
          "actor": "system"
        }
      ]
    }
  ],
  "total": 1500
}
```

#### GET /api/transactions/:id
Get full details for a specific transaction.

**Response:**
```json
{
  "id": "tx_123456",
  // ... same as above ...
}
```

---

### 2. Notification Settings Endpoints

#### GET /api/notifications/settings
Get current notification configuration for the authenticated user.

**Response:**
```json
{
  "settings": [
    {
      "eventType": "payment.settled",
      "emailEnabled": true,
      "webhookEnabled": true
    },
    {
      "eventType": "payment.failed",
      "emailEnabled": true,
      "webhookEnabled": false
    },
    {
      "eventType": "kyc.status_changed",
      "emailEnabled": false,
      "webhookEnabled": true
    },
    {
      "eventType": "refund.initiated",
      "emailEnabled": true,
      "webhookEnabled": true
    }
  ]
}
```

#### PUT /api/notifications/settings/:eventType
Update notification settings for a specific event type.

**Request Body:**
```json
{
  "emailEnabled": true,
  "webhookEnabled": false
}
```

**Response:**
```json
{
  "eventType": "payment.settled",
  "emailEnabled": true,
  "webhookEnabled": false
}
```

#### POST /api/notifications/webhook/test
Send a sample webhook to the configured endpoint. The dashboard retries transient
network and server errors up to two times.

**Request Body:**
```json
{
  "id": "webhook-test-1720000000000",
  "eventType": "payment.settled",
  "createdAt": "2024-07-03T12:00:00.000Z",
  "data": {
    "test": true,
    "message": "This is a test webhook from ProxyPay."
  }
}
```

The endpoint response status and body are shown in the dashboard, along with
request and response timestamps. Test results are retained in the current
settings-page session.

---

### 3. Health Check Endpoint

#### GET /api/health
Simple health check for connectivity verification.

**Response:**
```json
{
  "status": "ok"
}
```

---

## Authentication

The dashboard supports token-based authentication:

### Setup Steps

1. **Obtain Authentication Token**
   - User logs in to your backend
   - Backend returns JWT token
   - Store token in localStorage

2. **Pass Token to Dashboard**
   ```javascript
   // In your login/auth page
   localStorage.setItem('auth_token', jwtToken)
   // Navigate to dashboard
   window.location.href = '/dashboard'
   ```

3. **Dashboard Automatically Includes Token**
   - ProxyPayAPI in `src/services/api.ts` checks for token
   - Automatically adds `Authorization: Bearer {token}` header
   - Token included in all API requests

### Alternative: Custom Header

Edit `src/services/api.ts`:
```typescript
class ProxyPayAPI {
  constructor(baseURL = '/api') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.VITE_API_KEY, // Custom header
      },
    })
  }
}
```

---

## Deployment Scenarios

### Scenario 1: Local Development

**Backend:** http://localhost:3001
**Dashboard:** http://localhost:3000

```bash
cd dashboard
npm install
npm run dev
```

Vite automatically proxies `/api/*` to `http://localhost:3001`.

### Scenario 2: Separate Domain (CORS Required)

**Backend:** https://api.proxypay.com
**Dashboard:** https://dashboard.proxypay.com

1. Update API base URL:
   ```typescript
   // src/services/api.ts
   constructor(baseURL = 'https://api.proxypay.com/api')
   ```

2. Backend must implement CORS:
   ```
   Access-Control-Allow-Origin: https://dashboard.proxypay.com
   Access-Control-Allow-Methods: GET, PUT, OPTIONS
   Access-Control-Allow-Headers: Content-Type, Authorization
   Access-Control-Allow-Credentials: true
   ```

  Use an exact allow-origin value for the dashboard, never `*` for authenticated APIs. Browsers reject wildcard origins when credentials are enabled. The dashboard settings view reports CORS headers observed on successful cross-origin responses; it cannot inspect responses blocked by the browser, so verify the server policy and preflight behavior at the API or reverse proxy as well.

### Scenario 3: Same Domain

**Backend:** https://proxypay.com/api
**Dashboard:** https://proxypay.com/dashboard

No CORS needed. Configure reverse proxy (nginx/Apache):

**Nginx:**
```nginx
location /api/ {
  proxy_pass http://backend:3001/;
}

location /dashboard/ {
  proxy_pass http://frontend:3000/;
}
```

---

## Building for Production

### Step 1: Install Dependencies
```bash
cd dashboard
npm install
```

### Step 2: Set Environment Variables
Create `.env.production`:
```env
VITE_API_BASE_URL=https://api.proxypay.com
```

### Step 3: Build
```bash
npm run build
```

Output in `dist/` directory.

### Step 4: Serve
```bash
npm run preview
```

Or deploy `dist/` to static hosting (AWS S3, Netlify, Vercel, etc).

---

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
RUN npm install -g serve
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

### Build and Run
```bash
docker build -t proxypay-dashboard .
docker run -p 3000:3000 \
  -e VITE_API_BASE_URL=https://api.proxypay.com \
  proxypay-dashboard
```

---

## Kubernetes Deployment

### ConfigMap for Environment
```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-config
data:
  VITE_API_BASE_URL: "https://api.proxypay.com"
```

### Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: proxypay-dashboard
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dashboard
  template:
    metadata:
      labels:
        app: dashboard
    spec:
      containers:
      - name: dashboard
        image: proxypay-dashboard:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: dashboard-config
        resources:
          limits:
            memory: "256Mi"
            cpu: "250m"
          requests:
            memory: "128Mi"
            cpu: "100m"
```

### Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: dashboard-service
spec:
  selector:
    app: dashboard
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: LoadBalancer
```

Deploy:
```bash
kubectl apply -f configmap.yaml
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
```

---

## AWS S3 + CloudFront Deployment

### Build & Upload to S3
```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://proxypay-dashboard --delete
```

### CloudFront Distribution
- Origin: S3 bucket
- Default root object: `index.html`
- Error document: `index.html` (for SPA routing)
- Cache behavior: `index.html` no-cache, assets long-cache

---

## Troubleshooting

### Dashboard link missing in portal
- Confirm `VITE_DASHBOARD_URL` is set in the portal environment.
- Restart the portal dev server after changing env vars (Vite reads them at startup).

### CORS errors
- Verify `Access-Control-Allow-Origin` matches the dashboard origin exactly.
- Ensure `Access-Control-Allow-Credentials: true` when sending auth cookies.

### 401 Unauthorized
- Confirm `auth_token` is present in localStorage.
- Verify the backend accepts the `Authorization: Bearer {token}` header.
