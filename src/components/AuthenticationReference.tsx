import React from 'react';
import type { OpenAPISpec } from '../utils/apiSpecParser';
import styles from './AuthenticationReference.module.css';

type SecurityScheme = {
  type?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  description?: string;
  flows?: Record<string, {
    authorizationUrl?: string;
    tokenUrl?: string;
    scopes?: Record<string, string>;
  }>;
};

function findScheme(
  schemes: Array<[string, SecurityScheme]>,
  predicate: (scheme: SecurityScheme) => boolean,
): [string, SecurityScheme] | undefined {
  return schemes.find(([, scheme]) => predicate(scheme));
}

export default function AuthenticationReference({
  spec,
}: {
  spec?: OpenAPISpec;
}): React.JSX.Element {
  const securitySchemes = Object.entries(
    (spec?.components?.securitySchemes ?? {}) as Record<string, SecurityScheme>,
  );
  const apiKey = findScheme(securitySchemes, (scheme) => scheme.type === 'apiKey');
  const oauth = findScheme(securitySchemes, (scheme) => scheme.type === 'oauth2');
  const jwt = findScheme(securitySchemes, (scheme) =>
    scheme.type === 'http' && scheme.scheme?.toLowerCase() === 'bearer' &&
    (scheme.bearerFormat?.toLowerCase() === 'jwt' || scheme.description?.toLowerCase().includes('jwt')),
  );
  const oauthFlows = Object.entries(oauth?.[1].flows ?? {});
  const apiKeyName = apiKey?.[1].name || 'X-API-Key';
  const apiKeyExample = apiKey?.[1].in === 'query'
    ? `const url = new URL('https://api.proxypay.example/v1/resource');
url.searchParams.set('${apiKeyName}', 'YOUR_API_KEY');
fetch(url);`
    : apiKey?.[1].in === 'cookie'
      ? `fetch('https://api.proxypay.example/v1/resource', {
  headers: { Cookie: '${apiKeyName}=YOUR_API_KEY' }
});`
      : `fetch('https://api.proxypay.example/v1/resource', {
  headers: { '${apiKeyName}': 'YOUR_API_KEY' }
});`;

  return (
    <details className={styles.panel}>
      <summary>Authentication methods</summary>
      <p className={styles.intro}>
        Check the loaded OpenAPI security schemes for the methods enabled by this API deployment.
        The examples use placeholders and never generate or store credentials.
      </p>
      <div className={styles.methods}>
        <article className={styles.method}>
          <div className={styles.methodHeading}>
            <h3>API key</h3>
            <span className={apiKey ? styles.configured : styles.undeclared}>
              {apiKey ? 'Declared in spec' : 'Not declared in current spec'}
            </span>
          </div>
          {apiKey && (
            <p>Scheme: <code>{apiKey[0]}</code>; location: <code>{apiKey[1].in}</code>; name: <code>{apiKey[1].name}</code>.</p>
          )}
          <p>Obtain a key through your ProxyPay account’s credential-provisioning process. This documentation site cannot issue or recover keys.</p>
          <pre><code>{apiKeyExample}</code></pre>
          <a href="https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html" target="_blank" rel="noreferrer">API credential storage guidance</a>
        </article>

        <article className={styles.method}>
          <div className={styles.methodHeading}>
            <h3>OAuth 2.0</h3>
            <span className={oauth ? styles.configured : styles.undeclared}>
              {oauth ? 'Declared in spec' : 'Not declared in current spec'}
            </span>
          </div>
          {oauthFlows.length > 0 ? oauthFlows.map(([flowName, flow]) => (
            <p key={flowName}>
              {flowName}: authorization <code>{flow.authorizationUrl ?? 'not specified'}</code>, token <code>{flow.tokenUrl ?? 'not specified'}</code>
              {flow.scopes && Object.keys(flow.scopes).length > 0 && <>; scopes: <code>{Object.keys(flow.scopes).join(', ')}</code></>}.
            </p>
          )) : <p>Use the authorization and token URLs provided by your API deployment; this spec currently declares no OAuth flow.</p>}
          <p>Use the authorization-code flow with a registered client. Keep client secrets on a server and request only the scopes the integration needs.</p>
          <pre><code>{`const token = await exchangeAuthorizationCode(code);
const response = await fetch('https://api.proxypay.example/v1/resource', {
  headers: { Authorization: \`Bearer \${token}\` }
});`}</code></pre>
          <a href="https://www.rfc-editor.org/rfc/rfc6749" target="_blank" rel="noreferrer">OAuth 2.0 specification</a>
        </article>

        <article className={styles.method}>
          <div className={styles.methodHeading}>
            <h3>JWT bearer token</h3>
            <span className={jwt ? styles.configured : styles.undeclared}>
              {jwt ? 'Declared in spec' : 'Not declared in current spec'}
            </span>
          </div>
          {jwt && <p>Scheme: <code>{jwt[0]}</code>; bearer format: <code>{jwt[1].bearerFormat || 'unspecified'}</code>.</p>}
          <p>Obtain a signed token from the identity provider configured for your account. The issuer, audience, signing keys, and claims must match that deployment.</p>
          <pre><code>{`const response = await fetch('https://api.proxypay.example/v1/resource', {
  headers: { Authorization: 'Bearer YOUR_JWT' }
});`}</code></pre>
          <a href="https://www.rfc-editor.org/rfc/rfc7519" target="_blank" rel="noreferrer">JSON Web Token specification</a>
        </article>
      </div>
    </details>
  );
}