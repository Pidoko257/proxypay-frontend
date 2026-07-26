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

  // Issue #252: SEO — sitemap + robots.txt via plugin
  plugins: [
    [
      '@docusaurus/plugin-sitemap',
      {
        changefreq: 'weekly',
        priority: 0.5,
        ignorePatterns: ['/tags/**'],
        filename: 'sitemap.xml',
      },
    ],
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [],
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: false,
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        // Issue #252: sitemap built-in via preset
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Issue #252: OG meta tags & structured data
    metadata: [
      { name: 'robots', content: 'index, follow' },
      { name: 'description', content: 'ProxyPay API Portal — searchable OpenAPI reference for Mobile Money ↔ Stellar Bridge integration.' },
      { property: 'og:title', content: 'ProxyPay API Portal' },
      { property: 'og:description', content: 'ProxyPay API Portal — searchable OpenAPI reference for Mobile Money ↔ Stellar Bridge integration.' },
      { property: 'og:type', content: 'website' },
      { property: 'og:url', content: 'https://sublime247.github.io/proxypay/' },
      { property: 'og:image', content: 'https://sublime247.github.io/proxypay/img/logo.svg' },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: 'ProxyPay API Portal' },
      { name: 'twitter:description', content: 'ProxyPay API Portal — searchable OpenAPI reference for Mobile Money ↔ Stellar Bridge integration.' },
      // Canonical URL via head tag approach
      { 'http-equiv': 'X-UA-Compatible', content: 'IE=edge' },
    ],
    // Issue #252: Schema.org structured data (JSON-LD) injected via headTags
    headTags: [
      {
        tagName: 'link',
        attributes: {
          rel: 'canonical',
          href: 'https://sublime247.github.io/proxypay/',
        },
      },
      {
        tagName: 'script',
        attributes: {
          type: 'application/ld+json',
        },
        innerHTML: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'TechArticle',
          name: 'ProxyPay API Portal',
          description: 'Searchable API documentation for Mobile Money ↔ Stellar Bridge integration.',
          url: 'https://sublime247.github.io/proxypay/',
          publisher: {
            '@type': 'Organization',
            name: 'ProxyPay',
            url: 'https://sublime247.github.io/proxypay/',
          },
        }),
      },
    ],
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
