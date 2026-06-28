export interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'Docs' | 'API Reference' | 'Guides';
  path: string;
  keywords: string[];
}

const searchIndex: SearchResult[] = [
  {
    id: 'overview',
    title: 'Overview',
    description: 'ProxyPay API documentation portal overview and getting started',
    category: 'Docs',
    path: '/',
    keywords: ['home', 'welcome', 'introduction', 'about'],
  },
  {
    id: 'getting-started',
    title: 'Getting Started',
    description: 'Quick start guide for integrating with the ProxyPay API',
    category: 'Docs',
    path: '/',
    keywords: ['quickstart', 'setup', 'integration', 'first steps'],
  },
  {
    id: 'authentication',
    title: 'Authentication',
    description: 'API key authentication and security for ProxyPay API requests',
    category: 'Docs',
    path: '/api',
    keywords: ['auth', 'api key', 'token', 'security', 'credentials'],
  },
  {
    id: 'api-reference',
    title: 'API Reference Overview',
    description: 'Complete REST API reference for the ProxyPay platform',
    category: 'API Reference',
    path: '/api',
    keywords: ['rest', 'full reference', 'endpoints', 'specification'],
  },
  {
    id: 'create-payment',
    title: 'Create a Payment',
    description: 'POST /payments — Initiate a new payment transaction',
    category: 'API Reference',
    path: '/api',
    keywords: ['post', 'payment', 'create', 'initiate', 'transaction'],
  },
  {
    id: 'list-payments',
    title: 'List Payments',
    description: 'GET /payments — Retrieve a list of all payments',
    category: 'API Reference',
    path: '/api',
    keywords: ['get', 'payments', 'list', 'retrieve', 'all'],
  },
  {
    id: 'get-payment',
    title: 'Get Payment by ID',
    description: 'GET /payments/{id} — Retrieve details of a specific payment',
    category: 'API Reference',
    path: '/api',
    keywords: ['get', 'payment', 'details', 'by id', 'retrieve'],
  },
  {
    id: 'create-collection',
    title: 'Create a Collection',
    description: 'POST /collections — Create a new collection request',
    category: 'API Reference',
    path: '/api',
    keywords: ['post', 'collection', 'create', 'request'],
  },
  {
    id: 'list-collections',
    title: 'List Collections',
    description: 'GET /collections — Retrieve all collection requests',
    category: 'API Reference',
    path: '/api',
    keywords: ['get', 'collections', 'list', 'retrieve'],
  },
  {
    id: 'webhooks',
    title: 'Webhooks',
    description: 'POST /webhooks — Configure and manage webhook endpoints',
    category: 'API Reference',
    path: '/api',
    keywords: ['webhook', 'callback', 'notification', 'post'],
  },
  {
    id: 'error-codes',
    title: 'Error Codes',
    description: 'Standard error codes and responses for the ProxyPay API',
    category: 'API Reference',
    path: '/api',
    keywords: ['errors', 'codes', 'responses', 'status', 'exceptions'],
  },
  {
    id: 'best-practices',
    title: 'Best Practices',
    description: 'Recommended practices for building with the ProxyPay API',
    category: 'Guides',
    path: '/',
    keywords: ['recommendations', 'optimization', 'tips', 'guidelines'],
  },
  {
    id: 'error-handling',
    title: 'Error Handling Guide',
    description: 'How to handle API errors gracefully in your integration',
    category: 'Guides',
    path: '/api',
    keywords: ['errors', 'handling', 'retry', 'fallback', 'exceptions'],
  },
  {
    id: 'rate-limiting',
    title: 'Rate Limiting',
    description: 'Understanding ProxyPay API rate limits and how to handle them',
    category: 'Guides',
    path: '/',
    keywords: ['limits', 'throttling', '429', 'backoff'],
  },
  {
    id: 'testing',
    title: 'Testing Your Integration',
    description: 'Guide to testing your ProxyPay integration in sandbox mode',
    category: 'Guides',
    path: '/',
    keywords: ['test', 'sandbox', 'mock', 'staging', 'quality assurance'],
  },
];

export default searchIndex;
