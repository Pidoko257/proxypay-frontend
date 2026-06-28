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

## Deploy

Configured for GitHub Pages under `sublime247/proxypay`.

```bash
npm run deploy
```
## Blockers

After reviewing the repository, I found that it only contains a Docusaurus documentation site and does not include the dashboard application referenced in the issue. There is no dashboard home page, layout, or stat card components available to modify or extend. The repository also lacks the REST API integration and charting setup required to display the requested statistics and sparklines. Without these core application files, the responsive dashboard feature cannot be implemented or verified against the acceptance criteria. As a result, the issue appears to target a different repository or requires additional project files that are not currently present.
