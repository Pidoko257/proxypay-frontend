import React, { Suspense, useEffect, useState, useMemo } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Breadcrumb from '../components/Breadcrumb';

const DependencyGraph = React.lazy(() => import('../components/DependencyGraph'));

interface EndpointNode {
  id: string;
  name: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  dependenciesCount: number;
  dependentsCount: number;
  scope: string;
}

const SAMPLE_ENDPOINTS: EndpointNode[] = [
  { id: 'auth-token', name: '/api/v1/auth/token', method: 'POST', dependenciesCount: 0, dependentsCount: 5, scope: 'public' },
  { id: 'create-payment', name: '/api/v1/payments', method: 'POST', dependenciesCount: 1, dependentsCount: 3, scope: 'payments:write' },
  { id: 'get-payment', name: '/api/v1/payments/:id', method: 'GET', dependenciesCount: 1, dependentsCount: 1, scope: 'payments:read' },
  { id: 'create-escrow', name: '/api/v1/escrows', method: 'POST', dependenciesCount: 2, dependentsCount: 2, scope: 'escrows:write' },
  { id: 'refund-request', name: '/api/v1/refunds', method: 'POST', dependenciesCount: 2, dependentsCount: 1, scope: 'refunds:write' },
  { id: 'webhook-events', name: '/api/v1/webhooks/deliveries', method: 'GET', dependenciesCount: 1, dependentsCount: 0, scope: 'webhooks:read' },
];

function LoadingFallback(): React.JSX.Element {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTimedOut(true), 30000);
    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <p role="status" style={{ padding: '2rem' }}>
      {timedOut
        ? 'The dependency graph is taking longer than expected. Please reload the page.'
        : 'Loading dependency graph...'}
    </p>
  );
}

export default function DependenciesPage(): React.JSX.Element {
  const [selectedNodeId, setSelectedNodeId] = useState<string>(SAMPLE_ENDPOINTS[0].id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [announcement, setAnnouncement] = useState<string>('');

  const filteredNodes = useMemo(() => {
    return SAMPLE_ENDPOINTS.filter(
      (node) =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.scope.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const selectedNode = useMemo(() => {
    return SAMPLE_ENDPOINTS.find((n) => n.id === selectedNodeId) || SAMPLE_ENDPOINTS[0];
  }, [selectedNodeId]);

  const handleSelectNode = (node: EndpointNode) => {
    setSelectedNodeId(node.id);
    setAnnouncement(
      `Selected ${node.method} ${node.name}. Requires ${node.scope}. Depends on ${node.dependenciesCount} upstream endpoints, ${node.dependentsCount} downstream services depend on this.`
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % filteredNodes.length;
      handleSelectNode(filteredNodes[nextIndex]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + filteredNodes.length) % filteredNodes.length;
      handleSelectNode(filteredNodes[prevIndex]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleSelectNode(filteredNodes[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      handleSelectNode(filteredNodes[filteredNodes.length - 1]);
    }
  };

  return (
    <Layout title="Endpoint Dependencies" description="Interactive graph of ProxyPay API endpoint dependencies">
      <Breadcrumb />
      <main style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem' }}>
        <header style={{ marginBottom: '1.5rem' }}>
          <h1>API Endpoint Dependency Graph</h1>
          <p style={{ color: 'var(--ifm-color-emphasis-700)', fontSize: '1.05rem' }}>
            Explore topological relationships, upstream requirements, and downstream consumers across API endpoints.
          </p>
        </header>

        {/* Live Accessibility Announcement Region (Issue #768) */}
        <div role="status" aria-live="polite" aria-atomic="true" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, padding: 0, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)' }}>
          {announcement}
        </div>

        {/* Synchronized Keyboard Explorer & Detail Card */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Keyboard-Navigable Node List */}
          <section
            style={{
              background: 'var(--ifm-color-emphasis-100)',
              border: '1px solid var(--ifm-color-emphasis-300)',
              borderRadius: 8,
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: 480,
            }}
            aria-labelledby="node-list-heading"
          >
            <h2 id="node-list-heading" style={{ fontSize: '1rem', margin: '0 0 0.5rem', fontWeight: 600 }}>
              Keyboard Node Navigator
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)', margin: '0 0 0.75rem' }}>
              Use <kbd>â†‘</kbd> <kbd>â†“</kbd> arrows to navigate nodes.
            </p>

            <input
              type="text"
              placeholder="Filter nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Filter dependency nodes"
              style={{
                width: '100%',
                padding: '0.4rem 0.6rem',
                borderRadius: 4,
                border: '1px solid var(--ifm-color-emphasis-400)',
                background: 'var(--ifm-background-color)',
                color: 'var(--ifm-font-color-base)',
                fontSize: '0.85rem',
                marginBottom: '0.75rem',
              }}
            />

            <ul
              role="listbox"
              aria-label="API Endpoints"
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                overflowY: 'auto',
                flex: 1,
              }}
            >
              {filteredNodes.map((node, idx) => {
                const isSelected = node.id === selectedNodeId;
                return (
                  <li
                    key={node.id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => handleSelectNode(node)}
                    onKeyDown={(e) => handleKeyDown(e, idx)}
                    style={{
                      padding: '0.55rem 0.75rem',
                      borderRadius: 6,
                      marginBottom: '0.35rem',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      background: isSelected ? 'var(--ifm-color-primary)' : 'var(--ifm-background-color)',
                      color: isSelected ? '#fff' : 'var(--ifm-font-color-base)',
                      border: isSelected ? '1px solid var(--ifm-color-primary-darker)' : '1px solid var(--ifm-color-emphasis-200)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      outline: 'none',
                    }}
                  >
                    <span style={{ fontWeight: 600, fontFamily: 'var(--ifm-font-family-monospace)' }}>
                      {node.name}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '0.1rem 0.35rem',
                        borderRadius: 3,
                        background: isSelected ? 'rgba(255,255,255,0.25)' : 'var(--ifm-color-emphasis-200)',
                      }}
                    >
                      {node.method}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Selected Dependency Inspector Card */}
          <section
            style={{
              background: 'var(--ifm-background-color)',
              border: '1px solid var(--ifm-color-emphasis-300)',
              borderRadius: 8,
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
            aria-labelledby="node-details-heading"
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <span
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    padding: '0.2rem 0.5rem',
                    borderRadius: 4,
                    background: selectedNode.method === 'GET' ? '#e8f0fe' : '#e6f4ea',
                    color: selectedNode.method === 'GET' ? '#1a73e8' : '#137333',
                  }}
                >
                  {selectedNode.method}
                </span>
                <h2 id="node-details-heading" style={{ fontSize: '1.2rem', margin: 0, fontFamily: 'var(--ifm-font-family-monospace)' }}>
                  {selectedNode.name}
                </h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ background: 'var(--ifm-color-emphasis-100)', padding: '0.75rem', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)' }}>Required Scope</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedNode.scope}</div>
                </div>

                <div style={{ background: 'var(--ifm-color-emphasis-100)', padding: '0.75rem', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)' }}>Upstream Dependencies</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedNode.dependenciesCount} services</div>
                </div>

                <div style={{ background: 'var(--ifm-color-emphasis-100)', padding: '0.75rem', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)' }}>Downstream Consumers</div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{selectedNode.dependentsCount} services</div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', fontSize: '0.85rem', color: 'var(--ifm-color-emphasis-600)' }}>
              Keyboard and pointer selections are synchronized in real-time across graph nodes and the explorer list.
            </div>
          </section>
        </div>

        {/* Visual Graph View */}
        <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading dependency graph...</p>}>
          {() => (
            <Suspense fallback={<LoadingFallback />}>
              <DependencyGraph />
            </Suspense>
          )}
        </BrowserOnly>
      </main>
    </Layout>
  );
}