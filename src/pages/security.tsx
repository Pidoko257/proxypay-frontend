import React, { useState } from 'react';
import Layout from '@theme/Layout';
import styles from './security.module.css';

interface Section {
  id: string;
  title: string;
  icon: string;
}

const sections: Section[] = [
  { id: 'authentication', title: 'Authentication & Authorization', icon: '🔐' },
  { id: 'encryption', title: 'Encryption & Data Protection', icon: '🔒' },
  { id: 'api-security', title: 'API Security Best Practices', icon: '🛡️' },
  { id: 'compliance', title: 'Compliance & Standards', icon: '✓' },
  { id: 'incident', title: 'Incident Response', icon: '⚠️' },
];

export default function SecurityGuide(): React.JSX.Element {
  const [activeSection, setActiveSection] = useState<string>('authentication');

  return (
    <Layout
      title="Security Best Practices"
      description="ProxyPay API security guidelines and best practices"
    >
      <main className={styles.container}>
        <div className={styles.header}>
          <h1>API Security Best Practices</h1>
          <p className={styles.subtitle}>
            Comprehensive guidelines for secure integration with ProxyPay API
          </p>
        </div>

        <div className={styles.layout}>
          {/* Sidebar Navigation */}
          <nav className={styles.sidebar}>
            <div className={styles.navTitle}>Guide Sections</div>
            {sections.map((section) => (
              <button
                key={section.id}
                className={`${styles.navItem} ${activeSection === section.id ? styles.active : ''}`}
                onClick={() => setActiveSection(section.id)}
              >
                <span className={styles.icon}>{section.icon}</span>
                <span>{section.title}</span>
              </button>
            ))}
          </nav>

          {/* Main Content */}
          <div className={styles.content}>
            {/* Authentication Section */}
            {activeSection === 'authentication' && (
              <section className={styles.section}>
                <h2>🔐 Authentication & Authorization</h2>

                <div className={styles.subsection}>
                  <h3>API Key Management</h3>
                  <ul>
                    <li>
                      <strong>Secure Storage:</strong> Store API keys in environment variables,
                      not in source code. Use secure vaults like AWS Secrets Manager, HashiCorp
                      Vault, or similar solutions.
                    </li>
                    <li>
                      <strong>Key Rotation:</strong> Implement regular key rotation policies (every
                      90 days recommended). Maintain multiple valid keys during transitions.
                    </li>
                    <li>
                      <strong>Key Scoping:</strong> Use keys with minimal required permissions. Create
                      separate keys for different environments (development, staging, production).
                    </li>
                    <li>
                      <strong>Monitoring:</strong> Monitor API key usage patterns. Alert on unusual
                      activity or failed authentication attempts.
                    </li>
                  </ul>
                  <div className={styles.codeBlock}>
                    <code>{`// ✅ Good: Environment variables
const apiKey = process.env.PROXYPAY_API_KEY;

// ❌ Bad: Hard-coded keys
const apiKey = "sk_live_abc123...";`}</code>
                  </div>
                </div>

                <div className={styles.subsection}>
                  <h3>Bearer Token Authentication</h3>
                  <ul>
                    <li>
                      <strong>Token Format:</strong> Include tokens in the Authorization header
                      using Bearer scheme: <code>Authorization: Bearer {'{'}token{'}'}</code>
                    </li>
                    <li>
                      <strong>Token Expiration:</strong> Respect token expiration times. Implement
                      automatic token refresh mechanisms.
                    </li>
                    <li>
                      <strong>HTTPS Only:</strong> Always transmit tokens over HTTPS. Never send
                      tokens over unencrypted connections.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>OAuth 2.0 & OpenID Connect</h3>
                  <ul>
                    <li>
                      Use OAuth 2.0 for delegated access scenarios. Implement proper state
                      parameter handling to prevent CSRF attacks.
                    </li>
                    <li>
                      For user authentication, implement OpenID Connect on top of OAuth 2.0 to
                      validate user identity properly.
                    </li>
                    <li>
                      Use authorization code flow for web applications and client credentials
                      flow for service-to-service communication.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Rate Limiting & Throttling</h3>
                  <ul>
                    <li>
                      Respect rate limit headers in responses. Implement exponential backoff for
                      retry logic.
                    </li>
                    <li>
                      Monitor rate limit consumption. Alert when approaching limits to prevent
                      service disruption.
                    </li>
                  </ul>
                </div>
              </section>
            )}

            {/* Encryption Section */}
            {activeSection === 'encryption' && (
              <section className={styles.section}>
                <h2>🔒 Encryption & Data Protection</h2>

                <div className={styles.subsection}>
                  <h3>Transport Security (HTTPS/TLS)</h3>
                  <ul>
                    <li>
                      <strong>TLS Version:</strong> Require TLS 1.2 or higher. TLS 1.3 is
                      recommended for optimal security and performance.
                    </li>
                    <li>
                      <strong>Certificate Validation:</strong> Always validate SSL/TLS certificates.
                      Do not disable certificate verification in production.
                    </li>
                    <li>
                      <strong>Certificate Pinning:</strong> Consider implementing certificate
                      pinning for mobile applications to prevent man-in-the-middle attacks.
                    </li>
                  </ul>
                  <div className={styles.codeBlock}>
                    <code>{`// ✅ Good: Validate certificates
const response = await fetch(url, {
  method: 'GET',
  headers: { 'Authorization': \`Bearer \${token}\` }
  // Default HTTPS validation enabled
});

// ❌ Bad: Disabled certificate verification
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';`}</code>
                  </div>
                </div>

                <div className={styles.subsection}>
                  <h3>End-to-End Encryption</h3>
                  <ul>
                    <li>
                      For sensitive financial data, consider implementing field-level encryption
                      in addition to transport encryption.
                    </li>
                    <li>
                      Use strong encryption algorithms: AES-256 for symmetric encryption, RSA-2048
                      or ECDP for asymmetric encryption.
                    </li>
                    <li>
                      Implement secure key exchange protocols and maintain separate keys for
                      different data types and purposes.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Data at Rest</h3>
                  <ul>
                    <li>
                      Encrypt sensitive data in your database and file storage systems using
                      industry-standard encryption.
                    </li>
                    <li>
                      Use managed encryption services when available (e.g., AWS KMS, Google Cloud
                      KMS, Azure Key Vault).
                    </li>
                    <li>
                      Implement key rotation policies for encryption keys to minimize exposure
                      from key compromise.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Sensitive Data Handling</h3>
                  <ul>
                    <li>
                      Never log API keys, tokens, passwords, or personally identifiable information
                      (PII).
                    </li>
                    <li>
                      Implement data masking in logs and monitoring systems (e.g., show only last
                      4 digits of payment cards).
                    </li>
                    <li>
                      Use encryption for data in transit and implement secure deletion processes
                      for sensitive data.
                    </li>
                  </ul>
                </div>
              </section>
            )}

            {/* API Security Section */}
            {activeSection === 'api-security' && (
              <section className={styles.section}>
                <h2>🛡️ API Security Best Practices</h2>

                <div className={styles.subsection}>
                  <h3>HTTPS/SSL Only</h3>
                  <ul>
                    <li>All API communications must occur over HTTPS with valid SSL/TLS certificates.</li>
                    <li>Use HTTP Strict-Transport-Security (HSTS) headers to enforce HTTPS.</li>
                    <li>
                      Consider implementing HSTS preloading for maximum protection against protocol
                      downgrade attacks.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Input Validation</h3>
                  <ul>
                    <li>
                      <strong>Validate All Inputs:</strong> Never trust user input. Validate type,
                      format, length, and range on both client and server.
                    </li>
                    <li>
                      <strong>Sanitization:</strong> Remove or escape potentially malicious characters
                      before processing or storing data.
                    </li>
                    <li>
                      <strong>Whitelist Approach:</strong> Define what is allowed rather than what is
                      forbidden when validating input.
                    </li>
                  </ul>
                  <div className={styles.codeBlock}>
                    <code>{`// ✅ Good: Input validation
function validateAmount(amount) {
  const num = parseFloat(amount);
  if (isNaN(num) || num < 0 || num > 1000000) {
    throw new Error('Invalid amount');
  }
  return num;
}

// ❌ Bad: No validation
const amount = parseFloat(userInput);`}</code>
                  </div>
                </div>

                <div className={styles.subsection}>
                  <h3>Request/Response Integrity</h3>
                  <ul>
                    <li>
                      <strong>Signature Verification:</strong> Use HMAC or digital signatures to verify
                      request and response integrity.
                    </li>
                    <li>
                      <strong>Timestamp Validation:</strong> Include timestamps in requests to prevent
                      replay attacks.
                    </li>
                    <li>
                      <strong>Nonce Usage:</strong> Implement nonce values for sensitive operations to
                      prevent duplicate processing.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Access Control</h3>
                  <ul>
                    <li>
                      <strong>Principle of Least Privilege:</strong> Grant only minimum necessary
                      permissions for each API key or user role.
                    </li>
                    <li>
                      <strong>Resource-Level Access Control:</strong> Implement proper authorization
                      checks for every resource access.
                    </li>
                    <li>
                      <strong>Multi-Tenancy:</strong> Ensure strong isolation between different
                      organizations' data in multi-tenant environments.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Error Handling</h3>
                  <ul>
                    <li>
                      Avoid exposing sensitive system information in error messages. Use generic
                      error responses to clients.
                    </li>
                    <li>
                      Log detailed error information server-side for debugging without exposing
                      details to clients.
                    </li>
                    <li>Implement proper HTTP status codes without revealing implementation details.</li>
                  </ul>
                  <div className={styles.codeBlock}>
                    <code>{`// ✅ Good: Generic error response
res.status(401).json({ error: 'Unauthorized' });

// ❌ Bad: Revealing sensitive info
res.status(401).json({
  error: 'Invalid JWT signature at line 42 of auth.js'
});`}</code>
                  </div>
                </div>

                <div className={styles.subsection}>
                  <h3>CORS & CSRF Protection</h3>
                  <ul>
                    <li>
                      Configure Cross-Origin Resource Sharing (CORS) headers properly. Allow only
                      trusted origins.
                    </li>
                    <li>
                      Implement Cross-Site Request Forgery (CSRF) protection for state-changing
                      operations using tokens or SameSite cookies.
                    </li>
                    <li>Use POST, PUT, DELETE methods for state-changing operations, not GET.</li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Security Headers</h3>
                  <ul>
                    <li>Implement Content-Security-Policy (CSP) headers to prevent injection attacks.</li>
                    <li>Use X-Content-Type-Options: nosniff to prevent MIME-type sniffing.</li>
                    <li>Implement X-Frame-Options to prevent clickjacking attacks.</li>
                    <li>Use X-XSS-Protection header for legacy browser protection.</li>
                  </ul>
                </div>
              </section>
            )}

            {/* Compliance Section */}
            {activeSection === 'compliance' && (
              <section className={styles.section}>
                <h2>✓ Compliance & Standards</h2>

                <div className={styles.subsection}>
                  <h3>PCI DSS Compliance</h3>
                  <ul>
                    <li>
                      If handling payment card information, ensure compliance with Payment Card
                      Industry Data Security Standard (PCI DSS).
                    </li>
                    <li>
                      Never store full payment card details. Use tokenization for payment
                      processing.
                    </li>
                    <li>
                      Conduct regular PCI compliance assessments and maintain proper audit logs.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>GDPR Compliance</h3>
                  <ul>
                    <li>
                      Implement data privacy controls for personal data of EU residents. Provide
                      clear data processing agreements.
                    </li>
                    <li>
                      Implement right to access, rectification, erasure, and data portability for
                      user data.
                    </li>
                    <li>
                      Maintain audit logs for data processing activities and conduct Data Protection
                      Impact Assessments (DPIA).
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>SOC 2 Compliance</h3>
                  <ul>
                    <li>
                      If offering services to enterprises, consider obtaining SOC 2 Type II
                      certification.
                    </li>
                    <li>
                      Implement controls for security, availability, processing integrity,
                      confidentiality, and privacy.
                    </li>
                    <li>Undergo annual audits and maintain proper documentation of security controls.</li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>API Security Standards</h3>
                  <ul>
                    <li>
                      Follow OWASP API Security Top 10 guidelines to address the most critical API
                      security risks.
                    </li>
                    <li>
                      Use OAuth 2.0 and OpenID Connect for authentication and authorization following
                      industry standards.
                    </li>
                    <li>
                      Implement API versioning to manage deprecation and maintain backward
                      compatibility securely.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Audit & Logging</h3>
                  <ul>
                    <li>
                      Maintain comprehensive audit logs of all API access and modifications to sensitive
                      data.
                    </li>
                    <li>
                      Implement centralized logging and monitoring for threat detection. Use log
                      aggregation services (ELK, Splunk, etc.).
                    </li>
                    <li>
                      Retain logs for appropriate retention periods (typically 1-7 years depending on
                      regulations).
                    </li>
                    <li>Ensure logs are immutable and protected from tampering.</li>
                  </ul>
                </div>
              </section>
            )}

            {/* Incident Response Section */}
            {activeSection === 'incident' && (
              <section className={styles.section}>
                <h2>⚠️ Incident Response & Monitoring</h2>

                <div className={styles.subsection}>
                  <h3>Security Monitoring</h3>
                  <ul>
                    <li>
                      <strong>Real-Time Alerting:</strong> Implement alerts for suspicious activities
                      such as unusual API usage patterns, failed authentication attempts, and policy
                      violations.
                    </li>
                    <li>
                      <strong>Anomaly Detection:</strong> Use machine learning to detect anomalous
                      behavior that may indicate a security breach.
                    </li>
                    <li>
                      <strong>Performance Monitoring:</strong> Monitor API response times and error
                      rates to detect DDoS attacks and service degradation.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Incident Response Plan</h3>
                  <ul>
                    <li>
                      <strong>Preparation:</strong> Create an incident response team with defined
                      responsibilities. Conduct regular incident response drills.
                    </li>
                    <li>
                      <strong>Detection & Analysis:</strong> Establish procedures for quickly
                      identifying and analyzing security incidents.
                    </li>
                    <li>
                      <strong>Containment:</strong> Implement procedures to isolate affected systems
                      and prevent further damage.
                    </li>
                    <li>
                      <strong>Eradication & Recovery:</strong> Remove malicious code and restore
                      systems to normal operation.
                    </li>
                    <li>
                      <strong>Post-Incident:</strong> Conduct post-mortems to identify root causes and
                      prevent recurrence.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Vulnerability Management</h3>
                  <ul>
                    <li>
                      Conduct regular security assessments and penetration testing to identify
                      vulnerabilities.
                    </li>
                    <li>
                      Implement automated vulnerability scanning for dependencies and application
                      code.
                    </li>
                    <li>
                      Maintain a patch management process to promptly deploy security updates to
                      systems and dependencies.
                    </li>
                    <li>
                      Report security vulnerabilities responsibly through coordinated disclosure
                      programs.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>DDoS Protection</h3>
                  <ul>
                    <li>
                      Implement rate limiting and request throttling to mitigate DDoS attacks.
                    </li>
                    <li>
                      Use CDN services and DDoS protection services (e.g., Cloudflare, AWS Shield).
                    </li>
                    <li>
                      Implement geographic restrictions if appropriate for your use case.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Backup & Disaster Recovery</h3>
                  <ul>
                    <li>
                      Implement regular encrypted backups of critical data. Test backup restoration
                      procedures regularly.
                    </li>
                    <li>
                      Maintain geographically distributed backups to protect against regional
                      disasters.
                    </li>
                    <li>
                      Establish Recovery Time Objective (RTO) and Recovery Point Objective (RPO) for
                      critical systems.
                    </li>
                  </ul>
                </div>

                <div className={styles.subsection}>
                  <h3>Security Communication</h3>
                  <ul>
                    <li>
                      Maintain a security contact and responsible disclosure program for reporting
                      vulnerabilities.
                    </li>
                    <li>
                      Communicate security incidents to affected parties in a timely manner as
                      required by regulations.
                    </li>
                    <li>
                      Provide security advisories for known vulnerabilities and recommended mitigations.
                    </li>
                  </ul>
                </div>
              </section>
            )}

            {/* Additional Resources */}
            <div className={styles.resources}>
              <h3>📚 Additional Resources</h3>
              <ul>
                <li>
                  <a href="https://owasp.org/www-project-api-security/">OWASP API Security</a> -
                  Industry-leading security guidelines for APIs
                </li>
                <li>
                  <a href="https://www.ietf.org/rfc/rfc6749.txt">OAuth 2.0 Specification</a> -
                  Authorization framework standard
                </li>
                <li>
                  <a href="https://tools.ietf.org/html/rfc7519">JWT Specification (RFC 7519)</a> -
                  JSON Web Tokens standard
                </li>
                <li>
                  <a href="https://cheatsheetseries.owasp.org/">OWASP Cheat Sheets</a> - Practical
                  security implementation guides
                </li>
                <li>
                  <a href="https://www.pcisecuritystandards.org/">PCI Security Standards</a> -
                  Payment card security requirements
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
