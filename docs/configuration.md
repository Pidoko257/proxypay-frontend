# Configuration Guide

This document describes the environment variables used to configure the ProxyPay API Docs Portal.

## Environment Variables

Create a `.env` file at the project root (next to `package.json`) and set the variables below.
All variables must be prefixed with `REACT_APP_` to be picked up by the build toolchain.

---

### `REACT_APP_DEMO_MODE`

Controls whether the **Rate Limit Dashboard** uses mock data or connects to the real ProxyPay API.

| Value | Behaviour |
|-------|-----------|
| `true` (default) | Mock data is generated locally. No backend required. |
| `false` | Live data is fetched from the real API endpoint. |

**Default:** `true` — the dashboard works out-of-the-box without a running backend.

**To enable production mode**, set:

```env
REACT_APP_DEMO_MODE=false
```

---

### `REACT_APP_API_BASE_URL`

The base URL of the ProxyPay backend that the Rate Limit Dashboard calls in production mode.
Omit the trailing slash.

| Value | Behaviour |
|-------|-----------|
| *(empty, default)* | Requests go to the same origin (relative URLs). Useful when the docs portal and API are served from the same host. |
| `https://api.proxypay.io` | Requests are sent to the specified host. |

**Example:**

```env
REACT_APP_API_BASE_URL=https://api.proxypay.io
```

The dashboard will call `${REACT_APP_API_BASE_URL}/api/rate-limit/status`.

---

## Example `.env` Files

### Local development (demo mode — default)

```env
# No extra configuration needed.
# DEMO_MODE defaults to true so mock data is used automatically.
```

### Staging / production

```env
REACT_APP_DEMO_MODE=false
REACT_APP_API_BASE_URL=https://staging-api.proxypay.io
```

### Production

```env
REACT_APP_DEMO_MODE=false
REACT_APP_API_BASE_URL=https://api.proxypay.io
```

---

## Behaviour Comparison

| Feature | Demo mode (`true`) | Production mode (`false`) |
|---------|-------------------|--------------------------|
| Data source | Randomly generated mock data | Live API: `GET /api/rate-limit/status` |
| Authentication | Not required | `Authorization: Bearer <api_token>` from `localStorage` |
| Auto-refresh | ✓ (polls every 30 s with mock data) | ✓ (polls every 30 s against the real endpoint) |
| Retry on failure | N/A | Exponential back-off, up to 3 attempts |
| Error display | N/A | User-friendly error with "Try Again" button |

---

## Authentication in Production Mode

When `REACT_APP_DEMO_MODE=false`, the dashboard reads `api_token` from
`localStorage` and sends it as a Bearer token:

```
Authorization: Bearer <token>
```

Store the token before the page loads:

```js
localStorage.setItem('api_token', '<your-token>');
```

If no token is present, the header is sent with an empty value and the server
will respond with `401 Unauthorized` — the dashboard will show the error state
and offer a "Try Again" button.

---

## Adding More Variables

Add new variables to this file and prefix them with `REACT_APP_`.
Never commit real secrets (tokens, passwords) to `.env` — use `.env.local`
(already in `.gitignore`) for local secrets.
