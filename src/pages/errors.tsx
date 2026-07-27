import React, { useState, useMemo } from 'react';
import Layout from '@theme/Layout';

/* ── Error data ──────────────────────────────────────────── */
interface ApiError {
  code: string;
  httpStatus: number;
  severity: 'critical' | 'warning' | 'info';
  meaning: string;
  commonCauses: string[];
  troubleshooting: string[];
  relatedEndpoints: string[];
}

const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };

const errors: ApiError[] = [
  {
    code: 'AUTH_001',
    httpStatus: 401,
    severity: 'critical',
    meaning: 'Missing or invalid API key.',
    commonCauses: ['Key omitted from Authorization header', 'Key expired or revoked'],
    troubleshooting: ['Verify the header is Authorization: Bearer <key>', 'Regenerate the key in the dashboard'],
    relatedEndpoints: ['All'],
  },
  {
    code: 'AUTH_002',
    httpStatus: 403,
    severity: 'critical',
    meaning: 'Insufficient permissions for the requested resource.',
    commonCauses: ['Using a read-only key for a write endpoint', 'IP whitelist mismatch'],
    troubleshooting: ['Check key scopes in the dashboard', 'Confirm your IP is in the allowed list'],
    relatedEndpoints: ['All'],
  },
  {
    code: 'RATE_001',
    httpStatus: 429,
    severity: 'warning',
    meaning: 'Rate limit exceeded.',
    commonCauses: ['Too many requests in a short window', 'Burst traffic from a single client'],
    troubleshooting: ['Implement exponential back-off', 'Check Retry-After header for wait time', 'Request a limit increase via support'],
    relatedEndpoints: ['All'],
  },
  {
    code: 'VAL_001',
    httpStatus: 400,
    severity: 'warning',
    meaning: 'Request body failed JSON schema validation.',
    commonCauses: ['Missing required fields', 'Wrong data type for a field', 'Enum value not in allowed set'],
    troubleshooting: ['Check the response body for field-level errors', 'Compare your payload against the OpenAPI spec'],
    relatedEndpoints: ['POST /payments', 'POST /transfers'],
  },
  {
    code: 'VAL_002',
    httpStatus: 400,
    severity: 'warning',
    meaning: 'Invalid query parameter value.',
    commonCauses: ['Unsupported filter value', 'Malformed date range'],
    troubleshooting: ['Review the endpoint documentation for allowed values', 'URL-encode parameter values'],
    relatedEndpoints: ['GET /payments', 'GET /transfers'],
  },
  {
    code: 'NOTFOUND_001',
    httpStatus: 404,
    severity: 'info',
    meaning: 'The requested resource does not exist.',
    commonCauses: ['Wrong ID in the URL path', 'Resource was deleted'],
    troubleshooting: ['Verify the ID matches a resource returned by a list endpoint', 'Check if the resource may have been soft-deleted'],
    relatedEndpoints: ['GET /payments/{id}', 'GET /transfers/{id}', 'GET /wallets/{id}'],
  },
  {
    code: 'CONFLICT_001',
    httpStatus: 409,
    severity: 'warning',
    meaning: 'The request conflicts with the current resource state.',
    commonCauses: ['Duplicate payment ID', 'Transfer already settled or reversed'],
    troubleshooting: ['Use an idempotency key for retries', 'Fetch the resource to check current state before acting'],
    relatedEndpoints: ['POST /payments', 'POST /transfers'],
  },
  {
    code: 'SERVER_001',
    httpStatus: 500,
    severity: 'critical',
    meaning: 'Unexpected internal server error.',
    commonCauses: ['Downstream provider (mobile money) timed out', 'Database connection pool exhausted'],
    troubleshooting: ['Wait and retry with back-off', 'If persistent, contact support with the X-Request-Id header value', 'Check status.proxypay.io for incidents'],
    relatedEndpoints: ['All'],
  },
  {
    code: 'SERVER_002',
    httpStatus: 502,
    severity: 'critical',
    meaning: 'Bad gateway — upstream provider returned an invalid response.',
    commonCauses: ['Mobile-money provider outage', 'Stellar Horizon node unreachable'],
    troubleshooting: ['Retry after 30 s', 'Check the provider status page', 'Contact support if it persists beyond 5 min'],
    relatedEndpoints: ['POST /payments', 'POST /transfers'],
  },
  {
    code: 'SERVER_003',
    httpStatus: 503,
    severity: 'critical',
    meaning: 'Service temporarily unavailable (maintenance / overload).',
    commonCauses: ['Scheduled maintenance window', 'Traffic spike triggering circuit breaker'],
    troubleshooting: ['Check Retry-After header', 'Visit status.proxypay.io for maintenance schedule'],
    relatedEndpoints: ['All'],
  },
  {
    code: 'KYC_001',
    httpStatus: 403,
    severity: 'warning',
    meaning: 'KYC verification required before this operation.',
    commonCauses: ['Partner account not yet verified', 'KYC tier too low for the requested transaction amount'],
    troubleshooting: ['Complete KYC in the dashboard', 'Upgrade to a higher tier for larger limits'],
    relatedEndpoints: ['POST /payments', 'POST /transfers'],
  },
  {
    code: 'WALLET_001',
    httpStatus: 400,
    severity: 'warning',
    meaning: 'Linked wallet is inactive or unsupported.',
    commonCauses: ['Wallet provider deactivated the account', 'MSISDN not registered for mobile money'],
    troubleshooting: ['Ask the end-user to verify their mobile-money account status', 'Try a different provider if available'],
    relatedEndpoints: ['POST /payments', 'POST /transfers'],
  },
];

/* ── Page component ──────────────────────────────────────── */
export default function Errors(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return errors
      .filter((e) => {
        if (severityFilter !== 'all' && e.severity !== severityFilter) return false;
        if (!q) return true;
        return (
          e.code.toLowerCase().includes(q) ||
          e.meaning.toLowerCase().includes(q) ||
          e.commonCauses.some((c) => c.toLowerCase().includes(q)) ||
          e.troubleshooting.some((t) => t.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const sev = severityOrder[a.severity] - severityOrder[b.severity];
        if (sev !== 0) return sev;
        return a.httpStatus - b.httpStatus;
      });
  }, [search, severityFilter]);

  const severityBadge = (s: string) => {
    const map: Record<string, string> = {
      critical: 'error-severity--critical',
      warning: 'error-severity--warning',
      info: 'error-severity--info',
    };
    return <span className={`error-severity ${map[s] || ''}`}>{s}</span>;
  };

  return (
    <Layout title="Error Reference" description="ProxyPay API error codes and troubleshooting">
      <main style={{ padding: '4rem 1.5rem', maxWidth: 960, margin: '0 auto' }}>

        <h1>API Error Reference</h1>
        <p>
          Below is every error code the ProxyPay API can return, with common causes and
          troubleshooting steps. Use the search and filter to narrow the list.
        </p>

        {/* ── Search & filter bar ───────────────────── */}
        <div className="error-toolbar">
          <input
            type="text"
            className="error-search"
            placeholder="Search by code, message, or keyword…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search error codes"
          />
          <select
            className="error-filter"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by severity"
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>
        </div>

        <p className="error-count">
          {filtered.length} of {errors.length} errors shown
        </p>

        {/* ── Error cards ───────────────────────────── */}
        {filtered.length === 0 ? (
          <div className="error-empty">
            <p>No errors match your search. Try a different keyword or clear the filter.</p>
          </div>
        ) : (
          <div className="error-list">
            {filtered.map((e) => (
              <div key={e.code} className={`error-card error-card--${e.severity}`} id={e.code}>
                <div className="error-card-header">
                  <code className="error-code">{e.code}</code>
                  <span className="error-http">{e.httpStatus}</span>
                  {severityBadge(e.severity)}
                </div>
                <p className="error-meaning">{e.meaning}</p>

                <div className="error-details-grid">
                  <div>
                    <h4>Common Causes</h4>
                    <ul>
                      {e.commonCauses.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4>Troubleshooting</h4>
                    <ul>
                      {e.troubleshooting.map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="error-related">
                  <strong>Related endpoints:</strong>{' '}
                  {e.relatedEndpoints.map((ep, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && ', '}
                      <code>{ep}</code>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
