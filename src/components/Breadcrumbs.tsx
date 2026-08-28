import React from 'react';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

function titleFromPath(segment: string): string {
  return decodeURIComponent(segment)
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function Breadcrumbs(): React.JSX.Element | null {
  if (typeof window === 'undefined') return null;

  const segments = window.location.pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [{ label: 'Home', href: '/' }];
  let path = '';

  segments.forEach((segment, index) => {
    path += `/${segment}`;
    items.push({
      label: titleFromPath(segment),
      href: index === segments.length - 1 ? undefined : path,
    });
  });

  return (
    <nav className="proxypay-breadcrumbs" aria-label="Breadcrumb">
      <ol>
        {items.map((item, index) => (
          <li key={item.label}>
            {index > 0 && <span aria-hidden="true">/</span>}
            {item.href ? <a href={item.href}>{item.label}</a> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
