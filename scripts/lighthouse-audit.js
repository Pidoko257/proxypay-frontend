#!/usr/bin/env node
/**
 * Lighthouse CI/CD Auditing Script
 * Runs Lighthouse audits on built pages and validates against score thresholds
 * Fails build if scores drop below configured thresholds
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

interface AuditResult {
  score: number;
  title: string;
}

interface LighthouseResults {
  categories: {
    performance: AuditResult;
    accessibility: AuditResult;
    'best-practices': AuditResult;
    seo: AuditResult;
  };
  finalUrl: string;
}

// Score thresholds (0-100)
const SCORE_THRESHOLDS = {
  performance: 75,
  accessibility: 90,
  'best-practices': 85,
  seo: 90,
};

const REPORT_DIR = '.quality-reports';
const LIGHTHOUSE_REPORT = path.join(REPORT_DIR, 'lighthouse-results.json');
const BASELINE_FILE = path.join(REPORT_DIR, 'lighthouse-baseline.json');

// Ensure report directory exists
if (!fs.existsSync(REPORT_DIR)) {
  fs.mkdirSync(REPORT_DIR, { recursive: true });
}

/**
 * Run lighthouse audit for a given URL
 */
async function runLighthouseAudit(url: string): Promise<LighthouseResults> {
  return new Promise((resolve, reject) => {
    const args = [
      url,
      '--output=json',
      '--output-path=' + LIGHTHOUSE_REPORT,
      '--chrome-flags="--headless"',
      '--enable-automation=false',
      '--only-categories=performance,accessibility,best-practices,seo',
    ];

    console.log(`🔍 Running Lighthouse audit for ${url}...`);
    console.log(`   ${args.join(' ')}`);

    const lighthouse = spawn('npx', ['lighthouse', ...args], {
      stdio: 'inherit',
      shell: true,
    });

    lighthouse.on('close', (code: number) => {
      if (code !== 0) {
        reject(new Error(`Lighthouse audit failed with code ${code}`));
      } else {
        try {
          const results = JSON.parse(fs.readFileSync(LIGHTHOUSE_REPORT, 'utf-8'));
          resolve(results);
        } catch (err) {
          reject(new Error(`Failed to parse Lighthouse report: ${err}`));
        }
      }
    });

    lighthouse.on('error', (err: Error) => {
      reject(new Error(`Failed to run Lighthouse: ${err.message}`));
    });
  });
}

/**
 * Format score with emoji indicator
 */
function formatScore(score: number): string {
  if (score >= 90) return `✅ ${score}`;
  if (score >= 75) return `⚠️  ${score}`;
  return `❌ ${score}`;
}

/**
 * Validate scores against thresholds
 */
function validateScores(results: LighthouseResults): { valid: boolean; failures: string[] } {
  const failures: string[] = [];

  for (const [category, threshold] of Object.entries(SCORE_THRESHOLDS)) {
    const categoryKey = category as keyof typeof results.categories;
    const result = results.categories[categoryKey];
    const score = Math.round(result.score * 100);

    if (score < threshold) {
      failures.push(
        `${result.title}: ${score}/100 (threshold: ${threshold}/100) - FAILED`
      );
    } else {
      console.log(`✅ ${result.title}: ${score}/100 (threshold: ${threshold}/100) - PASSED`);
    }
  }

  return {
    valid: failures.length === 0,
    failures,
  };
}

/**
 * Compare with baseline (if exists) and detect regressions
 */
function detectRegressions(current: LighthouseResults): string[] {
  const regressions: string[] = [];

  if (!fs.existsSync(BASELINE_FILE)) {
    console.log(
      '📊 No baseline found. Saving current results as baseline for future comparisons.'
    );
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2));
    return regressions;
  }

  try {
    const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));

    for (const category of Object.keys(SCORE_THRESHOLDS)) {
      const categoryKey = category as keyof typeof current.categories;
      const currentScore = Math.round(current.categories[categoryKey].score * 100);
      const baselineScore = Math.round(baseline.categories[categoryKey].score * 100);
      const delta = currentScore - baselineScore;

      if (delta < -5) {
        // Allow 5-point variance
        regressions.push(
          `${category}: ${baselineScore} → ${currentScore} (Δ${delta}) - REGRESSION DETECTED`
        );
      } else if (delta > 0) {
        console.log(`📈 ${category}: ${baselineScore} → ${currentScore} (Δ+${delta}) - IMPROVED`);
      }
    }

    // Update baseline with current results
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2));
  } catch (err) {
    console.warn(`⚠️  Failed to detect regressions: ${err}`);
  }

  return regressions;
}

/**
 * Generate audit report
 */
function generateReport(results: LighthouseResults, validation: ReturnType<typeof validateScores>) {
  const report = {
    timestamp: new Date().toISOString(),
    url: results.finalUrl,
    scores: {
      performance: Math.round(results.categories.performance.score * 100),
      accessibility: Math.round(results.categories.accessibility.score * 100),
      'best-practices': Math.round(results.categories['best-practices'].score * 100),
      seo: Math.round(results.categories.seo.score * 100),
    },
    thresholds: SCORE_THRESHOLDS,
    validation: validation,
  };

  const reportFile = path.join(REPORT_DIR, 'lighthouse-report.json');
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📄 Detailed report saved to: ${reportFile}`);
}

/**
 * Main function
 */
async function main() {
  try {
    const baseUrl = process.env.LIGHTHOUSE_BASE_URL || 'http://localhost:3001';
    const urls = [
      baseUrl,
      `${baseUrl}/api`,
      `${baseUrl}/api-tools`,
      `${baseUrl}/rate-limits`,
    ];

    console.log('🚀 Starting Lighthouse CI/CD audits...\n');

    let allScoresPassed = true;
    let allRegressionsPassed = true;
    const allResults: LighthouseResults[] = [];

    for (const url of urls) {
      console.log(`\n📍 Auditing: ${url}\n`);

      const results = await runLighthouseAudit(url);
      allResults.push(results);

      // Validate scores
      const validation = validateScores(results);
      generateReport(results, validation);

      if (!validation.valid) {
        allScoresPassed = false;
        validation.failures.forEach((failure) => console.error(`❌ ${failure}`));
      }

      // Detect regressions
      const regressions = detectRegressions(results);
      if (regressions.length > 0) {
        allRegressionsPassed = false;
        regressions.forEach((regression) => console.error(`📉 ${regression}`));
      }
    }

    // Final summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 LIGHTHOUSE AUDIT SUMMARY\n');

    if (allScoresPassed && allRegressionsPassed) {
      console.log('✅ All audits passed! Lighthouse scores are within acceptable thresholds.');
      console.log('   No regressions detected from baseline.\n');
      process.exit(0);
    } else {
      if (!allScoresPassed) {
        console.error('❌ Some audits failed! Scores are below thresholds.');
      }
      if (!allRegressionsPassed) {
        console.error('📉 Regressions detected! Scores have dropped from baseline.');
      }
      console.error('\n   Build will fail. Review Lighthouse reports and fix issues.\n');
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Lighthouse audit error: ${error.message}`);
    process.exit(1);
  }
}

main();
