import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

export default function NotFound(): React.JSX.Element {
  const [query, setQuery] = React.useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      window.location.href = `/proxypay/search?q=${encodeURIComponent(query)}`;
    }
  };

  return (
    <Layout title="Page Not Found" description="The page you were looking for doesn't exist.">
      <main id="main-content" style={{ padding: '5rem 1.5rem', maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: '6rem', fontWeight: 800, color: 'var(--ifm-color-primary)', lineHeight: 1 }}>
          404
        </div>
        <h1 style={{ marginTop: '1rem' }}>Page Not Found</h1>
        <p style={{ color: 'var(--ifm-color-emphasis-600)', marginBottom: '2rem', fontSize: '1.1rem' }}>
          We couldn't find what you were looking for. Try searching or browse a popular section below.
        </p>

        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginBottom: '3rem' }}>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search documentation..."
            aria-label="Search documentation"
            style={{
              padding: '0.6rem 1rem',
              borderRadius: 6,
              border: '1px solid var(--ifm-color-emphasis-300)',
              fontSize: '1rem',
              width: 280,
              outline: 'none',
            }}
          />
          <button type="submit" className="button button--primary">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link className="button button--outline button--primary button--lg" to="/">
            Getting Started
          </Link>
          <Link className="button button--outline button--primary button--lg" to="/api">
            API Reference
          </Link>
          <Link className="button button--outline button--primary button--lg" to="/api">
            SDK Docs
          </Link>
        </div>
      </main>
    </Layout>
  );
}
