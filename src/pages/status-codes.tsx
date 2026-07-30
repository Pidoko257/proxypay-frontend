import React, { useState, useMemo } from 'react';
import Layout from '@theme/Layout';

interface StatusCode {
  code: number;
  name: string;
  category: string;
  description: string;
  whenReturned: string;
  endpoints: string[];
  solutions: string[];
  rfcLink: string;
}

const statusCodes: StatusCode[] = [
  {
    code: 200, name: 'OK', category: '2xx Success',
    description: 'The request succeeded. The response body contains the requested resource.',
    whenReturned: 'Successful GET, PUT, or PATCH operations.',
    endpoints: ['GET /v1/payments', 'GET /v1/payments/:id', 'GET /v1/webhooks', 'PUT /v1/webhooks/:id'],
    solutions: [],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.3.1',
  },
  {
    code: 201, name: 'Created', category: '2xx Success',
    description: 'A new resource was successfully created. The Location header contains the URI of the new resource.',
    whenReturned: 'Successful POST requests that create a resource.',
    endpoints: ['POST /v1/payments', 'POST /v1/refunds', 'POST /v1/webhooks'],
    solutions: [],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.3.2',
  },
  {
    code: 202, name: 'Accepted', category: '2xx Success',
    description: 'The request has been accepted for processing but is not yet complete.',
    whenReturned: 'Async operations like batch payment processing.',
    endpoints: ['POST /v1/batches'],
    solutions: [],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.3.3',
  },
  {
    code: 204, name: 'No Content', category: '2xx Success',
    description: 'The request succeeded but there is no content to send in the response.',
    whenReturned: 'Successful DELETE operations.',
    endpoints: ['DELETE /v1/webhooks/:id'],
    solutions: [],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.3.5',
  },
  {
    code: 301, name: 'Moved Permanently', category: '3xx Redirection',
    description: 'The resource has been moved to a new permanent URI.',
    whenReturned: 'When a resource endpoint path has changed. Client should update their references.',
    endpoints: ['Legacy endpoint redirects'],
    solutions: ['Update your client to use the new URL provided in the Location header.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.4.2',
  },
  {
    code: 304, name: 'Not Modified', category: '3xx Redirection',
    description: 'The resource has not been modified since the version specified by the request headers.',
    whenReturned: 'Conditional GET requests with If-None-Match or If-Modified-Since headers.',
    endpoints: ['GET /v1/payments/:id (conditional)'],
    solutions: ['No action needed. Use the cached version of the resource.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7232#section-4.1',
  },
  {
    code: 400, name: 'Bad Request', category: '4xx Client Error',
    description: 'The server cannot process the request due to malformed syntax or invalid parameters.',
    whenReturned: 'Invalid JSON body, missing required fields, or invalid parameter types.',
    endpoints: ['POST /v1/payments', 'POST /v1/refunds', 'POST /v1/webhooks'],
    solutions: ['Validate your request body against the API schema.', 'Check for missing required fields.', 'Ensure numeric fields are not passed as strings.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.1',
  },
  {
    code: 401, name: 'Unauthorized', category: '4xx Client Error',
    description: 'Authentication is required and has failed or has not been provided.',
    whenReturned: 'Missing or invalid API key, expired token, or incorrect credentials.',
    endpoints: ['ALL /v1/*'],
    solutions: ['Check that the Authorization header is present.', 'Verify your API key is active.', 'Regenerate your API key if it may have been compromised.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7235#section-3.1',
  },
  {
    code: 403, name: 'Forbidden', category: '4xx Client Error',
    description: 'The server understood the request but refuses to authorize it.',
    whenReturned: 'Valid credentials but insufficient permissions for the requested action.',
    endpoints: ['DELETE /v1/webhooks/:id', 'PUT /v1/webhooks/:id'],
    solutions: ['Verify your API key has the required scopes.', 'Check that the resource belongs to your account.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.3',
  },
  {
    code: 404, name: 'Not Found', category: '4xx Client Error',
    description: 'The requested resource does not exist.',
    whenReturned: 'Requesting a non-existent payment, webhook, or endpoint.',
    endpoints: ['GET /v1/payments/:id', 'GET /v1/webhooks/:id', 'DELETE /v1/webhooks/:id'],
    solutions: ['Verify the resource ID is correct.', 'Check if the resource may have been deleted.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.4',
  },
  {
    code: 409, name: 'Conflict', category: '4xx Client Error',
    description: 'The request conflicts with the current state of the resource.',
    whenReturned: 'Duplicate payment IDs or conflicting state transitions.',
    endpoints: ['POST /v1/payments', 'POST /v1/refunds'],
    solutions: ['Use an idempotency key to safely retry requests.', 'Check the current state of the resource before updating.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.5.8',
  },
  {
    code: 422, name: 'Unprocessable Entity', category: '4xx Client Error',
    description: 'The request is well-formed but contains semantic errors.',
    whenReturned: 'Business rule violations like invalid payment amounts or unsupported currencies.',
    endpoints: ['POST /v1/payments', 'POST /v1/refunds'],
    solutions: ['Check business rules for valid amounts and currencies.', 'Review validation error details in the response body.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc4918#section-11.2',
  },
  {
    code: 429, name: 'Too Many Requests', category: '4xx Client Error',
    description: 'Rate limit exceeded. The client has sent too many requests in a given time period.',
    whenReturned: 'Exceeding the rate limit quota for your API key tier.',
    endpoints: ['ALL /v1/*'],
    solutions: ['Implement exponential backoff with jitter.', 'Check Retry-After header for the wait time.', 'Consider upgrading your API tier for higher limits.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc6585#section-4',
  },
  {
    code: 500, name: 'Internal Server Error', category: '5xx Server Error',
    description: 'An unexpected error occurred on the server.',
    whenReturned: 'Unhandled exceptions or infrastructure failures.',
    endpoints: ['ALL /v1/*'],
    solutions: ['Retry with exponential backoff.', 'Check the status page for ongoing incidents.', 'Report persistent errors to support.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.1',
  },
  {
    code: 502, name: 'Bad Gateway', category: '5xx Server Error',
    description: 'The server received an invalid response from an upstream service.',
    whenReturned: 'Upstream provider (bank, MNO) returned an invalid response.',
    endpoints: ['POST /v1/payments'],
    solutions: ['Retry with exponential backoff.', 'This is usually transient—wait and retry.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.3',
  },
  {
    code: 503, name: 'Service Unavailable', category: '5xx Server Error',
    description: 'The server is temporarily unable to handle the request.',
    whenReturned: 'Planned maintenance or overload conditions.',
    endpoints: ['ALL /v1/*'],
    solutions: ['Check the Retry-After header.', 'Implement circuit breaker pattern.', 'Check the status page for maintenance windows.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.4',
  },
  {
    code: 504, name: 'Gateway Timeout', category: '5xx Server Error',
    description: 'The server did not receive a timely response from an upstream service.',
    whenReturned: 'Upstream provider timeout during payment processing.',
    endpoints: ['POST /v1/payments', 'POST /v1/refunds'],
    solutions: ['Use idempotency keys for safe retries.', 'Increase client timeout settings.', 'Implement retry with exponential backoff.'],
    rfcLink: 'https://datatracker.ietf.org/doc/html/rfc7231#section-6.6.5',
  },
];

const categories = [...new Set(statusCodes.map((s) => s.category))];

export default function StatusCodes(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [selected, setSelected] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let list = statusCodes;
    const q = search.toLowerCase();
    if (q) list = list.filter((s) => String(s.code).includes(q) || s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q) || s.whenReturned.toLowerCase().includes(q));
    if (filterCat) list = list.filter((s) => s.category === filterCat);
    return list;
  }, [search, filterCat]);

  return (
    <Layout title="HTTP Status Codes" description="Interactive HTTP status code reference for ProxyPay API">
      <main className="sc-page">
        <section className="sc-hero">
          <h1>HTTP Status Codes</h1>
          <p>Every status code the ProxyPay API returns, when it appears, and how to handle it.</p>
        </section>

        <section className="sc-search">
          <input
            type="text"
            placeholder='Search by code (e.g. "429") or meaning (e.g. "rate limit")...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sc-search-input"
          />
          <div className="sc-filters">
            {categories.map((cat) => (
              <button
                key={cat}
                className={`sc-filter-btn ${filterCat === cat ? 'sc-filter-active' : ''}`}
                onClick={() => setFilterCat(filterCat === cat ? '' : cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>

        <section className="sc-grid">
          {filtered.map((sc) => (
            <div
              key={sc.code}
              className={`sc-card ${selected === sc.code ? 'sc-card-open' : ''}`}
              onClick={() => setSelected(selected === sc.code ? null : sc.code)}
            >
              <div className="sc-card-header">
                <span className={`sc-code sc-code-${sc.category.charAt(0)}`}>{sc.code}</span>
                <div className="sc-card-title">
                  <strong>{sc.name}</strong>
                  <span className="sc-card-cat">{sc.category}</span>
                </div>
              </div>
              <p className="sc-desc">{sc.description}</p>

              {selected === sc.code && (
                <div className="sc-detail">
                  <div className="sc-detail-section">
                    <strong>When Returned</strong>
                    <p>{sc.whenReturned}</p>
                  </div>

                  <div className="sc-detail-section">
                    <strong>Linked Endpoints</strong>
                    <div className="sc-endpoints">
                      {sc.endpoints.map((ep) => (
                        <code key={ep} className="sc-ep-tag">{ep}</code>
                      ))}
                    </div>
                  </div>

                  {sc.solutions.length > 0 && (
                    <div className="sc-detail-section">
                      <strong>Common Solutions</strong>
                      <ul className="sc-solutions">
                        {sc.solutions.map((sol, i) => (
                          <li key={i}>{sol}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="sc-detail-section">
                    <a href={sc.rfcLink} target="_blank" rel="noopener noreferrer" className="sc-rfc-link" onClick={(e) => e.stopPropagation()}>
                      📄 RFC Documentation →
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="sc-empty">No status codes match your search.</p>}
        </section>
      </main>
    </Layout>
  );
}
