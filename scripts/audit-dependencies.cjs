const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const reportPath = path.join(root, '.quality-reports', 'dependency-audit.json');
const targets = [
  { name: 'documentation portal', directory: root },
  { name: 'dashboard', directory: path.join(root, 'dashboard') },
];
const packages = [];
let hasCriticalVulnerabilities = false;
let hasScanErrors = false;

for (const target of targets) {
  const result = spawnSync('npm', ['audit', '--audit-level=critical', '--json'], {
    cwd: target.directory,
    encoding: 'utf8',
  });
  let audit;

  try {
    audit = JSON.parse(result.stdout);
  } catch {
    audit = undefined;
  }

  if (result.error || !audit || audit.error) {
    hasScanErrors = true;
    packages.push({
      name: target.name,
      error: result.error?.message ?? audit?.error?.summary ?? 'npm audit returned invalid JSON.',
    });
    continue;
  }

  const vulnerabilities = Object.entries(audit.vulnerabilities ?? {}).map(([name, item]) => ({
    name,
    severity: item.severity,
    isDirect: item.isDirect,
    range: item.range,
    fixAvailable: item.fixAvailable,
  }));
  const critical = vulnerabilities.filter(({ severity }) => severity === 'critical');
  hasCriticalVulnerabilities ||= critical.length > 0;
  hasScanErrors ||= result.status !== 0 && critical.length === 0;

  packages.push({
    name: target.name,
    exitCode: result.status,
    summary: audit.metadata?.vulnerabilities ?? {},
    critical,
    vulnerabilities,
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  failureThreshold: 'critical',
  packages,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);

for (const item of packages) {
  if (item.error) {
    console.error(`${item.name}: audit failed: ${item.error}`);
  } else {
    const counts = item.summary;
    console.log(
      `${item.name}: ${counts.critical ?? 0} critical, ${counts.high ?? 0} high, ${counts.moderate ?? 0} moderate, ${counts.low ?? 0} low`,
    );
  }
}

if (hasScanErrors || hasCriticalVulnerabilities) {
  process.exitCode = 1;
}