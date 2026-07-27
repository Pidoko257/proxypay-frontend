import React, { useState, useMemo } from 'react';
import Layout from '@theme/Layout';

interface Integration {
  name: string;
  language: string;
  useCase: string;
  popularity: number;
  repo: string;
  docs: string;
  description: string;
  stars: number;
  rating: number;
  reviews: number;
  usageExample: string;
}

const integrations: Integration[] = [
  {
    name: 'proxypay-js', language: 'JavaScript', useCase: 'Payments', popularity: 98,
    repo: 'https://github.com/proxypay/proxypay-js', docs: 'https://docs.proxypay.com/js',
    description: 'Official JavaScript SDK for ProxyPay API with full type definitions.',
    stars: 1240, rating: 4.8, reviews: 87,
    usageExample: `import { ProxyPay } from 'proxypay-js';\nconst pp = new ProxyPay({ apiKey: 'sk_...' });\nawait pp.payments.create({ amount: 100, currency: 'MZN' });`,
  },
  {
    name: 'proxypay-python', language: 'Python', useCase: 'Payments', popularity: 95,
    repo: 'https://github.com/proxypay/proxypay-python', docs: 'https://docs.proxypay.com/python',
    description: 'Official Python SDK with async support and automatic retries.',
    stars: 890, rating: 4.7, reviews: 62,
    usageExample: `from proxypay import ProxyPay\npp = ProxyPay(api_key="sk_...")\npayment = pp.payments.create(amount=100, currency="MZN")`,
  },
  {
    name: 'proxypay-laravel', language: 'PHP', useCase: 'E-commerce', popularity: 87,
    repo: 'https://github.com/proxypay/proxypay-laravel', docs: 'https://docs.proxypay.com/laravel',
    description: 'Laravel package with facades, webhooks, and artisan commands.',
    stars: 560, rating: 4.5, reviews: 41,
    usageExample: `use ProxyPay\\Facades\\ProxyPay;\n$payment = ProxyPay::createPayment(100, 'MZN');`,
  },
  {
    name: 'proxypay-dotnet', language: 'C#', useCase: 'Enterprise', popularity: 72,
    repo: 'https://github.com/proxypay/proxypay-dotnet', docs: 'https://docs.proxypay.com/dotnet',
    description: '.NET SDK targeting .NET 8+ with DI support and Polly resilience.',
    stars: 340, rating: 4.3, reviews: 28,
    usageExample: `var pp = new ProxyPayClient("sk_...");\nvar payment = await pp.Payments.CreateAsync(100, "MZN");`,
  },
  {
    name: 'proxypay-go', language: 'Go', useCase: 'Microservices', popularity: 68,
    repo: 'https://github.com/proxypay/proxypay-go', docs: 'https://docs.proxypay.com/go',
    description: 'Idiomatic Go client with context support and structured logging.',
    stars: 280, rating: 4.6, reviews: 22,
    usageExample: `pp := proxypay.NewClient("sk_...")\npayment, err := pp.Payments.Create(ctx, 100, "MZN")`,
  },
  {
    name: 'proxypay-ruby', language: 'Ruby', useCase: 'SaaS', popularity: 55,
    repo: 'https://github.com/proxypay/proxypay-ruby', docs: 'https://docs.proxypay.com/ruby',
    description: 'Ruby gem with Rails integration, ActiveModel validation, and webhooks.',
    stars: 190, rating: 4.4, reviews: 16,
    usageExample: `pp = ProxyPay::Client.new(api_key: "sk_...")\npayment = pp.payments.create(amount: 100, currency: "MZN")`,
  },
  {
    name: 'proxypay-flutter', language: 'Dart', useCase: 'Mobile', popularity: 60,
    repo: 'https://github.com/proxypay/proxypay-flutter', docs: 'https://docs.proxypay.com/flutter',
    description: 'Flutter plugin with native checkout UI components for Android & iOS.',
    stars: 420, rating: 4.5, reviews: 35,
    usageExample: `final pp = ProxyPay(apiKey: 'sk_...');\nfinal payment = await pp.payments.create(100, 'MZN');`,
  },
  {
    name: 'proxypay-postman', language: 'REST', useCase: 'Testing', popularity: 82,
    repo: 'https://github.com/proxypay/postman-collection', docs: 'https://docs.proxypay.com/postman',
    description: 'Pre-built Postman collection with all endpoints and environment variables.',
    stars: 150, rating: 4.2, reviews: 19,
    usageExample: `// Import collection in Postman and set environment:\n// baseUrl = https://api.proxypay.com/v1\n// apiKey = sk_...`,
  },
  {
    name: 'proxypay-woocommerce', language: 'PHP', useCase: 'E-commerce', popularity: 91,
    repo: 'https://github.com/proxypay/woocommerce-plugin', docs: 'https://docs.proxypay.com/woocommerce',
    description: 'WooCommerce payment gateway plugin with MZN currency support.',
    stars: 720, rating: 4.6, reviews: 94,
    usageExample: `// Install via WordPress admin > Plugins > Add New\n// Configure API keys in WooCommerce > Settings > Payments > ProxyPay`,
  },
  {
    name: 'proxypay-terraform', language: 'HCL', useCase: 'Infrastructure', popularity: 45,
    repo: 'https://github.com/proxypay/terraform-provider', docs: 'https://docs.proxypay.com/terraform',
    description: 'Terraform provider for managing webhooks, API keys, and account config.',
    stars: 95, rating: 4.1, reviews: 10,
    usageExample: `resource "proxypay_webhook" "payment_success" {\n  url = "https://myapp.com/webhooks/payment"\n  events = ["payment.succeeded"]\n}`,
  },
];

const languages = [...new Set(integrations.map((i) => i.language))];
const useCases = [...new Set(integrations.map((i) => i.useCase))];

export default function Integrations(): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [filterLang, setFilterLang] = useState('');
  const [filterUseCase, setFilterUseCase] = useState('');
  const [sortBy, setSortBy] = useState<'popularity' | 'rating' | 'stars'>('popularity');
  const [selected, setSelected] = useState<Integration | null>(null);

  const filtered = useMemo(() => {
    let list = integrations;
    const q = search.toLowerCase();
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.language.toLowerCase().includes(q));
    if (filterLang) list = list.filter((i) => i.language === filterLang);
    if (filterUseCase) list = list.filter((i) => i.useCase === filterUseCase);
    list.sort((a, b) => b[sortBy] - a[sortBy]);
    return list;
  }, [search, filterLang, filterUseCase, sortBy]);

  return (
    <Layout title="Integrations" description="ProxyPay integrations and third-party libraries">
      <main className="int-page">
        <section className="int-hero">
          <h1>Integrations &amp; Libraries</h1>
          <p>Discover official SDKs, community libraries, and platform integrations for ProxyPay.</p>
        </section>

        <section className="int-search-bar">
          <input
            type="text"
            placeholder="Search integrations by name, language, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="int-search-input"
          />
          <div className="int-filters">
            <select value={filterLang} onChange={(e) => setFilterLang(e.target.value)}>
              <option value="">All Languages</option>
              {languages.map((l) => (<option key={l} value={l}>{l}</option>))}
            </select>
            <select value={filterUseCase} onChange={(e) => setFilterUseCase(e.target.value)}>
              <option value="">All Use Cases</option>
              {useCases.map((u) => (<option key={u} value={u}>{u}</option>))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
              <option value="popularity">Sort: Popularity</option>
              <option value="rating">Sort: Rating</option>
              <option value="stars">Sort: Stars</option>
            </select>
          </div>
        </section>

        <section className="int-grid">
          {filtered.map((intg) => (
            <div key={intg.name} className="int-card" onClick={() => setSelected(intg === selected ? null : intg)}>
              <div className="int-card-header">
                <span className="int-card-name">{intg.name}</span>
                <span className="int-card-lang">{intg.language}</span>
              </div>
              <p className="int-card-desc">{intg.description}</p>
              <div className="int-card-meta">
                <span title="GitHub stars">⭐ {intg.stars.toLocaleString()}</span>
                <span title="Rating">{'★'.repeat(Math.floor(intg.rating))}{intg.rating % 1 >= 0.5 ? '½' : ''} ({intg.reviews})</span>
                <span className="int-card-use">{intg.useCase}</span>
              </div>
              {selected === intg && (
                <div className="int-card-detail">
                  <div className="int-detail-links">
                    <a href={intg.repo} target="_blank" rel="noopener noreferrer" className="int-link">📁 Repository</a>
                    <a href={intg.docs} target="_blank" rel="noopener noreferrer" className="int-link">📖 Documentation</a>
                  </div>
                  <div className="int-usage">
                    <strong>Usage Example</strong>
                    <pre><code>{intg.usageExample}</code></pre>
                  </div>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && <p className="int-empty">No integrations match your filters.</p>}
        </section>

        <section className="int-contribute">
          <h2>Contribute an Integration</h2>
          <p>Built a library or plugin for ProxyPay? We'd love to feature it here.</p>
          <div className="int-contribute-steps">
            <div className="int-step">
              <span className="int-step-num">1</span>
              <span>Create a public GitHub repository with your integration</span>
            </div>
            <div className="int-step">
              <span className="int-step-num">2</span>
              <span>Add a <code>proxypay-integration</code> topic to the repo</span>
            </div>
            <div className="int-step">
              <span className="int-step-num">3</span>
              <span>Submit a PR to <code>proxypay/integrations</code> with your listing</span>
            </div>
            <div className="int-step">
              <span className="int-step-num">4</span>
              <span>Our team reviews and publishes within 2 business days</span>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}
