import React from 'react';

interface Endpoint {
  method: string;
  path: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#61affe',
  POST: '#49cc90',
  PUT: '#fca130',
  PATCH: '#50e3c2',
  DELETE: '#f93e3e',
  HEAD: '#9012fe',
  OPTIONS: '#0d5aa7',
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      title="Copy endpoint"
      aria-label={copied ? 'Copied!' : `Copy ${text}`}
      style={{
        background: 'none',
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderRadius: 4,
        cursor: 'pointer',
        padding: '0.15rem 0.5rem',
        fontSize: '0.75rem',
        color: copied ? '#49cc90' : 'var(--ifm-color-emphasis-600)',
        transition: 'color 0.2s, border-color 0.2s',
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function EndpointCopyList(): React.JSX.Element | null {
  const [endpoints, setEndpoints] = React.useState<Endpoint[]>([]);

  React.useEffect(() => {
    fetch('/openapi.yaml')
      .then(r => r.text())
      .then(text => {
        const parsed = parseEndpoints(text);
        setEndpoints(parsed);
      })
      .catch(() => {});
  }, []);

  if (endpoints.length === 0) return null;

  return (
    <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--ifm-color-emphasis-200)', background: 'var(--ifm-background-surface-color)' }}>
      <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--ifm-color-emphasis-600)' }}>
        Endpoints
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {endpoints.map(({ method, path }) => {
          const fullUrl = `${method.toUpperCase()} ${path}`;
          return (
            <div key={fullUrl} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span
                style={{
                  background: METHOD_COLORS[method.toUpperCase()] ?? '#888',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: 4,
                  minWidth: 52,
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                {method.toUpperCase()}
              </span>
              <code style={{ fontSize: '0.85rem', flex: 1 }}>{path}</code>
              <CopyButton text={fullUrl} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function parseEndpoints(yaml: string): Endpoint[] {
  const endpoints: Endpoint[] = [];
  const pathsMatch = yaml.match(/^paths:\s*\n([\s\S]*?)(?=^\S|\Z)/m);
  if (!pathsMatch) return endpoints;

  const pathsBlock = pathsMatch[1];
  const lines = pathsBlock.split('\n');
  let currentPath = '';

  const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'];

  for (const line of lines) {
    const pathMatch = line.match(/^  (\/\S+):/);
    if (pathMatch) {
      currentPath = pathMatch[1];
      continue;
    }
    if (currentPath) {
      const methodMatch = line.match(/^    (\w+):/);
      if (methodMatch && HTTP_METHODS.includes(methodMatch[1])) {
        endpoints.push({ method: methodMatch[1], path: currentPath });
      }
    }
  }

  return endpoints;
}
