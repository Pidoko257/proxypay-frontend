# ProxyPay API Docs Portal

Docusaurus-based documentation site for the ProxyPay — Mobile Money ↔ Stellar Bridge API.

## Localization

This documentation site currently supports English only. There is no i18n infrastructure configured. If multi-language support is needed in the future, it can be added through Docusaurus's i18n system.

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
