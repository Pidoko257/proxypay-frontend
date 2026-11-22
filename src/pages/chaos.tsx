import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Breadcrumb from '../components/Breadcrumb';

interface SimulationAction {
  id: string;
  name: string;
  description: string;
  disruptiveLevel: 'low' | 'medium' | 'high' | 'critical';
  impactSummary: string;
  targetEndpoint: string;
}

const SIMULATIONS: SimulationAction[] = [
  {
    id: 'latency-injection',
    name: 'Synthetic Gateway Latency (500ms)',
    description: 'Injects controlled artificial latency into payment verification pipelines.',
    disruptiveLevel: 'medium',
    impactSummary: 'Increases round-trip simulation time; downstream clients may trigger fallback retries.',
    targetEndpoint: '/api/v1/simulate/latency',
  },
  {
    id: 'error-spike',
    name: '503 Service Unavailable Spike (10%)',
    description: 'Forces 10% of incoming sandbox authorization attempts to return transient 503 errors.',
    disruptiveLevel: 'high',
    impactSummary: 'Tests client exponential backoff and circuit-breaker tripping thresholds.',
    targetEndpoint: '/api/v1/simulate/transient-errors',
  },
  {
    id: 'rate-limit-throttle',
    name: '429 Rate Limit Saturation',
    description: 'Forces immediate 429 Too Many Requests response on rate-limited endpoints.',
    disruptiveLevel: 'low',
    impactSummary: 'Validates client response parsing for Retry-After headers.',
    targetEndpoint: '/api/v1/simulate/rate-limit',
  },
  {
    id: 'webhook-delivery-drop',
    name: 'Webhook Failure & Retry Exhaustion',
    description: 'Silently discards webhook delivery attempts to test dead-letter queues.',
    disruptiveLevel: 'critical',
    impactSummary: 'Webhooks will fail delivery and queue for manual redelivery.',
    targetEndpoint: '/api/v1/simulate/webhook-drop',
  },
];

export default function ChaosSimulationPage(): React.JSX.Element {
  const [selectedEnv, setSelectedEnv] = useState<'sandbox' | 'staging' | 'production'>('sandbox');
  const [envVerified, setEnvVerified] = useState<boolean>(true);
  const [activeSimulation, setActiveSimulation] = useState<SimulationAction | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [typedConfirmation, setTypedConfirmation] = useState<string>('');
  const [runningSimulationId, setRunningSimulationId] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  const handleOpenConfirm = (action: SimulationAction) => {
    setActiveSimulation(action);
    setTypedConfirmation('');
    setIsDialogOpen(true);
  };

  const handleCloseConfirm = () => {
    setIsDialogOpen(false);
    setActiveSimulation(null);
    setTypedConfirmation('');
  };

  const handleExecute = () => {
    if (!activeSimulation || !envVerified || selectedEnv === 'production') {
      return;
    }
    setRunningSimulationId(activeSimulation.id);
    setIsDialogOpen(false);
    setExecutionMessage(`Successfully executed simulation: ${activeSimulation.name} on ${selectedEnv.toUpperCase()} environment.`);
    setTimeout(() => {
      setRunningSimulationId(null);
    }, 2000);
  };

  return (
    <Layout
      title="Chaos & Operational Simulations"
      description="Safeguarded operational simulations and chaos fault injection testing"
    >
      <Breadcrumb />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '2rem 1.5rem' }}>
        <header style={{ marginBottom: '2rem' }}>
          <h1>Chaos & Operational Simulations</h1>
          <p style={{ color: 'var(--ifm-color-emphasis-700)', fontSize: '1.05rem' }}>
            Safely test resilience, retry mechanisms, and circuit breakers against simulated transient faults.
          </p>
        </header>

        {/* Environment Verification & Scope Banner */}
        <section
          style={{
            background: 'var(--ifm-color-emphasis-100)',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: 8,
            padding: '1.25rem 1.5rem',
            marginBottom: '2rem',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
          }}
          aria-labelledby="env-scope-heading"
        >
          <div>
            <h2 id="env-scope-heading" style={{ fontSize: '1.1rem', margin: 0 }}>
              Target Environment Safeguard
            </h2>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--ifm-color-emphasis-700)' }}>
              Actions are strictly limited to verified non-production sandboxes.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <label htmlFor="environment-select" style={{ fontWeight: 600, fontSize: '0.9rem' }}>
              Environment:
            </label>
            <select
              id="environment-select"
              value={selectedEnv}
              onChange={(e) => {
                const env = e.target.value as 'sandbox' | 'staging' | 'production';
                setSelectedEnv(env);
                setEnvVerified(env !== 'production');
              }}
              style={{
                padding: '0.4rem 0.8rem',
                borderRadius: 6,
                border: '1px solid var(--ifm-color-emphasis-400)',
                background: 'var(--ifm-background-color)',
                color: 'var(--ifm-font-color-base)',
                fontWeight: 600,
              }}
            >
              <option value="sandbox">Sandbox (Verified)</option>
              <option value="staging">Staging (Verified)</option>
              <option value="production">Production (Locked)</option>
            </select>

            <span
              role="status"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.85rem',
                fontWeight: 600,
                padding: '0.25rem 0.6rem',
                borderRadius: 4,
                background: envVerified && selectedEnv !== 'production' ? '#e6f4ea' : '#fce8e6',
                color: envVerified && selectedEnv !== 'production' ? '#137333' : '#c5221f',
              }}
            >
              {envVerified && selectedEnv !== 'production' ? 'Verified Sandbox' : 'Disruptive Actions Blocked'}
            </span>
          </div>
        </section>

        {executionMessage && (
          <div
            role="alert"
            style={{
              padding: '1rem',
              borderRadius: 6,
              background: 'var(--ifm-color-success-contrast-background, #e6f4ea)',
              color: 'var(--ifm-color-success-contrast-foreground, #137333)',
              marginBottom: '1.5rem',
              fontWeight: 500,
            }}
          >
            {executionMessage}
          </div>
        )}

        {/* Simulation Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {SIMULATIONS.map((sim) => {
            const isBlocked = !envVerified || selectedEnv === 'production';
            const isRunning = runningSimulationId === sim.id;

            return (
              <article
                key={sim.id}
                style={{
                  border: '1px solid var(--ifm-color-emphasis-200)',
                  borderRadius: 8,
                  padding: '1.25rem',
                  background: 'var(--ifm-card-background-color, var(--ifm-background-color))',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.05rem', margin: 0 }}>{sim.name}</h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '0.15rem 0.45rem',
                        borderRadius: 4,
                        background:
                          sim.disruptiveLevel === 'critical'
                            ? '#fce8e6'
                            : sim.disruptiveLevel === 'high'
                            ? '#feefe3'
                            : '#e8f0fe',
                        color:
                          sim.disruptiveLevel === 'critical'
                            ? '#c5221f'
                            : sim.disruptiveLevel === 'high'
                            ? '#b06000'
                            : '#1a73e8',
                      }}
                    >
                      {sim.disruptiveLevel} impact
                    </span>
                  </div>

                  <p style={{ fontSize: '0.9rem', color: 'var(--ifm-color-emphasis-700)', marginBottom: '0.75rem' }}>
                    {sim.description}
                  </p>

                  <div
                    style={{
                      background: 'var(--ifm-color-emphasis-100)',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 6,
                      fontSize: '0.82rem',
                      marginBottom: '1rem',
                    }}
                  >
                    <strong>Effect Scope:</strong> {sim.impactSummary}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenConfirm(sim)}
                  disabled={isBlocked || isRunning}
                  aria-haspopup="dialog"
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    borderRadius: 6,
                    border: 'none',
                    fontWeight: 600,
                    cursor: isBlocked || isRunning ? 'not-allowed' : 'pointer',
                    background: isBlocked ? 'var(--ifm-color-emphasis-300)' : 'var(--ifm-color-primary)',
                    color: '#fff',
                    opacity: isBlocked ? 0.7 : 1,
                  }}
                >
                  {isRunning ? 'Simulating...' : isBlocked ? 'Action Disabled in Current Env' : 'Review & Confirm Simulation'}
                </button>
              </article>
            );
          })}
        </div>

        {/* Accessible Double-Confirmation Dialog */}
        {isDialogOpen && activeSimulation && (
          <div
            role="presentation"
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.55)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '1rem',
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-dialog-title"
              aria-describedby="confirm-dialog-desc"
              style={{
                background: 'var(--ifm-background-color)',
                borderRadius: 8,
                maxWidth: 520,
                width: '100%',
                padding: '1.75rem',
                boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
              }}
            >
              <h2 id="confirm-dialog-title" style={{ marginTop: 0, fontSize: '1.25rem' }}>
                Confirm Simulation Execution
              </h2>

              <div id="confirm-dialog-desc" style={{ marginBottom: '1.25rem' }}>
                <p style={{ margin: '0 0 0.75rem', fontSize: '0.95rem' }}>
                  You are about to invoke <strong>{activeSimulation.name}</strong> on endpoint{' '}
                  <code>{activeSimulation.targetEndpoint}</code>.
                </p>
                <div
                  style={{
                    background: 'var(--ifm-color-emphasis-100)',
                    padding: '0.75rem',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    borderLeft: '4px solid var(--ifm-color-warning)',
                  }}
                >
                  <strong>Target Environment:</strong> {selectedEnv.toUpperCase()}
                  <br />
                  <strong>Expected Impact:</strong> {activeSimulation.impactSummary}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label htmlFor="confirm-input" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Type <span style={{ color: 'var(--ifm-color-danger)' }}>CONFIRM</span> to verify:
                </label>
                <input
                  id="confirm-input"
                  type="text"
                  value={typedConfirmation}
                  onChange={(e) => setTypedConfirmation(e.target.value)}
                  placeholder="CONFIRM"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    borderRadius: 6,
                    border: '1px solid var(--ifm-color-emphasis-400)',
                    background: 'var(--ifm-background-color)',
                    color: 'var(--ifm-font-color-base)',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={handleCloseConfirm}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 6,
                    border: '1px solid var(--ifm-color-emphasis-400)',
                    background: 'transparent',
                    color: 'var(--ifm-font-color-base)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={typedConfirmation.trim() !== 'CONFIRM'}
                  style={{
                    padding: '0.5rem 1.25rem',
                    borderRadius: 6,
                    border: 'none',
                    background: typedConfirmation.trim() === 'CONFIRM' ? 'var(--ifm-color-danger)' : 'var(--ifm-color-emphasis-300)',
                    color: '#fff',
                    fontWeight: 600,
                    cursor: typedConfirmation.trim() === 'CONFIRM' ? 'pointer' : 'not-allowed',
                  }}
                >
                  Execute Simulation
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </Layout>
  );
}