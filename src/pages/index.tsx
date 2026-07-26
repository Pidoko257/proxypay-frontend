import React, { useState } from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';

// OAuth2 flow step definition
interface OAuth2Step {
  id: string;
  label: string;
  description: string;
  docsHref: string;
  from: string;
  to: string;
}

const OAUTH2_FLOWS: Record<string, { label: string; steps: OAuth2Step[] }> = {
  authorization_code: {
    label: 'Authorization Code',
    steps: [
      {
        id: 'step-1',
        label: '1. Client → Auth Server',
        description: 'Client redirects user to the authorization endpoint with client_id, redirect_uri, scope, and state.',
        docsHref: '/api',
        from: 'Client',
        to: 'Auth Server',
      },
      {
        id: 'step-2',
        label: '2. User Authenticates',
        description: 'User logs in and grants the requested permissions on the Auth Server.',
        docsHref: '/api',
        from: 'User',
        to: 'Auth Server',
      },
      {
        id: 'step-3',
        label: '3. Auth Server → Client',
        description: 'Auth Server redirects back with an authorization code and the original state value.',
        docsHref: '/api',
        from: 'Auth Server',
        to: 'Client',
      },
      {
        id: 'step-4',
        label: '4. Client → Token Endpoint',
        description: 'Client exchanges the code (plus client_secret) for access and refresh tokens.',
        docsHref: '/api',
        from: 'Client',
        to: 'Token Endpoint',
      },
      {
        id: 'step-5',
        label: '5. Token Response',
        description: 'Token endpoint returns access_token, token_type, expires_in, and refresh_token.',
        docsHref: '/api',
        from: 'Token Endpoint',
        to: 'Client',
      },
    ],
  },
  pkce: {
    label: 'PKCE',
    steps: [
      {
        id: 'pkce-1',
        label: '1. Generate Code Verifier',
        description: 'Client generates a cryptographically random code_verifier and derives code_challenge = BASE64URL(SHA256(verifier)).',
        docsHref: '/api',
        from: 'Client',
        to: 'Client',
      },
      {
        id: 'pkce-2',
        label: '2. Authorization Request',
        description: 'Client sends authorization request including code_challenge and code_challenge_method=S256.',
        docsHref: '/api',
        from: 'Client',
        to: 'Auth Server',
      },
      {
        id: 'pkce-3',
        label: '3. User Consents',
        description: 'User authenticates and grants permission. Auth Server stores the code_challenge.',
        docsHref: '/api',
        from: 'User',
        to: 'Auth Server',
      },
      {
        id: 'pkce-4',
        label: '4. Authorization Code Returned',
        description: 'Auth Server redirects back to client with the authorization code.',
        docsHref: '/api',
        from: 'Auth Server',
        to: 'Client',
      },
      {
        id: 'pkce-5',
        label: '5. Token Exchange with Verifier',
        description: 'Client sends the code plus the original code_verifier. Auth Server verifies the challenge.',
        docsHref: '/api',
        from: 'Client',
        to: 'Token Endpoint',
      },
      {
        id: 'pkce-6',
        label: '6. Token Issued',
        description: 'Upon successful verification, the token endpoint issues the access and refresh tokens.',
        docsHref: '/api',
        from: 'Token Endpoint',
        to: 'Client',
      },
    ],
  },
  implicit: {
    label: 'Implicit (Legacy)',
    steps: [
      {
        id: 'imp-1',
        label: '1. Authorization Request',
        description: 'Client redirects with response_type=token. No client_secret used.',
        docsHref: '/api',
        from: 'Client',
        to: 'Auth Server',
      },
      {
        id: 'imp-2',
        label: '2. User Authenticates',
        description: 'User logs in and grants permission.',
        docsHref: '/api',
        from: 'User',
        to: 'Auth Server',
      },
      {
        id: 'imp-3',
        label: '3. Token in Fragment',
        description: 'Auth Server redirects back with access_token directly in the URL fragment. No refresh token issued.',
        docsHref: '/api',
        from: 'Auth Server',
        to: 'Client',
      },
    ],
  },
};

// Animated OAuth2 Flow Diagram component
function OAuth2FlowDiagram(): React.JSX.Element {
  const [activeFlow, setActiveFlow] = useState<string>('authorization_code');
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [animating, setAnimating] = useState<boolean>(false);
  const [animatedStep, setAnimatedStep] = useState<number>(-1);

  const flow = OAUTH2_FLOWS[activeFlow];
  const steps = flow.steps;

  function handleRunAnimation() {
    if (animating) return;
    setAnimating(true);
    setActiveStep(null);
    setAnimatedStep(-1);

    steps.forEach((_, i) => {
      setTimeout(() => {
        setAnimatedStep(i);
        if (i === steps.length - 1) {
          setAnimating(false);
        }
      }, i * 700);
    });
  }

  function handleFlowChange(flowKey: string) {
    setActiveFlow(flowKey);
    setActiveStep(null);
    setAnimatedStep(-1);
    setAnimating(false);
  }

  return (
    <section className="oauth2-diagram-section" aria-label="OAuth2 Flow Diagram">
      <h2 className="oauth2-diagram-title">OAuth2 Authentication Flows</h2>
      <p className="oauth2-diagram-subtitle">
        Select a flow to see how authentication works step by step. Click a step for details.
      </p>

      {/* Flow selector tabs */}
      <div className="oauth2-flow-tabs" role="tablist" aria-label="OAuth2 flow types">
        {Object.entries(OAUTH2_FLOWS).map(([key, { label }]) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeFlow === key}
            className={`oauth2-tab${activeFlow === key ? ' oauth2-tab--active' : ''}`}
            onClick={() => handleFlowChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Diagram area */}
      <div className="oauth2-diagram-wrapper">
        <div className="oauth2-steps" role="list" aria-label={`${flow.label} flow steps`}>
          {steps.map((step, i) => {
            const isHighlighted = animatedStep >= i;
            const isActive = activeStep === i;
            return (
              <React.Fragment key={step.id}>
                <div
                  role="listitem"
                  className={`oauth2-step${isHighlighted ? ' oauth2-step--animated' : ''}${isActive ? ' oauth2-step--active' : ''}`}
                  style={{ animationDelay: `${i * 0.1}s` }}
                  onClick={() => setActiveStep(isActive ? null : i)}
                  aria-expanded={isActive}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setActiveStep(isActive ? null : i);
                    }
                  }}
                >
                  <span className="oauth2-step-number">{i + 1}</span>
                  <span className="oauth2-step-label">{step.label}</span>
                  <span className="oauth2-step-arrow">▶</span>
                </div>
                {isActive && (
                  <div className="oauth2-step-detail" role="region" aria-label={`Details for ${step.label}`}>
                    <p>{step.description}</p>
                    <p className="oauth2-step-actors">
                      <strong>{step.from}</strong> → <strong>{step.to}</strong>
                    </p>
                    <Link
                      className="oauth2-step-link"
                      to={step.docsHref}
                      aria-label={`View docs for ${step.label}`}
                    >
                      View in API Reference →
                    </Link>
                  </div>
                )}
                {i < steps.length - 1 && (
                  <div
                    className={`oauth2-connector${isHighlighted && animatedStep > i ? ' oauth2-connector--animated' : ''}`}
                    aria-hidden="true"
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile: simplified version */}
        <div className="oauth2-mobile-summary" aria-label={`${flow.label} summary`}>
          <ol>
            {steps.map((step) => (
              <li key={step.id}>
                <Link to={step.docsHref}>{step.label}</Link>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* Controls */}
      <div className="oauth2-controls">
        <button
          className="button button--primary oauth2-animate-btn"
          onClick={handleRunAnimation}
          disabled={animating}
          aria-busy={animating}
        >
          {animating ? 'Animating…' : '▶ Animate Flow'}
        </button>
        <button
          className="button button--secondary oauth2-reset-btn"
          onClick={() => {
            setAnimatedStep(-1);
            setActiveStep(null);
            setAnimating(false);
          }}
        >
          Reset
        </button>
      </div>
    </section>
  );
}

export default function Home(): React.JSX.Element {
  return (
    <Layout title="Developer Portal" description="ProxyPay partner API docs">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 900, margin: '0 auto' }}>
        <h1>ProxyPay API Documentation Portal</h1>
        <p>
          This portal publishes a searchable, first-class API reference for partners using the
          canonical <code>openapi.yaml</code> in this repository.
        </p>
        <p>
          <Link className="button button--primary button--lg" to="/api">
            Open API Reference
          </Link>
        </p>

        {/* Issue #251: OAuth2 Flow Diagram */}
        <OAuth2FlowDiagram />
      </main>
    </Layout>
  );
}
