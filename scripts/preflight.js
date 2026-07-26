#!/usr/bin/env node
/**
 * scripts/preflight.js
 *
 * Issue #256 — Enhance Build Process with Pre-flight Checks
 *
 * Validates the project before a production build:
 *   1. OpenAPI spec exists and is valid YAML/JSON with required fields
 *   2. Docusaurus config exists and exports required keys
 *   3. Deprecation warnings for known legacy config patterns
 *   4. Exits non-zero (fails build) on any critical issue
 *
 * Usage (called automatically via "prebuild" in package.json):
 *   node scripts/preflight.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Colour helpers (no extra deps)
// ---------------------------------------------------------------------------
const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const BOLD   = '\x1b[1m';

const ok   = (msg) => console.log(`${GREEN}✔${RESET}  ${msg}`);
const warn = (msg) => console.warn(`${YELLOW}⚠${RESET}  ${msg}`);
const fail = (msg) => console.error(`${RED}${BOLD}✘${RESET}  ${msg}`);

let hasError = false;

function criticalError(msg) {
  fail(msg);
  hasError = true;
}

// ---------------------------------------------------------------------------
// 1. Validate OpenAPI spec
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}Pre-flight check: OpenAPI spec${RESET}`);

const specPath = path.resolve(__dirname, '..', 'static', 'openapi.yaml');

if (!fs.existsSync(specPath)) {
  criticalError(`OpenAPI spec not found at static/openapi.yaml`);
  criticalError(`Run: cp ../proxypay/openapi.yaml ./static/openapi.yaml`);
} else {
  const raw = fs.readFileSync(specPath, 'utf8').trim();

  if (raw.length < 20) {
    criticalError('static/openapi.yaml appears to be empty or a placeholder.');
  } else {
    // Minimal field presence check (no yaml dep needed — just look for text)
    const required = ['openapi', 'info', 'paths'];
    const missing  = required.filter((k) => !raw.includes(k + ':') && !raw.includes(`"${k}"`));

    if (missing.length > 0) {
      criticalError(`static/openapi.yaml is missing required fields: ${missing.join(', ')}`);
    } else {
      ok('static/openapi.yaml present and contains required OpenAPI fields');
    }

    // Deprecation check: OpenAPI 2.x (Swagger) instead of 3.x
    if (/^swagger\s*:/m.test(raw)) {
      warn('static/openapi.yaml uses Swagger 2.x. Consider upgrading to OpenAPI 3.x.');
    }
  }
}

// ---------------------------------------------------------------------------
// 2. Validate Docusaurus config
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}Pre-flight check: Docusaurus config${RESET}`);

const configPath = path.resolve(__dirname, '..', 'docusaurus.config.ts');
const configPathJs = path.resolve(__dirname, '..', 'docusaurus.config.js');

const cfgFile = fs.existsSync(configPath) ? configPath : fs.existsSync(configPathJs) ? configPathJs : null;

if (!cfgFile) {
  criticalError('docusaurus.config.ts (or .js) not found.');
} else {
  const cfgRaw = fs.readFileSync(cfgFile, 'utf8');

  const requiredConfigKeys = ['title', 'url', 'baseUrl', 'organizationName', 'projectName'];
  const missingKeys = requiredConfigKeys.filter((k) => !cfgRaw.includes(k));

  if (missingKeys.length > 0) {
    criticalError(`docusaurus.config.ts is missing required keys: ${missingKeys.join(', ')}`);
  } else {
    ok('docusaurus.config.ts contains all required configuration keys');
  }

  // Deprecation warnings
  if (cfgRaw.includes('onBrokenLinks: \'ignore\'') || cfgRaw.includes('onBrokenLinks: "ignore"')) {
    warn('docusaurus.config.ts: onBrokenLinks is set to "ignore" — broken links will not fail the build.');
  }

  if (!cfgRaw.includes('favicon')) {
    warn('docusaurus.config.ts: No favicon configured.');
  }
}

// ---------------------------------------------------------------------------
// 3. Validate package.json
// ---------------------------------------------------------------------------
console.log(`\n${BOLD}Pre-flight check: package.json${RESET}`);

const pkgPath = path.resolve(__dirname, '..', 'package.json');

if (!fs.existsSync(pkgPath)) {
  criticalError('package.json not found.');
} else {
  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    ok('package.json is valid JSON');
  } catch (e) {
    criticalError(`package.json is not valid JSON: ${e.message}`);
  }

  if (pkg) {
    // Warn on open dependency ranges
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const openRanges = Object.entries(allDeps || {})
      .filter(([, v]) => String(v).startsWith('*') || String(v).startsWith('x'))
      .map(([k]) => k);

    if (openRanges.length > 0) {
      warn(`Wildcard dependency ranges detected (${openRanges.join(', ')}) — consider pinning versions.`);
    }
  }
}

// ---------------------------------------------------------------------------
// 4. Summary
// ---------------------------------------------------------------------------
console.log('');
if (hasError) {
  fail('Pre-flight checks FAILED. Fix the issues above before building.\n');
  process.exit(1);
} else {
  ok('All pre-flight checks passed. Proceeding with build.\n');
}
