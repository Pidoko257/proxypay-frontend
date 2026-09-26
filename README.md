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

## Quality gates

The GitHub Actions quality workflow audits the root and dashboard dependencies,
checks accessibility with axe-core, and runs visual snapshots for every
documentation route. Visual snapshots cover 375px and 1280px widths in
Chromium, Firefox, and WebKit. Set the repository's `PERCY_TOKEN` secret and
connect the Percy GitHub integration to record, compare, and approve visual
changes. Without the secret, that workflow step is explicitly skipped.

Run the checks locally with `npm run test:accessibility` and
`npm run test:visual`. Both commands require the site build; Playwright installs
its browser engines with `npx playwright install chromium firefox webkit`.
Accessibility JSON and security/dependency audit reports are written under
`.quality-reports/` when the corresponding checks run.

`npm run build` validates `static/_headers` before building. The file defines
headers for static hosts that support this convention (such as Cloudflare Pages
and Netlify). GitHub Pages does not apply `_headers` or allow custom response
headers, so this policy is not enforced at runtime while the site remains on
GitHub Pages. Runtime enforcement requires deploying to a host that consumes
this file or configuring an equivalent edge/CDN policy.
