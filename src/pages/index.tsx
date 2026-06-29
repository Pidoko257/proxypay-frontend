import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { TOUR_KEY } from '../components/ProductTour';

function HelpMenu({ onLaunchTour }: { onLaunchTour: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        data-tour="help"
        onClick={() => setOpen((o) => !o)}
        style={{
          background: 'none',
          border: '1.5px solid #2e8555',
          borderRadius: 8,
          padding: '8px 18px',
          cursor: 'pointer',
          color: '#2e8555',
          fontWeight: 600,
          fontSize: 14,
        }}
      >
        Help ▾
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: '110%',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            minWidth: 200,
            zIndex: 100,
          }}
        >
          <button
            onClick={() => { setOpen(false); onLaunchTour(); }}
            style={{
              display: 'block',
              width: '100%',
              padding: '12px 18px',
              background: 'none',
              border: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: 14,
              color: '#2d3748',
              fontWeight: 500,
            }}
          >
            🚀 Launch Product Tour
          </button>
          <a
            href="/docs/intro"
            style={{ display: 'block', padding: '12px 18px', fontSize: 14, color: '#2d3748', textDecoration: 'none' }}
            onClick={() => setOpen(false)}
          >
            📖 Documentation
          </a>
          <a
            href="mailto:support@proxypay.dev"
            style={{ display: 'block', padding: '12px 18px', fontSize: 14, color: '#2d3748', textDecoration: 'none' }}
            onClick={() => setOpen(false)}
          >
            ✉️ Contact Support
          </a>
        </div>
      )}
    </div>
  );
}

function DashboardHome() {
  const [tourOpen, setTourOpen] = useState(false);

  function launchTour() {
    localStorage.removeItem(TOUR_KEY);
    setTourOpen(true);
  }

  return (
    <div style={{ padding: '4rem 1.5rem', maxWidth: 960, margin: '0 auto' }}>
      {/* top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ margin: 0 }}>ProxyPay Developer Portal</h1>
        <HelpMenu onLaunchTour={launchTour} />
      </div>

      <p style={{ color: '#4a5568', marginBottom: '2.5rem', maxWidth: 620 }}>
        A searchable, first-class API reference for partners using the ProxyPay REST API.
        Explore endpoints, error codes, billing, and account preferences below.
      </p>

      {/* nav cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.2rem', marginBottom: '2rem' }}>
        <NavCard
          tour="api-reference"
          href="/api"
          icon="📡"
          title="API Reference"
          description="Browse all endpoints, request/response schemas, and code samples."
        />
        <NavCard
          tour="authentication"
          href="/docs/authentication"
          icon="🔑"
          title="Authentication"
          description="Bearer token auth guide, key rotation, and security best practices."
        />
        <NavCard
          tour="error-codes"
          href="/error-codes"
          icon="⚠️"
          title="Error Codes"
          description="Full error code reference with descriptions and remediation steps."
        />
        <NavCard
          tour="billing"
          href="/account/billing"
          icon="💳"
          title="Billing & Usage"
          description="Current plan, API usage meter, invoices, and upgrade options."
        />
        <NavCard
          tour="timezone"
          href="/account/settings"
          icon="🌍"
          title="Account Settings"
          description="Time zone preferences, notification settings, and profile details."
        />
      </div>

      {/* tour */}
      {tourOpen && (
        <ProductTourLazy forceOpen onClose={() => setTourOpen(false)} />
      )}
      {!tourOpen && <ProductTourLazy />}
    </div>
  );
}

function NavCard({
  tour,
  href,
  icon,
  title,
  description,
}: {
  tour: string;
  href: string;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      data-tour={tour}
      to={href}
      style={{
        display: 'block',
        padding: '20px 22px',
        borderRadius: 12,
        border: '1.5px solid #e2e8f0',
        textDecoration: 'none',
        color: 'inherit',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(46,133,85,0.12)';
        (e.currentTarget as HTMLElement).style.borderColor = '#2e8555';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.borderColor = '#e2e8f0';
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 10 }}>{icon}</div>
      <strong style={{ display: 'block', fontSize: 15, marginBottom: 6, color: '#1a202c' }}>{title}</strong>
      <span style={{ fontSize: 13, color: '#718096' }}>{description}</span>
    </Link>
  );
}

function ProductTourLazy(props: { forceOpen?: boolean; onClose?: () => void }) {
  const ProductTour = require('../components/ProductTour').default;
  return <ProductTour {...props} />;
}

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <BrowserOnly fallback={<div style={{ padding: '4rem' }}>Loading portal…</div>}>
        {() => <DashboardHome />}
      </BrowserOnly>
    </Layout>
  );
}
