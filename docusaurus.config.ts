import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

// ---------------------------------------------------------------------------
// CORS proxy for local backend testing
//
// During `npm start` (dev server on http://localhost:3001), all requests to
// /api-proxy/* are transparently forwarded to the local backend, bypassing
// the browser's same-origin restriction.
//
// Override the backend URL with an environment variable:
//   BACKEND_URL=http://localhost:8080 npm start
//
// Usage from the browser (e.g. in the Try-It panel):
//   Base URL → http://localhost:3001/api-proxy
// ---------------------------------------------------------------------------
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

const config: Config = {
  title: 'ProxyPay API Portal',
  tagline: 'Searchable API docs powered by OpenAPI + Redoc',

  // ---------------------------------------------------------------------------
  // Favicon — use favicon.ico as the primary entry so that browsers that don't
  // support SVG favicons (older Chrome, Windows taskbar, Safari bookmarks) still
  // display an icon. Additional <link> tags for modern browsers and Apple
  // devices are injected via headTags below.
  // ---------------------------------------------------------------------------
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://sublime247.github.io',
  baseUrl: '/proxypay/',

  organizationName: 'sublime247',
  projectName: 'proxypay',

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
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  // Expose the backend URL so client components can read it via
  // useDocusaurusContext().siteConfig.customFields.backendUrl
  customFields: {
    backendUrl: BACKEND_URL,
  },

  plugins: [
    // -------------------------------------------------------------------------
    // Dev-server CORS proxy plugin
    // Routes /api-proxy/** → BACKEND_URL/** during local development.
    // Has no effect on production builds.
    // -------------------------------------------------------------------------
    function corsProxyPlugin(_context: unknown, _options: unknown) {
      return {
        name: 'cors-proxy-plugin',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        configureWebpack(_config: unknown, _isServer: boolean): any {
          return {
            mergeStrategy: { 'devServer.proxy': 'replace' },
            devServer: {
              proxy: [
                {
                  context: ['/api-proxy'],
                  target: BACKEND_URL,
                  pathRewrite: { '^/api-proxy': '' },
                  changeOrigin: true,
                  secure: false,
                  logLevel: 'debug',
                  onError(err: Error, _req: unknown, res: { writeHead: Function; end: Function }) {
                    console.error('[CORS proxy] Could not reach backend:', err.message);
                    res.writeHead(502, { 'Content-Type': 'application/json' });
                    res.end(
                      JSON.stringify({
                        error: 'proxy_error',
                        message:
                          `Cannot reach backend at ${BACKEND_URL}. ` +
                          'Make sure the backend is running, or set BACKEND_URL to the correct address.',
                      }),
                    );
                  },
                },
              ],
            },
          };
        },
      };
    },
  ],

  // ---------------------------------------------------------------------------
  // Inject additional <link> tags into every page <head> for broad favicon
  // coverage:
  //   • favicon.ico        — legacy browsers, Windows taskbar, IE
  //   • favicon-32x32.png  — standard modern browsers
  //   • favicon-16x16.png  — small-size fallback
  //   • apple-touch-icon   — iOS/macOS "Add to Home Screen" & bookmarks
  //   • image/svg+xml      — modern Chrome/Firefox (crisp at any DPI)
  // ---------------------------------------------------------------------------
  headTags: [
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/x-icon',
        href: '/proxypay/img/favicon.ico',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/proxypay/img/favicon-32x32.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/png',
        sizes: '16x16',
        href: '/proxypay/img/favicon-16x16.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/proxypay/img/apple-touch-icon.png',
      },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/proxypay/img/logo.svg',
      },
    },
  ],

  themeConfig: {
    navbar: {
      title: 'ProxyPay API',
      items: [
        { to: '/', label: 'Overview', position: 'left' },
        { to: '/api', label: 'Reference', position: 'left' },
        {
          href: 'https://github.com/sublime247/proxypay',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [{ label: 'API Reference', to: '/api' }],
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
