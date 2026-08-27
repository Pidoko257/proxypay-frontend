import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';
import * as webpack from 'webpack';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local or .env
// Supports: .env, .env.local, .env.[NODE_ENV], .env.[NODE_ENV].local
const envPath = path.join(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}.local`);
const envLocalPath = path.join(process.cwd(), '.env.local');
const envDefaultPath = path.join(process.cwd(), `.env.${process.env.NODE_ENV || 'development'}`);
const envPath2 = path.join(process.cwd(), '.env');

// Load in order of precedence (most specific first)
[envPath, envLocalPath, envDefaultPath, envPath2].forEach((filePath) => {
  if (fs.existsSync(filePath)) {
    dotenv.config({ path: filePath });
  }
});

// Helper to get env var with fallback
const getEnv = (key: string, defaultValue: string = ''): string => {
  return process.env[key] || defaultValue;
};

// =========================================================================
// OpenAPI spec cache busting (Task 2)
// =========================================================================
// Compute a short stable hash of the bundled OpenAPI spec on every
// config load (i.e. each `docusaurus start`/`build`). We inject it as the
// literal __OPENAPI_VERSION__ in every client bundle so the React app can
// add `?v=<hash>` to the spec URL. When the spec is updated, the hash
// changes, browsers re-fetch /openapi.yaml, and Redoc rebuilds its
// search index — no stale endpoints.
//
// Note: use process.cwd() rather than __dirname here — Docusaurus loads
// the TS config through an ESM/TS-loader pipeline where __dirname is not
// reliably populated. process.cwd() matches where the user runs
// `docusaurus start`/`build`.
const SPEC_PATH = path.join(process.cwd(), 'static', 'openapi.yaml');
const OPENAPI_VERSION = fs.existsSync(SPEC_PATH)
  ? crypto
      .createHash('md5')
      .update(fs.readFileSync(SPEC_PATH))
      .digest('hex')
      .slice(0, 8)
  : 'dev';

function openapiVersionPlugin() {
  return {
    // In dev mode, the config is only loaded when `docusaurus start` is
    // invoked; if the user edits static/openapi.yaml mid-session they
    // need to restart the dev server to refresh the hash.
    name: 'proxypay-openapi-version',
    configureWebpack() {
      return {
        plugins: [
          new webpack.DefinePlugin({
            __OPENAPI_VERSION__: JSON.stringify(OPENAPI_VERSION),
          }),
        ],
      };
    },
  };
}

const config: Config = {
  title: 'ProxyPay API Portal',
  tagline: 'Searchable API docs powered by OpenAPI + Redoc',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  // Use environment variables with fallback to defaults
  url: getEnv('NEXT_PUBLIC_BASE_URL', 'https://Pidoko257.github.io').split('/proxypay-frontend')[0] || 'https://Pidoko257.github.io',
  baseUrl: getEnv('NEXT_PUBLIC_DOCUSAURUS_BASE_URL', '/proxypay-frontend/'),

  organizationName: getEnv('NEXT_PUBLIC_GITHUB_ORG', 'Pidoko257'),
  projectName: getEnv('NEXT_PUBLIC_GITHUB_REPO', 'proxypay-frontend'),
  deploymentBranch: getEnv('NEXT_PUBLIC_DEPLOYMENT_BRANCH', 'gh-pages'),
  trailingSlash: getEnv('NEXT_PUBLIC_DOCUSAURUS_TRAILING_SLASH', 'false') === 'true',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: {
          // Fix #239: Use require.resolve to produce an absolute path that
          // Docusaurus/webpack can reliably bundle in both dev and production
          // builds.  A relative string like './src/css/custom.css' works in
          // most cases but can silently fail in production when the CWD at
          // build time differs from the project root (e.g., CI environments,
          // monorepos).  require.resolve pins the path at config-load time
          // so there is no ambiguity and no 404 in production.
          customCss: require.resolve('./src/css/custom.css'),
        },
      } satisfies Preset.Options,
    ],
  ],

  // Inject __OPENAPI_VERSION__ into every client bundle so the spec URL
  // gets a cache-busting query parameter that flips whenever the spec
  // file changes.
  plugins: [openapiVersionPlugin],

  themeConfig: {
    navbar: {
      title: 'ProxyPay API',
      items: [
        { to: '/', label: 'Overview', position: 'left' },
        { to: '/api', label: 'Reference', position: 'left' },
        { to: '/rate-limits', label: 'Rate Limits', position: 'left' },
        { to: '/sharding',   label: 'Sharding',    position: 'left' },
        { to: '/chaos',      label: 'Chaos',       position: 'left' },
        { to: '/quality',    label: 'Quality',     position: 'left' },
        {
          // #231: external link — open in new tab
          href: 'https://github.com/sublime247/proxypay',
          label: 'GitHub',
          position: 'right',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            // Internal link — opens in same tab (no target override)
            { label: 'API Reference', to: '/api' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} ProxyPay`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'yaml', 'typescript', 'python'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
