# ProxyPay API Docs Portal

Docusaurus-based documentation site for the ProxyPay — Mobile Money → Stellar Bridge API.

## First-time setup

Before running any commands, install the required Playwright browser engines (required for visual regression and accessibility tests):

```bash
npx playwright install chromium firefox webkit
```

Then install dependencies and start the development server:

```bash
npm install
npm start        # dev server on http://localhost:3001
npm run build    # production build → build/
npm run serve    # serve the production build locally
```

## First-run developer path

New to the API? Follow this ordered path from setup to a first successful request. All links are relative to the published base URL (`https://Pidoko257.github.io/proxypay-frontend/`).

1. **Prerequisites** — review the required accounts, credentials, and environment before you begin: [`/docs/getting-started/prerequisites`](https://Pidoko257.github.io/proxypay-frontend/docs/getting-started/prerequisites)
2. **Authentication** — obtain and use your API credentials: [`/docs/getting-started/authentication`](https://Pidoko257.github.io/proxypay-frontend/docs/getting-started/authentication)
3. **First API call** — make your first request end to end: [`/docs/getting-started/first-api-call`](https://Pidoko257.github.io/proxypay-frontend/docs/getting-started/first-api-call)
4. **Workbench** — explore and try requests interactively: [`/workbench`](https://Pidoko257.github.io/proxypay-frontend/workbench)

## OpenAPI spec

The API reference page (`/api`) is powered by [Redoc](https://redocly.com/redoc/).
It reads `static/openapi.yaml` at build time.

To populate the spec from the backend:
- **Option A** — copy manually: `cp ../proxypay/openapi.yaml ./static/openapi.yaml`
- **Option B** — fetch from a running backend: `curl http://localhost:3000/docs/openapi.json -o static/openapi.yaml`

A placeholder spec is committed so the project builds out of the box.

## TypeScript

TypeScript strict mode is enabled in `tsconfig.json`. Keep declarations for directly used React packages in the project dependencies and run `npm run typecheck` when validating TypeScript changes.

## Deploy

Configured for GitHub Pages under `Pidoko257/proxypay-frontend`.

```bash
npm run deploy
```

## Security headers

> **Important:** `static/_headers` is **not applied at runtime** on GitHub Pages.
> GitHub Pages does not support `_headers` files or custom response headers, so
> the CSP, HSTS, and other security headers defined in `static/_headers` provide
> **no actual runtime protection** while the site is deployed to GitHub Pages.
> The file is kept as the source of truth for the intended header policy.

`npm run build` validates `static/_headers` before building. The file defines
headers for static hosts that support this convention (such as Cloudflare Pages
and Netlify).

To enforce these headers at runtime, choose one of:

- **Migrate to a host that consumes `_headers`** — deploy the build output to
  [Cloudflare Pages](https://developers.cloudflare.com/pages/) or
  [Netlify](https://docs.netlify.com/routing/headers/), both of which apply
  `static/_headers` automatically.
- **Front GitHub Pages with an edge function** — put a
  [Cloudflare Worker](https://developers.cloudflare.com/workers/) (or equivalent
  edge/CDN function) in front of the GitHub Pages deployment and inject the same
  CSP, HSTS, and other headers on every response.

Until one of these is in place, treat the headers in `static/_headers` as
intended policy rather than enforced protection.

## Quality gates

The GitHub Actions quality workflow audits the root and dashboard dependencies,
checks accessibility with axe-core, and runs visual snapshots for every
documentation route. Visual snapshots cover 375px and 1280px widths in
Chromium, Firefox, and WebKit. Set the repository's `PERCY_TOKEN` secret and
connect the Percy GitHub integration to record, compare, and approve visual
changes. Without the secret, that workflow step is explicitly skipped.

Run the checks locally with `npm run test:accessibility` and
`npm run test:visual`. Both commands require the site build (see [First-time setup](#first-time-setup)).
Accessibility JSON and security/dependency audit reports are written under
`.quality-reports/` when the corresponding checks run.

## Handsoff notes

<!-- handsoff-issue-873 -->
- #873: `security.ts` — `assertNoExternalRefs` is called on the full parsed spec but blocks `$ref` to external files only after YAML parse succeeds
