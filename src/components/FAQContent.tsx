import React, { useState, useMemo } from 'react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  related: string[];
  codeSnippet?: { lang: string; code: string };
}

const faqData: FAQItem[] = [
  {
    id: 'auth-401',
    question: 'Why am I getting a 401 Unauthorized error?',
    answer: 'A 401 error means your API key is missing or invalid. Ensure you include the `Authorization` header with a valid API key in every request. If your key has expired, generate a new one from the dashboard.',
    category: 'Authentication',
    related: ['auth-403', 'auth-key-format'],
    codeSnippet: {
      lang: 'bash',
      code: `# Correct way to include the API key
curl -H "Authorization: Bearer YOUR_API_KEY" \\
  https://api.proxypay.com/v1/status`,
    },
  },
  {
    id: 'auth-403',
    question: 'What does a 403 Forbidden response mean?',
    answer: 'A 403 error indicates your API key is valid but you lack permissions for the requested resource. Check your account tier and endpoint access levels in the dashboard.',
    category: 'Authentication',
    related: ['auth-401', 'auth-key-format'],
    codeSnippet: {
      lang: 'json',
      code: `{
  "error": "forbidden",
  "message": "Insufficient permissions for this resource",
  "required_tier": "premium"
}`,
    },
  },
  {
    id: 'auth-key-format',
    question: 'What format should my API key be in?',
    answer: 'API keys are 64-character hexadecimal strings. They should be sent in the `Authorization` header prefixed with `Bearer`. Example key format: `pp_live_<64 hex chars>`.',
    category: 'Authentication',
    related: ['auth-401', 'rate-limit'],
    codeSnippet: {
      lang: 'bash',
      code: `# API key format
pp_live_a1b2c3d4e5f6... (64 hex characters)

# Usage in request header
Authorization: Bearer pp_live_a1b2c3d4e5f6...`,
    },
  },
  {
    id: 'rate-limit',
    question: 'How do rate limits work?',
    answer: 'Rate limits are applied per API key. The standard tier allows 100 requests per minute. When exceeded, you\'ll receive a 429 response. Check the `X-RateLimit-Remaining` header to monitor your usage.',
    category: 'Rate Limits',
    related: ['rate-limit-headers', 'auth-401'],
    codeSnippet: {
      lang: 'json',
      code: `{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Retry after 30 seconds.",
  "retry_after": 30
}`,
    },
  },
  {
    id: 'rate-limit-headers',
    question: 'Which headers show rate limit info?',
    answer: 'Every response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers. Use these to implement backoff in your client.',
    category: 'Rate Limits',
    related: ['rate-limit'],
    codeSnippet: {
      lang: 'bash',
      code: `X-RateLimit-Limit: 100
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1690000000`,
    },
  },
  {
    id: 'webhook-verify',
    question: 'How do I verify webhook signatures?',
    answer: 'Webhooks include a `X-ProxyPay-Signature` header. Verify it by computing HMAC-SHA256 of the request body using your webhook secret. Reject requests that don\'t match to prevent spoofing.',
    category: 'Webhooks',
    related: ['webhook-retry', 'webhook-ip'],
    codeSnippet: {
      lang: 'typescript',
      code: `import { createHmac } from 'crypto';

function verifySignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`,
    },
  },
  {
    id: 'webhook-retry',
    question: 'What is the webhook retry policy?',
    answer: 'Failed deliveries are retried up to 5 times with exponential backoff: 1s, 5s, 25s, 125s, 625s. Ensure your endpoint responds with 2xx within 10 seconds to confirm receipt.',
    category: 'Webhooks',
    related: ['webhook-verify', 'webhook-ip'],
  },
  {
    id: 'webhook-ip',
    question: 'What IPs do webhooks come from?',
    answer: 'Webhooks originate from `34.120.0.0/16` and `35.190.0.0/17`. Whitelist these ranges in your firewall to ensure delivery.',
    category: 'Webhooks',
    related: ['webhook-verify'],
  },
  {
    id: 'timeout',
    question: 'What is the request timeout?',
    answer: 'The API has a 30-second timeout for all endpoints. If your request takes longer, the connection is terminated. For long-running operations, use the async pattern with a callback URL.',
    category: 'Errors & Timeouts',
    related: ['rate-limit', 'async-ops'],
    codeSnippet: {
      lang: 'json',
      code: `{
  "error": "timeout",
  "message": "Request took longer than 30 seconds",
  "suggestion": "Use async endpoint with callback_url"
}`,
    },
  },
  {
    id: 'async-ops',
    question: 'How do asynchronous operations work?',
    answer: 'For long-running operations, provide a `callback_url` in your request. The API returns immediately with a `tracking_id`. Results are POSTed to your callback URL when complete.',
    category: 'Errors & Timeouts',
    related: ['timeout'],
    codeSnippet: {
      lang: 'json',
      code: `// Request
POST /v1/async/transfer
{
  "amount": 100,
  "callback_url": "https://you.com/webhook"
}

// Response (202 Accepted)
{
  "tracking_id": "trk_abc123",
  "status": "processing"
}`,
    },
  },
  {
    id: 'idempotency',
    question: 'How do I make idempotent requests?',
    answer: 'Include an `Idempotency-Key` header with a unique value per operation. The API deduplicates requests with the same key within 24 hours, returning the original response for duplicates.',
    category: 'Best Practices',
    related: ['rate-limit', 'auth-401'],
    codeSnippet: {
      lang: 'bash',
      code: `curl -H "Idempotency-Key: $(uuidgen)" \\
  -H "Authorization: Bearer $API_KEY" \\
  -X POST https://api.proxypay.com/v1/payments`,
    },
  },
  {
    id: 'pagination',
    question: 'How does pagination work?',
    answer: 'List endpoints support cursor-based pagination. Use `page_size` (max 100) and `page_cursor` parameters. The response includes `next_cursor` for fetching the next page.',
    category: 'Best Practices',
    related: ['rate-limit'],
    codeSnippet: {
      lang: 'json',
      code: `{
  "data": [...],
  "pagination": {
    "next_cursor": "cjr_xyz789",
    "has_more": true,
    "total": 1250
  }
}`,
    },
  },
  {
    id: 'error-format',
    question: 'What is the standard error response format?',
    answer: 'All errors follow a consistent JSON structure with `error`, `message`, and optional `details` fields. HTTP status codes map to error types: 400 (validation), 401 (auth), 403 (forbidden), 404 (not found), 409 (conflict), 429 (rate limit), 500 (server error).',
    category: 'Errors & Timeouts',
    related: ['auth-401', 'auth-403', 'rate-limit'],
    codeSnippet: {
      lang: 'json',
      code: `{
  "error": "validation_error",
  "message": "Invalid amount format",
  "details": [
    {
      "field": "amount",
      "issue": "Must be a positive number"
    }
  ]
}`,
    },
  },
  {
    id: 'sandbox',
    question: 'How do I test in sandbox mode?',
    answer: 'Use `https://sandbox.proxypay.com` as the base URL with your test API key (prefix `pp_test_`). Sandbox supports all production endpoints with simulated responses. No real transactions occur.',
    category: 'Getting Started',
    related: ['auth-401'],
    codeSnippet: {
      lang: 'bash',
      code: `# Sandbox base URL
https://sandbox.proxypay.com/v1/

# Test API key format
pp_test_a1b2c3d4... (64 hex chars)`,
    },
  },
  {
    id: 'mobile-money-formats',
    question: 'What mobile money formats are supported?',
    answer: 'Phone numbers should use E.164 format without the leading +. For example: `254712345678`. Supported providers include M-Pesa (Kenya, Tanzania), MTN Mobile Money (Uganda, Ghana), and Airtel Money.',
    category: 'Getting Started',
    related: ['error-format'],
    codeSnippet: {
      lang: 'json',
      code: `{
  "phone": "254712345678",
  "provider": "mpesa",
  "country": "KE"
}`,
    },
  },
];

const categories = Array.from(new Set(faqData.map((item) => item.category)));

export default function FAQContent(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  // Deep-link from URL hash (e.g., /faq#auth-401)
  React.useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash && faqData.some((item) => item.id === hash)) {
      setExpandedId(hash);
      setTimeout(() => {
        document.getElementById(`faq-${hash}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, []);

  const filtered = useMemo(() => {
    let items = faqData;
    if (activeCategory) {
      items = items.filter((i) => i.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (i) =>
          i.question.toLowerCase().includes(q) ||
          i.answer.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q)
      );
    }
    return items;
  }, [search, activeCategory]);

  const relatedFaqs = (ids: string[]): FAQItem[] =>
    faqData.filter((f) => ids.includes(f.id));

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleVote = (id: string, helpful: boolean) => {
    setVotedIds((prev) => new Set(prev).add(id));
    // In production: POST vote to backend for moderation
  };

  return (
    <div className="faq-container">
      <div className="faq-hero">
        <h1>Frequently Asked Questions</h1>
        <p>Search or browse common questions about the ProxyPay API</p>
        <div className="faq-search-wrapper">
          <svg className="faq-search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            className="faq-search-input"
            placeholder="Search FAQ... (e.g. authentication, webhooks, rate limits)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search FAQ"
          />
        </div>
      </div>

      <div className="faq-layout">
        <aside className="faq-sidebar">
          <h3>Categories</h3>
          <ul className="faq-category-list">
            <li>
              <button
                className={`faq-category-btn ${activeCategory === null ? 'active' : ''}`}
                onClick={() => setActiveCategory(null)}
              >
                All FAQs
                <span className="faq-category-count">{faqData.length}</span>
              </button>
            </li>
            {categories.map((cat) => (
              <li key={cat}>
                <button
                  className={`faq-category-btn ${activeCategory === cat ? 'active' : ''}`}
                  onClick={() => setActiveCategory(cat === activeCategory ? null : cat)}
                >
                  {cat}
                  <span className="faq-category-count">
                    {faqData.filter((i) => i.category === cat).length}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="faq-main">
          {filtered.length === 0 ? (
            <div className="faq-empty">
              <p>No FAQs found matching &ldquo;{search}&rdquo;.</p>
              <button onClick={() => { setSearch(''); setActiveCategory(null); }}>
                Clear filters
              </button>
            </div>
          ) : (
            <div className="faq-list">
              {filtered.map((item) => (
                <article
                  key={item.id}
                  id={`faq-${item.id}`}
                  className={`faq-item ${expandedId === item.id ? 'expanded' : ''}`}
                >
                  <button
                    className="faq-question"
                    onClick={() => toggleExpand(item.id)}
                    aria-expanded={expandedId === item.id}
                  >
                    <span className="faq-category-badge">{item.category}</span>
                    <span className="faq-question-text">{item.question}</span>
                    <svg
                      className={`faq-chevron ${expandedId === item.id ? 'rotated' : ''}`}
                      viewBox="0 0 24 24"
                      width="20"
                      height="20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {expandedId === item.id && (
                    <div className="faq-answer">
                      <div className="faq-answer-text">{item.answer}</div>

                      {item.codeSnippet && (
                        <div className="faq-code-block">
                          <div className="faq-code-header">
                            <span className="faq-code-lang">{item.codeSnippet.lang}</span>
                          </div>
                          <pre>
                            <code>{item.codeSnippet.code}</code>
                          </pre>
                        </div>
                      )}

                      {item.related.length > 0 && (
                        <div className="faq-related">
                          <h4>Related Questions</h4>
                          <div className="faq-related-links">
                            {relatedFaqs(item.related).map((related) => (
                              <button
                                key={related.id}
                                className="faq-related-link"
                                onClick={() => {
                                  setActiveCategory(null);
                                  setSearch('');
                                  setExpandedId(related.id);
                                  setTimeout(() => {
                                    document.getElementById(`faq-${related.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }, 100);
                                }}
                              >
                                {related.question}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {!votedIds.has(item.id) && (
                        <div className="faq-feedback">
                          <span>Was this helpful?</span>
                          <button
                            className="faq-feedback-btn thumbs-up"
                            onClick={() => handleVote(item.id, true)}
                            aria-label="Yes, this was helpful"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3m7-2V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" />
                            </svg>
                            Yes
                          </button>
                          <button
                            className="faq-feedback-btn thumbs-down"
                            onClick={() => handleVote(item.id, false)}
                            aria-label="No, this was not helpful"
                          >
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 2h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3m-7-2V5a3 3 0 0 1 3-3l4 9v11H5.72a2 2 0 0 1-2-1.7l-1.38-9a2 2 0 0 1 2-2.3H10Z" />
                            </svg>
                            No
                          </button>
                        </div>
                      )}

                      {votedIds.has(item.id) && (
                        <div className="faq-feedback-thanks">
                          Thanks for your feedback! Your input helps us improve.
                        </div>
                      )}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
