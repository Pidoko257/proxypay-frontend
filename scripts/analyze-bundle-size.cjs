#!/usr/bin/env node

/**
 * Bundle Size Analyzer
 * Analyzes build output for bundle size, checks against thresholds, and fails if exceeded.
 * 
 * This script:
 * 1. Analyzes all JS/CSS files in the build directory
 * 2. Computes gzipped sizes (production metric)
 * 3. Compares against configured thresholds
 * 4. Exits with code 1 if any threshold is exceeded
 * 5. Reports results to .quality-reports/bundle-size-report.json
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');

// Configuration: bundle size thresholds (in KB)
const THRESHOLDS = {
  // Main bundle (Docusaurus + app code)
  'main': 250,
  // Vendor/common chunk
  'vendors': 300,
  // Individual CSS file
  'css': 100,
  // Total gzipped size across all JS files
  'total_js': 500,
  // Total gzipped size across all CSS files
  'total_css': 50,
};

const BUILD_DIR = process.env.BUILD_DIR || path.join(process.cwd(), 'build');
const REPORT_DIR = process.env.REPORT_DIR || path.join(process.cwd(), '.quality-reports');
const REPORT_FILE = path.join(REPORT_DIR, 'bundle-size-report.json');

/**
 * Get gzipped size of a file in KB
 */
function getGzippedSizeKB(filePath) {
  try {
    const content = fs.readFileSync(filePath);
    const gzipped = zlib.gzipSync(content);
    return (gzipped.length / 1024).toFixed(2);
  } catch (err) {
    console.error(`Error reading file: ${filePath}`);
    return 0;
  }
}

/**
 * Recursively find all JS and CSS files
 */
function findBundleFiles(dir, ext) {
  let files = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          files = files.concat(findBundleFiles(fullPath, ext));
        }
      } else if (entry.name.endsWith(ext)) {
        files.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error reading directory: ${dir}`);
  }
  return files;
}

/**
 * Analyze bundle sizes
 */
function analyzeBundle() {
  if (!fs.existsSync(BUILD_DIR)) {
    console.error(`Build directory not found: ${BUILD_DIR}`);
    console.error('Run "npm run build" first.');
    process.exit(1);
  }

  const jsFiles = findBundleFiles(BUILD_DIR, '.js');
  const cssFiles = findBundleFiles(BUILD_DIR, '.css');

  const report = {
    timestamp: new Date().toISOString(),
    thresholds: THRESHOLDS,
    bundles: {
      js: [],
      css: [],
    },
    totals: {
      js: 0,
      css: 0,
      all: 0,
    },
    exceeded: [],
  };

  // Analyze JS files
  let totalJs = 0;
  for (const file of jsFiles) {
    const size = parseFloat(getGzippedSizeKB(file));
    const relativePath = path.relative(BUILD_DIR, file);
    report.bundles.js.push({
      file: relativePath,
      size_kb: parseFloat(size),
    });
    totalJs += size;
  }

  // Analyze CSS files
  let totalCss = 0;
  for (const file of cssFiles) {
    const size = parseFloat(getGzippedSizeKB(file));
    const relativePath = path.relative(BUILD_DIR, file);
    report.bundles.css.push({
      file: relativePath,
      size_kb: parseFloat(size),
    });
    totalCss += size;
  }

  report.totals.js = parseFloat(totalJs.toFixed(2));
  report.totals.css = parseFloat(totalCss.toFixed(2));
  report.totals.all = parseFloat((totalJs + totalCss).toFixed(2));

  // Check thresholds
  const violations = [];

  if (report.totals.js > THRESHOLDS.total_js) {
    violations.push({
      metric: 'total_js',
      threshold: THRESHOLDS.total_js,
      actual: report.totals.js,
      message: `Total JS size (${report.totals.js}KB) exceeds threshold (${THRESHOLDS.total_js}KB)`,
    });
  }

  if (report.totals.css > THRESHOLDS.total_css) {
    violations.push({
      metric: 'total_css',
      threshold: THRESHOLDS.total_css,
      actual: report.totals.css,
      message: `Total CSS size (${report.totals.css}KB) exceeds threshold (${THRESHOLDS.total_css}KB)`,
    });
  }

  // Check individual JS bundles
  for (const bundle of report.bundles.js) {
    if (bundle.file.includes('main') && bundle.size_kb > THRESHOLDS.main) {
      violations.push({
        metric: 'main_bundle',
        threshold: THRESHOLDS.main,
        actual: bundle.size_kb,
        file: bundle.file,
        message: `Main bundle ${bundle.file} (${bundle.size_kb}KB) exceeds threshold (${THRESHOLDS.main}KB)`,
      });
    }
    if (bundle.file.includes('vendors') && bundle.size_kb > THRESHOLDS.vendors) {
      violations.push({
        metric: 'vendors_bundle',
        threshold: THRESHOLDS.vendors,
        actual: bundle.size_kb,
        file: bundle.file,
        message: `Vendors bundle ${bundle.file} (${bundle.size_kb}KB) exceeds threshold (${THRESHOLDS.vendors}KB)`,
      });
    }
  }

  // Check individual CSS files
  for (const bundle of report.bundles.css) {
    if (bundle.size_kb > THRESHOLDS.css) {
      violations.push({
        metric: 'css_file',
        threshold: THRESHOLDS.css,
        actual: bundle.size_kb,
        file: bundle.file,
        message: `CSS file ${bundle.file} (${bundle.size_kb}KB) exceeds threshold (${THRESHOLDS.css}KB)`,
      });
    }
  }

  report.exceeded = violations;

  // Create report directory if needed
  if (!fs.existsSync(REPORT_DIR)) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
  }

  // Write report
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));

  return report;
}

/**
 * Print human-readable output
 */
function printReport(report) {
  console.log('\n' + '='.repeat(70));
  console.log('📦 BUNDLE SIZE ANALYSIS REPORT');
  console.log('='.repeat(70));

  console.log('\n📊 Totals (gzipped):');
  console.log(`  JavaScript:  ${report.totals.js}KB / ${THRESHOLDS.total_js}KB ${
    report.totals.js > THRESHOLDS.total_js ? '❌ EXCEEDED' : '✓'
  }`);
  console.log(`  CSS:         ${report.totals.css}KB / ${THRESHOLDS.total_css}KB ${
    report.totals.css > THRESHOLDS.total_css ? '❌ EXCEEDED' : '✓'
  }`);
  console.log(`  Total:       ${report.totals.all}KB`);

  if (report.bundles.js.length > 0) {
    console.log('\n📦 JavaScript Bundles:');
    for (const bundle of report.bundles.js.sort((a, b) => b.size_kb - a.size_kb)) {
      const status = bundle.size_kb > THRESHOLDS.main ? '❌' : '✓';
      console.log(`  ${status} ${bundle.file}: ${bundle.size_kb}KB`);
    }
  }

  if (report.bundles.css.length > 0) {
    console.log('\n🎨 CSS Files:');
    for (const bundle of report.bundles.css.sort((a, b) => b.size_kb - a.size_kb)) {
      const status = bundle.size_kb > THRESHOLDS.css ? '❌' : '✓';
      console.log(`  ${status} ${bundle.file}: ${bundle.size_kb}KB`);
    }
  }

  if (report.exceeded.length > 0) {
    console.log('\n❌ THRESHOLD VIOLATIONS:');
    for (const violation of report.exceeded) {
      console.log(`  • ${violation.message}`);
    }
  } else {
    console.log('\n✅ All bundles are within thresholds!');
  }

  console.log(`\n📄 Full report: ${REPORT_FILE}`);
  console.log('='.repeat(70) + '\n');
}

// Main execution
try {
  const report = analyzeBundle();
  printReport(report);

  if (report.exceeded.length > 0) {
    console.error('❌ Build failed: bundle size thresholds exceeded.');
    process.exit(1);
  } else {
    console.log('✅ Bundle size check passed.');
    process.exit(0);
  }
} catch (err) {
  console.error('Error during bundle analysis:', err.message);
  process.exit(1);
}
