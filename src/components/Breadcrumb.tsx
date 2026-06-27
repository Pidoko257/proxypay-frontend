import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useLocation } from '@docusaurus/router';

/** Map URL segments to human-readable labels. Add entries as new pages are created. */
const SEGMENT_LABELS: Record<string, string> = {
  api: 'API Reference',
  dashboard: 'Dashboard',
  transactions: 'Transactions',
  webhooks: 'Webhooks',
  payments: 'Payments',
  settings: 'Settings',
};

function toLabel(segment: string): string {
  return SEGMENT_LABELS[segment] ?? segment.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

interface Crumb {
  label: string;
  href: string;
}

function buildCrumbs(pathname: string, siteUrl: string, baseUrl: string): Crumb[] {
  // Strip baseUrl prefix so we work with a clean path
  const clean = pathname.startsWith(baseUrl)
    ? pathname.slice(baseUrl.length - 1) // keep leading /
    : pathname;

  const segments = clean.split('/').filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: Crumb[] = [{ label: 'Home', href: baseUrl }];
  segments.forEach((seg, i) => {
    const href = baseUrl.replace(/\/$/, '') + '/' + segments.slice(0, i + 1).join('/');
    crumbs.push({ label: toLabel(seg), href });
  });
  return crumbs;
}

interface BreadcrumbProps {
  /** Override labels for specific positions (0-indexed, 0 = Home). */
  labels?: Record<number, string>;
}

export default function Breadcrumb({ labels }: BreadcrumbProps): React.JSX.Element | null {
  const { siteConfig } = useDocusaurusContext();
  const { pathname } = useLocation();
  const crumbs = buildCrumbs(pathname, siteConfig.url, siteConfig.baseUrl);

  // Only render for pages deeper than root
  if (crumbs.length <= 1) return null;

  const finalCrumbs = crumbs.map((c, i) => ({
    ...c,
    label: labels?.[i] ?? c.label,
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: finalCrumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: c.href.startsWith('http') ? c.href : `${siteConfig.url}${c.href}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="breadcrumb-nav">
        <ol className="breadcrumb" itemScope itemType="https://schema.org/BreadcrumbList">
          {finalCrumbs.map((crumb, i) => {
            const isLast = i === finalCrumbs.length - 1;
            return (
              <li
                key={crumb.href}
                className="breadcrumb__item"
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
              >
                {isLast ? (
                  <span className="breadcrumb__current" aria-current="page" itemProp="name">
                    {crumb.label}
                  </span>
                ) : (
                  <>
                    <Link className="breadcrumb__link" href={crumb.href} itemProp="item">
                      <span itemProp="name">{crumb.label}</span>
                    </Link>
                    <span className="breadcrumb__sep" aria-hidden="true">/</span>
                  </>
                )}
                <meta itemProp="position" content={String(i + 1)} />
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
