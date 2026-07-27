# ProxyPay API Docs Portal

Docusaurus-based documentation site for the ProxyPay — Mobile Money ↔ Stellar Bridge API.

## Getting started

```bash
npm install
npm start        # dev server on http://localhost:3001
npm run build    # production build → build/
npm run serve    # serve the production build locally
```

## OpenAPI spec

The API reference page (`/api`) is powered by [Redoc](https://redocly.com/redoc/).
It reads `static/openapi.yaml` at build time.

To populate the spec from the backend:
- **Option A** — copy manually: `cp ../proxypay/openapi.yaml ./static/openapi.yaml`
- **Option B** — fetch from a running backend: `curl http://localhost:3000/docs/openapi.json -o static/openapi.yaml`

A placeholder spec is committed so the project builds out of the box.

---

## Testing against a local backend

When you run the docs site (`npm start`, port `3001`) alongside a local backend
(port `3000`), the browser will block direct cross-origin requests with a
**CORS error**. This section explains why that happens and the available
workarounds.

### Why CORS errors occur

Browsers enforce the _same-origin policy_: a page served from
`http://localhost:3001` cannot fetch resources from `http://localhost:3000`
unless the server explicitly allows it with
`Access-Control-Allow-Origin` response headers. The backend may not have those
headers enabled in development, so the browser silently blocks the request.

---

### Workaround 1 — Dev-server CORS proxy (recommended)

The docs site ships with a built-in **webpack dev-server proxy** that forwards
`/api-proxy/*` requests to your local backend. Because the request now comes
from the same origin (`localhost:3001 → localhost:3001/api-proxy`), the browser
never sees a cross-origin request.

**Start the docs with the proxy pointing at your backend (default `localhost:3000`):**

```bash
npm start
```

**Use the proxy URL as the spec source at runtime:**

Open `http://localhost:3001/api?spec=/api-proxy/docs/openapi.json` in your
browser. The `?spec=` query parameter tells the API reference page which URL to
load.

**Override the backend URL if your backend is on a different port:**

```bash
BACKEND_URL=http://localhost:8080 npm start
```

The proxy will forward `http://localhost:3001/api-proxy/*` →
`http://localhost:8080/*`.

---

### Workaround 2 — Copy the spec locally

Avoid the cross-origin request entirely by placing the spec in `static/`:

```bash
# From a file in the backend repo
cp ../proxypay/openapi.yaml ./static/openapi.yaml

# OR fetch it from the running backend and save it
curl http://localhost:3000/docs/openapi.json -o static/openapi.yaml
```

Restart `npm start` — the reference page will load `/openapi.yaml` directly
from the same origin.

---

### Workaround 3 — Enable CORS on the backend (development only)

Configure your backend to return the appropriate CORS headers for the docs
origin:

**NestJS (main.ts):**

```typescript
app.enableCors({
  origin: 'http://localhost:3001',
  methods: ['GET', 'OPTIONS'],
});
```

**Express:**

```javascript
const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3001' }));
```

> ⚠️ Do **not** use `origin: '*'` in production — allow only trusted origins.

---

### Workaround 4 — Disable CORS in the browser (last resort)

For quick one-off testing you can launch Chrome with web security disabled.
This is **only for local development** and should never be your default browser
profile:

```bash
# macOS
open -n -a "Google Chrome" --args --disable-web-security --user-data-dir=/tmp/chrome-no-cors

# Linux
google-chrome --disable-web-security --user-data-dir=/tmp/chrome-no-cors
```

---

### Error message in the UI

If a CORS error is detected at runtime, the API reference page replaces the
Redoc viewer with a **clear error banner** that:

- Explains why the error occurred
- Lists the same workarounds above
- Offers a **Retry** button once you have applied a fix
- Prints actionable guidance to the browser console

---

## Deploy

Configured for GitHub Pages under `sublime247/proxypay`.

```bash
npm run deploy
```
