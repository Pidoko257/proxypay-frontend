const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const headersPath = path.join(root, 'static', '_headers');
const reportPath = path.join(root, '.quality-reports', 'security-headers-report.json');
const failures = [];

if (!fs.existsSync(headersPath)) {
  failures.push('Missing static/_headers.');
} else {
  const contents = fs.readFileSync(headersPath, 'utf8');
  const headers = new Map(
    [...contents.matchAll(/^\s{2}([A-Za-z0-9-]+):\s*(.+)$/gm)].map((match) => [
      match[1].toLowerCase(),
      match[2].trim(),
    ]),
  );

  const requiredHeaders = {
    'strict-transport-security': /max-age=63072000(?:;\s*includeSubDomains)?/i,
    'x-frame-options': /^DENY$/i,
    'x-content-type-options': /^nosniff$/i,
  };

  for (const [name, pattern] of Object.entries(requiredHeaders)) {
    if (!pattern.test(headers.get(name) ?? '')) {
      failures.push(`Missing or invalid ${name}.`);
    }
  }

  const csp = headers.get('content-security-policy');
  if (!csp) {
    failures.push('Missing Content-Security-Policy.');
  } else {
    const directives = new Map(
      csp.split(';').map((directive) => {
        const [name, ...values] = directive.trim().split(/\s+/);
        return [name?.toLowerCase(), values];
      }),
    );
    const requiredDirectives = {
      'default-src': "'self'",
      'base-uri': "'self'",
      'object-src': "'none'",
      'frame-ancestors': "'none'",
      'form-action': "'self'",
    };

    for (const [name, value] of Object.entries(requiredDirectives)) {
      if (!directives.get(name)?.includes(value)) {
        failures.push(`Content-Security-Policy must include ${name} ${value}.`);
      }
    }
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  source: 'static/_headers',
  valid: failures.length === 0,
  failures,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

if (failures.length > 0) {
  console.error(`Security header validation failed:\n- ${failures.join('\n- ')}`);
  process.exitCode = 1;
} else {
  console.log('Security header policy is complete.');
}