import React, { useState } from 'react';
import Layout from '@theme/Layout';
import changelogEntries from '../data/changelog.json';

type ChangeType = 'All' | 'Breaking' | 'Feature' | 'Fix';

const TYPE_COLORS: Record<string, string> = {
  Breaking: '#dc2626',
  Feature: '#16a34a',
  Fix: '#2563eb',
};

export default function ChangelogPage(): React.JSX.Element {
  const [activeFilter, setActiveFilter] = useState<ChangeType>('All');

  const filters: ChangeType[] = ['All', 'Breaking', 'Feature', 'Fix'];

  const filtered = changelogEntries.map((entry) => ({
    ...entry,
    changes: entry.changes.filter(
      (c) => activeFilter === 'All' || c.type === activeFilter,
    ),
  })).filter((entry) => entry.changes.length > 0);

  return (
    <Layout title="Changelog" description="ProxyPay API and SDK changelog">
      <main style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <h1>Changelog</h1>
        <p>Track API and SDK updates, features, and fixes across versions.</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: '2rem', flexWrap: 'wrap' }}>
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 16px',
                border: `2px solid ${activeFilter === f ? 'var(--ifm-color-primary)' : '#d1d5db'}`,
                borderRadius: 20,
                background: activeFilter === f ? 'var(--ifm-color-primary)' : 'transparent',
                color: activeFilter === f ? '#fff' : 'var(--ifm-font-color-base)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {f}
            </button>
          ))}
        </div>

        {filtered.length === 0 && (
          <p style={{ color: '#6b7280' }}>No entries match the selected filter.</p>
        )}

        {filtered.map((entry) => (
          <article
            key={entry.version}
            style={{
              marginBottom: '2rem',
              paddingBottom: '1.5rem',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
              <h2 style={{ margin: 0 }}>{entry.version}</h2>
              <time style={{ color: '#6b7280', fontSize: '14px' }}>{entry.date}</time>
              <a
                href={entry.releaseUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '13px', marginLeft: 'auto' }}
              >
                GitHub Release →
              </a>
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {entry.changes.map((change, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                    padding: '6px 0',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: '11px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#fff',
                      backgroundColor: TYPE_COLORS[change.type],
                      whiteSpace: 'nowrap',
                      lineHeight: '20px',
                    }}
                  >
                    {change.type}
                  </span>
                  <span style={{ lineHeight: '24px' }}>{change.description}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </main>
    </Layout>
  );
}
