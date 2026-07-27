# Fix CORS Issues When Testing Local Backend

## Summary

Developers running the docs site (`localhost:3001`) alongside the ProxyPay backend
(`localhost:3000`) hit a **CORS error** the moment the Redoc widget tries to load the
OpenAPI spec from the backend. The browser blocks the cross-origin request silently,
leaving no actionable message — only a blank API reference page and a cryptic console error.

This PR addresses all four acceptance criteria from issue #222:

| Criterion | Delivered |
|---|---|
| CORS proxy available for local testing | ✅ webpack dev-server proxy at `/api-proxy` |
| Config docs updated | ✅ README section + inline code comments |
| Error message explains CORS issue | ✅ In-page banner with cause + fix steps |
| Workaround provided | ✅ Four workarounds documented |

---

## Changes

### `docusaurus.config.ts`

Added a Docusaurus plugin (`corsProxyPlugin`) that configures the **webpack dev-server
proxy** to forward all `/api-proxy/*` requests to the local backend:

```
Browser → http://localhost:3001/api-proxy/docs/openapi.json
Dev-server → http://localhost:3000/docs/openapi.json   (same machine, no CORS)
```

Key details:
- **Default target**: `http://localhost:3000` (matches the default backend port).
- **Override at startup**: `BACKEND_URL=http://localhost:8080 npm start`
- **Path rewriting**: `/api-proxy` prefix is stripped before forwarding.
- **`changeOrigin: true`**: rewrites the `Host` header so the backend accepts the request.
- **`onError` handler**: returns a readable `502` JSON response if the backend is unreachable,
  instead of a silent connection failure.
- **`customFields.backendUrl`**: exposes the resolved backend URL to client components via
  `useDocusaurusContext()`.
- **Production safe**: the proxy is part of `devServer` config and has **zero effect** on
  production builds (`npm run build`).

```typescript
// docusaurus.config.ts (excerpt)
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

plugins: [
  function corsProxyPlugin() {
    return {
      name: 'cors-proxy-plugin',
      configureWebpack() {
        return {
          mergeStrategy: { 'devServer.proxy': 'replace' },
          devServer: {
            proxy: [{
              context: ['/api-proxy'],
              target: BACKEND_URL,
              pathRewrite: { '^/api-proxy': '' },
              changeOrigin: true,
              secure: false,
            }],
          },
        };
      },
    };
  },
],
```

---

### `src/components/ApiReference.tsx`

Rewrote the component with full CORS-awareness:

**`isCorsLikeError(err, specUrl)`**
- Inspects the error type (`TypeError`) and message keywords (`failed to fetch`,
  `NetworkError`, etc.).
- Cross-checks with the spec URL's origin: only flags it as CORS when the URL is
  actually cross-origin. Avoids false positives for same-origin network failures.

**`CorsErrorBanner`**
- Replaces the blank Redoc frame with a styled alert that:
  - States _why_ the error occurred (same-origin policy, different ports).
  - Lists four ranked workarounds with ready-to-copy commands.
  - Provides a **Retry** button that remounts Redoc without a page reload.
  - Includes a link to the MDN CORS docs.
- Dynamically adapts: when running on `localhost` it shows the exact proxy URL;
  on other hosts it gives generic guidance.

**`GenericErrorBanner`**
- Catches non-CORS load failures (backend down, malformed YAML, etc.) and shows a
  focused error with the raw message and a link to the README.

**Spec URL override**
- Reads `?spec=<url>` from the query string so developers can test different backends
  without changing code:
  ```
  http://localhost:3001/api?spec=/api-proxy/docs/openapi.json
  ```

**Console guidance**
- On a CORS error, logs a formatted message with the exact commands to resolve it
  (proxy startup command, `cp` command for local spec copy).

**`onLoaded` hook**
- Wires Redoc's load callback to the error handler so failures surface immediately.

---

### `README.md`

Added a **"Testing against a local backend"** section (≈ 90 lines) covering:

1. **Why CORS errors occur** — plain-language explanation of the same-origin policy.
2. **Workaround 1 — Dev-server proxy** (recommended) — startup command, `?spec=` URL,
   and `BACKEND_URL` env var override.
3. **Workaround 2 — Copy spec locally** — `cp` and `curl` one-liners.
4. **Workaround 3 — Enable CORS on the backend** — NestJS and Express snippets with a
   warning against `origin: '*'` in production.
5. **Workaround 4 — Disable browser CORS** — Chrome flags for macOS and Linux, with a
   clear "last resort / local only" caveat.
6. **UI error message description** — what the in-page banner looks like and what it does.

---

## How to test

### Proxy workaround
```bash
# Terminal 1 — start the backend (must serve /docs/openapi.json)
cd ../proxypay && npm start

# Terminal 2 — start the docs site
cd proxypay-frontend && npm start

# Browser
open http://localhost:3001/api?spec=/api-proxy/docs/openapi.json
# Expected: Redoc loads the spec through the proxy with no CORS error
```

### CORS error banner
```bash
# Start docs WITHOUT a running backend
npm start

# Browser
open http://localhost:3001/api?spec=http://localhost:3000/docs/openapi.json
# Expected: CorsErrorBanner is rendered with workaround steps and a Retry button
```

### BACKEND_URL override
```bash
BACKEND_URL=http://localhost:8080 npm start
# Proxy now forwards /api-proxy/* → http://localhost:8080/*
```

### Static spec (no backend needed)
```bash
curl http://localhost:3000/docs/openapi.json -o static/openapi.yaml
npm start
open http://localhost:3001/api
# Expected: Redoc loads /openapi.yaml — zero cross-origin requests
```

---

## Notes

- No new runtime dependencies added.
- All changes are backwards-compatible: default behaviour (static `/openapi.yaml`) is
  unchanged; the proxy and error banner only activate when needed.
- The proxy is webpack dev-server only — it does **not** affect `npm run build` output.

---

closes #222
