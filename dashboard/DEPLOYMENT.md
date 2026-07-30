# ProxyPay Dashboard - Deployment & Backend Integration Guide

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
aws s3 sync dist/ s3://proxypay-dashboard/

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

### S3 Bucket Configuration
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::proxypay-dashboard/*"
    }
  ]
}
```

### CloudFront Distribution
- Origin: S3 bucket
- Default root object: `index.html`
- Error 404 → `index.html` (for SPA routing)
- HTTPS only
- Gzip compression enabled

---

## Vercel Deployment

### Connect Repository
1. Push dashboard code to GitHub
2. Go to vercel.com
3. Import project
4. Select `dashboard` as root directory

### Environment Variables
In Vercel dashboard:
```
VITE_API_BASE_URL = https://api.proxypay.com
```

### Auto-Deploy
On push to main branch, Vercel automatically:
1. Installs dependencies
2. Builds project
3. Deploys to CDN

---

## Netlify Deployment

### netlify.toml
```toml
[build]
command = "npm run build"
publish = "dist"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200

[env]
  [env.production]
    VITE_API_BASE_URL = "https://api.proxypay.com"
```

Deploy:
```bash
npm install -g netlify-cli
netlify deploy --prod
```

---

## Performance Optimization

### Compression
Enable gzip on server:
```nginx
gzip on;
gzip_types text/plain text/css text/javascript application/json;
gzip_min_length 1000;
```

### Caching
```nginx
location ~* \.(js|css|png|jpg)$ {
  expires 365d;
  add_header Cache-Control "public, immutable";
}

location /index.html {
  expires 0;
  add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```

### CDN
Use CloudFront, Cloudflare, or Akamai for global distribution.

---

## Monitoring & Logging

### Application Errors
Integrate error tracking (Sentry, Rollbar):

```typescript
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  environment: process.env.NODE_ENV,
})
```

### Analytics
Track user behavior (Google Analytics, Mixpanel):

```typescript
gtag('event', 'transaction_view', {
  transaction_id: tx.id,
  amount: tx.amount,
})
```

### Server Logs
Monitor API errors:
```bash
# Real-time logs
kubectl logs -f deployment/proxypay-dashboard

# AWS CloudWatch
aws logs tail /aws/lambda/dashboard --follow
```

---

## Security Checklist

- [ ] HTTPS only (no HTTP)
- [ ] CORS headers properly configured
- [ ] Auth tokens stored securely (httpOnly cookies better than localStorage)
- [ ] Rate limiting on API endpoints
- [ ] Input validation on both frontend and backend
- [ ] No sensitive data in localStorage
- [ ] Security headers (CSP, X-Frame-Options, etc)
- [ ] Regular dependency updates
- [ ] SSL certificate valid and up-to-date
- [ ] API authentication required
- [ ] Data encryption in transit and at rest

---

## Troubleshooting

### CORS Errors
**Error:** `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution:**
1. Backend must send proper CORS headers
2. Or use JSONP/proxy
3. Or deploy to same domain

### 404 on SPA Routes
**Error:** Direct URL gives 404

**Solution:** Configure server to return `index.html` for all routes

```nginx
error_page 404 =200 /index.html;
```

### Environment Variables Not Loading
**Solution:**
1. Restart dev server
2. Check `.env` file exists
3. Use `VITE_` prefix for frontend env vars
4. Restart build after env changes

### Slow API Responses
**Solution:**
1. Add pagination
2. Reduce dataset size
3. Add backend caching
4. Optimize database queries
5. Use CDN for assets

---

## Support

For issues or questions:
1. Check QUICKSTART.md for common setup
2. Review ARCHITECTURE.md for design details
3. Check browser console for errors
4. Review network tab in DevTools
5. Check backend API logs

---

**Ready to deploy!** 🚀
