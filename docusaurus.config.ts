import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
import { themes as prismThemes } from 'prism-react-renderer';

const config: Config = {
  title: 'ProxyPay API Portal',
  tagline: 'Searchable API docs powered by OpenAPI + Redoc',
  favicon: 'img/logo.svg',

  future: {
    v4: true,
  },

  url: 'https://Pidoko257.github.io',
  baseUrl: '/proxypay-frontend/',

  organizationName: 'Pidoko257',
  projectName: 'proxypay-frontend',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

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

  plugins: [],

  themeConfig: {
    navbar: {
      title: 'ProxyPay API',
      items: [
        { to: '/', label: 'Overview', position: 'left' },
        { to: '/api', label: 'Reference', position: 'left' },
        { to: '/rate-limits', label: 'Rate Limits', position: 'left' },
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
