import React, {useEffect, useState} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import * as yaml from 'js-yaml';

type OpenApiInfo = {title?: string; version?: string; description?: string};

const LANGS = [
  'Python',
  'JavaScript',
  'Go',
  'Java',
  'Ruby',
  'PHP',
] as const;

const TEMPLATES: Record<string, any> = {
  Python: {
    pkg: 'pip install proxypay',
    quickstart: `from proxypay import Client\n\nclient = Client(api_key=\"YOUR_API_KEY\")\nresp = client.payments.list()`,
    auth: 'Set `PROXYPAY_API_KEY` environment variable or pass `api_key` to Client.',
    examples: [
      'Create a payment',
      'Query payment status',
    ],
    docs: 'https://example.com/sdk/python',
  },
  JavaScript: {
    pkg: 'npm install @proxypay/sdk',
    quickstart: `import Proxypay from '@proxypay/sdk';\n\nconst client = new Proxypay({ apiKey: process.env.PROXYPAY_API_KEY });\nconst resp = await client.payments.list();`,
    auth: 'Use `PROXYPAY_API_KEY` env var or pass `apiKey` to constructor.',
    examples: ['Create a payment', 'Listen for payment webhook'],
    docs: 'https://example.com/sdk/javascript',
  },
  Go: {
    pkg: 'go get github.com/proxypay/sdk',
    quickstart: `import \"github.com/proxypay/sdk\"\n\nclient := sdk.NewClient(\"YOUR_API_KEY\")\nresp, _ := client.Payments.List()`,
    auth: 'Pass API key to `sdk.NewClient` or set env var `PROXYPAY_API_KEY`.',
    examples: ['Create a payment', 'Poll payment status'],
    docs: 'https://example.com/sdk/go',
  },
  Java: {
    pkg: 'mvn install com.proxypay:proxypay-sdk:1.0.0',
    quickstart: `ProxypayClient client = new ProxypayClient(\"YOUR_API_KEY\");\nvar resp = client.getPayments();`,
    auth: 'Provide API key to `ProxypayClient` constructor or via environment.',
    examples: ['Create a payment', 'Get payment by id'],
    docs: 'https://example.com/sdk/java',
  },
  Ruby: {
    pkg: 'gem install proxypay',
    quickstart: `require \"proxypay\"\nclient = ProxyPay::Client.new(api_key: ENV['PROXYPAY_API_KEY'])\nresp = client.payments.list`,
    auth: 'Use `PROXYPAY_API_KEY` env var or pass `api_key` to client.',
    examples: ['Create a payment', 'Refund a payment'],
    docs: 'https://example.com/sdk/ruby',
  },
  PHP: {
    pkg: 'composer require proxypay/proxypay',
    quickstart: `<?php\nrequire 'vendor/autoload.php';\n$client = new Proxypay\\Client(getenv('PROXYPAY_API_KEY'));\n$resp = $client->payments()->list();`,
    auth: 'Set `PROXYPAY_API_KEY` or pass key to client constructor.',
    examples: ['Create a payment', 'Webhook receiver example'],
    docs: 'https://example.com/sdk/php',
  },
};

export default function SdkGuides(): React.JSX.Element {
  const [info, setInfo] = useState<OpenApiInfo | null>(null);
  useEffect(() => {
    fetch('/openapi.yaml')
      .then((r) => r.text())
      .then((txt) => {
        try {
          const doc = yaml.load(txt) as any;
          setInfo(doc?.info ?? null);
        } catch (e) {
          setInfo(null);
        }
      })
      .catch(() => setInfo(null));
  }, []);

  return (
    <Layout title="SDK Guides" description="Auto-generated SDK installation and quickstarts">
      <main style={{ padding: '2rem 1.5rem', maxWidth: 900, margin: '0 auto' }} className="sdk-guides">
        <h1>SDK Guides</h1>
        <p>
          Auto-generated quickstart and installation instructions for supported SDKs. API: {info?.title ?? 'ProxyPay API'}{' '}
          {info?.version ? `v${info.version}` : ''}
        </p>

        <nav style={{ margin: '1rem 0' }}>
          {LANGS.map((l) => (
            <Link key={l} to={`#${l.toLowerCase()}`} className="button button--secondary" style={{ marginRight: 8 }}>
              {l}
            </Link>
          ))}
        </nav>

        {LANGS.map((lang) => {
          const t = TEMPLATES[lang as string];
          return (
            <section key={lang} id={lang.toLowerCase()} style={{ margin: '2rem 0' }}>
              <h2>{lang}</h2>
              <div className="sdk-card">
                <h3>Installation</h3>
                <pre>
                  <code className="language-bash">{t.pkg}</code>
                </pre>

                <h3>Quickstart</h3>
                <pre>
                  <code className={`language-${lang === 'JavaScript' ? 'js' : lang.toLowerCase()}`}>{t.quickstart}</code>
                </pre>

                <h3>Authentication</h3>
                <p>{t.auth}</p>

                <h3>Common use cases</h3>
                <ul>
                  {t.examples.map((ex: string) => (
                    <li key={ex}>{ex}</li>
                  ))}
                </ul>

                <p>
                  Full SDK documentation: <a href={t.docs} target="_blank" rel="noreferrer">{t.docs}</a>
                </p>
              </div>
            </section>
          );
        })}
      </main>
    </Layout>
  );
}
