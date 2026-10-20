import React from 'react';
import Link from '@docusaurus/Link';
import styles from './Breadcrumb.module.css';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

const ROUTE_HIERARCHIES: Record<string, BreadcrumbItem[]> = {
  '/dashboard': [
    { label: 'Home', path: '/' },
    { label: 'Transaction Dashboard', path: '/dashboard' },
  ],
  '/api': [
    { label: 'Home', path: '/' },
    { label: 'API Reference', path: '/api' },
  ],
  '/api-tools': [
    { label: 'Home', path: '/' },
    { label: 'API Reference', path: '/api' },
    { label: 'API Workbench', path: '/api-tools' },
  ],
  '/api-compare': [
    { label: 'Home', path: '/' },
    { label: 'API Reference', path: '/api' },
    { label: 'API Version Comparison', path: '/api-compare' },
  ],
  '/metrics': [
    { label: 'Home', path: '/' },
    { label: 'Transaction Dashboard', path: '/dashboard' },
    { label: 'API Metrics', path: '/metrics' },
  ],
  '/rate-limits': [
    { label: 'Home', path: '/' },
    { label: 'API Reference', path: '/api' },
    { label: 'Rate Limits', path: '/rate-limits' },
  ],
  '/changelog': [
    { label: 'Home', path: '/' },
    { label: 'Changelog', path: '/changelog' },
  ],
  '/migration': [
    { label: 'Home', path: '/' },
    { label: 'Migration Guide', path: '/migration' },
  ],
  '/quality': [
    { label: 'Home', path: '/' },
    { label: 'Code Quality', path: '/quality' },
  ],
  '/performance': [
    { label: 'Home', path: '/' },
    { label: 'Performance Benchmarks', path: '/performance' },
  ],
  '/chaos': [
    { label: 'Home', path: '/' },
    { label: 'Chaos Engineering', path: '/chaos' },
  ],
  '/dependencies': [
    { label: 'Home', path: '/' },
    { label: 'Dependency Graph', path: '/dependencies' },
  ],
  '/logs': [
    { label: 'Home', path: '/' },
    { label: 'Logs Dashboard', path: '/logs' },
  ],
  '/logs-glossary': [
    { label: 'Home', path: '/' },
    { label: 'Logs Dashboard', path: '/logs' },
    { label: 'Logs Glossary', path: '/logs-glossary' },
  ],
  '/settings': [
    { label: 'Home', path: '/' },
    { label: 'Settings', path: '/settings' },
  ],
  '/sharding': [
    { label: 'Home', path: '/' },
    { label: 'Sharding Strategy', path: '/sharding' },
  ],
  '/components': [
    { label: 'Home', path: '/' },
    { label: 'UI Components', path: '/components' },
  ],
  '/sdk-generator': [
    { label: 'Home', path: '/' },
    { label: 'API Reference', path: '/api' },
    { label: 'SDK Generator', path: '/sdk-generator' },
  ],
  '/sdk-guides': [
    { label: 'Home', path: '/' },
    { label: 'API Reference', path: '/api' },
    { label: 'SDK Guides', path: '/sdk-guides' },
  ],
  '/test-generator': [
    { label: 'Home', path: '/' },
    { label: 'API Workbench', path: '/api-tools' },
    { label: 'Test Generator', path: '/test-generator' },
  ],
};

export function getDefaultBreadcrumbs(pathname: string): BreadcrumbItem[] {
  if (ROUTE_HIERARCHIES[pathname]) {
    return ROUTE_HIERARCHIES[pathname];
  }
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];
  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    breadcrumbs.push({ label, path: currentPath });
  }
  return breadcrumbs;
}

function getInitialPathname(): string {
  if (typeof window !== 'undefined') {
    return window.location.pathname;
  }
  return '/';
}

export default function Breadcrumb({ items, className }: BreadcrumbProps): React.JSX.Element | null {
  const [pathname, setPathname] = React.useState<string>(getInitialPathname);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleLocationChange = () => {
      setPathname(window.location.pathname);
    };
    handleLocationChange();
    window.addEventListener('popstate', handleLocationChange);
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    window.history.pushState = function (...args) {
      originalPushState.apply(this, args);
      handleLocationChange();
    };
    window.history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      handleLocationChange();
    };
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  const breadcrumbItems = items || getDefaultBreadcrumbs(pathname);

  // Hide breadcrumb on root pages or when only Home is present
  if ((pathname === '/' && !items) || breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={`${styles.breadcrumbNav} ${className || ''}`}>
      <ol className={styles.breadcrumbList}>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return (
            <li key={item.path} className={styles.breadcrumbItem}>
              {index > 0 && (
                <span className={styles.breadcrumbSeparator} aria-hidden="true">
                  /
                </span>
              )}
              {isLast ? (
                <span className={styles.breadcrumbCurrent} aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.path} className={styles.breadcrumbLink}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
