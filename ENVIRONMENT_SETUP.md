# Environment Variable Setup Guide

This document explains how to configure the ProxyPay frontend for different environments (development, staging, production) using environment variables.

## Quick Start

1. **Copy the example configuration:**
   ```bash
   cp .env.example .env.local
   ```

2. **Edit `.env.local` with your environment-specific values:**
   ```bash
   nano .env.local
   ```

3. **Rebuild or restart the dev server:**
   ```bash
   npm run build   # for production
   npm start       # for development
   ```

## Environment Files

The application loads environment variables in this order of precedence (first found wins):

1. `.env.{NODE_ENV}.local` (e.g., `.env.production.local`)
2. `.env.local`
3. `.env.{NODE_ENV}` (e.g., `.env.production`)
4. `.env`

### Recommended Setup

For local development, create `.env.local`:
```bash
cp .env.example .env.local
# Edit .env.local with your local settings
```

For CI/CD pipelines, set environment variables directly in your pipeline configuration (GitHub Actions, GitLab CI, etc.) instead of committing `.env` files.

## Configuration Variables

### Deployment Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3001` | Base URL of the documentation portal. Used for absolute URLs in Docusaurus. |
| `NEXT_PUBLIC_GITHUB_ORG` | `Pidoko257` | GitHub organization for GitHub Pages deployment. |
| `NEXT_PUBLIC_GITHUB_REPO` | `proxypay-frontend` | GitHub repository name for deployment. |
| `NEXT_PUBLIC_DEPLOYMENT_BRANCH` | `gh-pages` | Git branch used for GitHub Pages deployment. |

**Example Production Config:**
```bash
NEXT_PUBLIC_BASE_URL=https://docs.proxypay.io
NEXT_PUBLIC_GITHUB_ORG=proxypay
NEXT_PUBLIC_GITHUB_REPO=docs-portal
NEXT_PUBLIC_DEPLOYMENT_BRANCH=gh-pages
```

### API Endpoints

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:3000` | Backend API base URL for load testing and API calls. |
| `NEXT_PUBLIC_OPENAPI_SPEC_URL` | `/openapi.yaml` | OpenAPI specification URL (relative or absolute). |

**Example Staging Config:**
```bash
NEXT_PUBLIC_API_BASE_URL=https://staging-api.proxypay.io
NEXT_PUBLIC_OPENAPI_SPEC_URL=https://staging-api.proxypay.io/openapi.yaml
```

### Feature Flags

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DEMO_MODE` | `false` | Enable demo mode (generates sample data instead of calling backend). |
| `NEXT_PUBLIC_ENABLE_LOAD_TESTING` | `true` | Enable load testing features in the UI. |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `true` | Enable analytics dashboard. |
| `NEXT_PUBLIC_ENABLE_REQUEST_HISTORY` | `true` | Enable request history logging. |

**Example Production Config (Limited Features):**
```bash
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_ENABLE_LOAD_TESTING=false
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REQUEST_HISTORY=false
```

### Runtime Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment: `development`, `staging`, or `production`. |
| `NEXT_PUBLIC_VERBOSE_LOGGING` | `false` | Enable verbose logging for debugging. |
| `NEXT_PUBLIC_API_TIMEOUT` | `30000` | API request timeout in milliseconds. |

### Load Testing Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DEFAULT_LOAD_PROFILE` | `normal-load` | Default load testing profile to use. Options: `smoke-test`, `normal-load`, `stress-test`, `spike-test`, `endurance-test`. |
| `NEXT_PUBLIC_LOAD_TEST_OUTPUT_DIR` | `./load-test-results` | Directory where load test results are saved. |
| `NEXT_PUBLIC_LOAD_TEST_GENERATE_GRAPHS` | `true` | Enable graph generation in load test reports. |

### Analytics Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_ANALYTICS_ENDPOINT` | (empty) | Analytics service endpoint (optional). |
| `NEXT_PUBLIC_ANALYTICS_KEY` | (empty) | Analytics service API key (optional, keep secret). |

### Security & Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_AUTH_TOKEN` | (empty) | Bearer token for authenticated API requests. **⚠️ Do not commit to version control.** |
| `NEXT_PUBLIC_ALLOWED_ORIGINS` | (empty) | CORS allowed origins (comma-separated if multiple). |

**⚠️ Security Warning:**
- Never commit `.env.local` or `.env.*.local` files to version control.
- For sensitive variables like `NEXT_PUBLIC_AUTH_TOKEN`, use CI/CD pipeline secrets instead.
- Check `.gitignore` includes `.env.local` to prevent accidental commits.

### Docusaurus Specific

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_DOCUSAURUS_BASE_URL` | `/proxypay-frontend/` | Base URL path for Docusaurus (must start and end with `/`). |
| `NEXT_PUBLIC_DOCUSAURUS_TRAILING_SLASH` | `false` | Whether URLs should have trailing slashes. |

### Logging

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, or `error`. |
| `NEXT_PUBLIC_STRUCTURED_LOGGING` | `false` | Enable structured logging in JSON format. |

## Environment-Specific Examples

### Development Environment

Create `.env.development.local`:
```bash
NEXT_PUBLIC_BASE_URL=http://localhost:3001
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
NEXT_PUBLIC_OPENAPI_SPEC_URL=/openapi.yaml
NODE_ENV=development
NEXT_PUBLIC_VERBOSE_LOGGING=true
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_ENABLE_LOAD_TESTING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REQUEST_HISTORY=true
NEXT_PUBLIC_LOG_LEVEL=debug
```

Run: `npm start`

### Staging Environment

Create `.env.staging.local`:
```bash
NEXT_PUBLIC_BASE_URL=https://staging-docs.proxypay.io
NEXT_PUBLIC_API_BASE_URL=https://staging-api.proxypay.io
NEXT_PUBLIC_OPENAPI_SPEC_URL=https://staging-api.proxypay.io/openapi.yaml
NODE_ENV=staging
NEXT_PUBLIC_VERBOSE_LOGGING=false
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_ENABLE_LOAD_TESTING=true
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_REQUEST_HISTORY=true
NEXT_PUBLIC_LOG_LEVEL=info
```

Build: `NODE_ENV=staging npm run build`

### Production Environment

For production, set environment variables in your CI/CD pipeline. Do **not** commit `.env.production.local` to version control.

**GitHub Actions Example:**
```yaml
- name: Build
  env:
    NEXT_PUBLIC_BASE_URL: https://docs.proxypay.io
    NEXT_PUBLIC_API_BASE_URL: https://api.proxypay.io
    NEXT_PUBLIC_OPENAPI_SPEC_URL: https://api.proxypay.io/openapi.yaml
    NODE_ENV: production
    NEXT_PUBLIC_VERBOSE_LOGGING: "false"
    NEXT_PUBLIC_DEMO_MODE: "false"
    NEXT_PUBLIC_ENABLE_LOAD_TESTING: "false"
    NEXT_PUBLIC_ENABLE_ANALYTICS: "true"
    NEXT_PUBLIC_ENABLE_REQUEST_HISTORY: "false"
    NEXT_PUBLIC_LOG_LEVEL: warn
  run: npm run build
```

## Using Environment Variables in Code

### In TypeScript Components

Import the `envConfig` singleton from the utilities:

```typescript
import { envConfig } from '../utils/env-config';

export function MyComponent() {
  return (
    <div>
      <p>API Base URL: {envConfig.apiBaseUrl}</p>
      <p>Demo Mode: {envConfig.demoMode ? 'Enabled' : 'Disabled'}</p>
    </div>
  );
}
```

### Loading and Validating Config

For advanced use cases, use the `loadEnvConfig` function:

```typescript
import { loadEnvConfig } from '../utils/env-config';

const { config, errors } = loadEnvConfig(false); // false = don't throw on errors

if (errors.length > 0) {
  console.error('Configuration errors:', errors);
}

console.log('API Base URL:', config.apiBaseUrl);
```

### In Node.js Scripts

For Node.js scripts (like load testing), environment variables are loaded automatically:

```typescript
import { envConfig } from './utils/env-config';

console.log('Load Testing Output Dir:', envConfig.loadTestOutputDir);
console.log('Default Load Profile:', envConfig.defaultLoadProfile);
```

## CI/CD Integration

### GitHub Actions

Set environment variables as secrets in GitHub repository settings, then use them in your workflow:

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_BASE_URL: ${{ secrets.PRODUCTION_BASE_URL }}
          NEXT_PUBLIC_API_BASE_URL: ${{ secrets.PRODUCTION_API_URL }}
          NEXT_PUBLIC_AUTH_TOKEN: ${{ secrets.API_AUTH_TOKEN }}
```

### GitLab CI

Use GitLab CI/CD variables:

```yaml
stages:
  - build

build:
  stage: build
  variables:
    NEXT_PUBLIC_BASE_URL: "https://docs.proxypay.io"
    NEXT_PUBLIC_API_BASE_URL: "https://api.proxypay.io"
  script:
    - npm ci
    - npm run build
```

## Troubleshooting

### Environment Variables Not Being Loaded

1. **Check file locations:** Ensure `.env.local` or `.env` exists in the project root.
2. **Verify naming:** Environment variable names must start with `NEXT_PUBLIC_` to be accessible in the browser.
3. **Restart dev server:** Stop and restart `npm start` after changing environment variables.
4. **Check .gitignore:** Verify `.env.local` is in `.gitignore` (not tracked by git).

### Variables Show Default Values

1. **Check `.env.local` syntax:** Ensure no spaces around `=` in variable assignments.
2. **Verify NODE_ENV:** Check that `NODE_ENV` is set to the correct environment.
3. **Check precedence:** Make sure the correct `.env` file is being loaded (see "Environment Files" section).

### Type Errors with EnvConfig

The `envConfig` object is fully typed with TypeScript. If you're seeing type errors:

1. Ensure you're importing from `src/utils/env-config.ts`
2. Check that the variable exists in the `EnvConfig` interface
3. Use `envConfig.propertyName` (not `envConfig.PROPERTY_NAME`)

### CI/CD Build Failures

1. **Check CI/CD logs:** Look for "Invalid environment configuration" errors.
2. **Verify secrets are set:** Ensure GitHub Secrets or GitLab CI/CD variables are configured.
3. **Check environment variable format:** Boolean values must be `"true"` or `"false"` (as strings in CI/CD).

## Best Practices

1. **Never commit secrets:** Always use `.env.local` for local development and CI/CD secrets for production.
2. **Use defaults:** Provide sensible defaults for development so `.env.local` can be minimal.
3. **Document environment:** Add comments to `.env.example` explaining each variable.
4. **Validate early:** The env-config utility validates all variables at startup.
5. **Environment-specific behavior:** Use feature flags to control behavior across environments.
6. **Version-control `.env.example`:** Commit `.env.example` so team members know what variables are needed.

## Support

For issues or questions about environment configuration:

1. Check the `.env.example` file for available variables and defaults.
2. Review the `EnvConfig` interface in `src/utils/env-config.ts` for type definitions.
3. Check CI/CD pipeline logs for validation errors.
4. Refer to the "Troubleshooting" section above.
