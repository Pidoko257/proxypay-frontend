/**
3	 * Tests for Breadcrumb Navigation component and utilities
	 */

import { getDefaultBreadcrumbs } from '../Breadcrumb';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `Assertion failed: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`
    );
  }
}

const tests: Record<string, () => void> = {};

tests['should return correct hierarchy for dashboard page'] = () => {
  const crumbs = getDefaultBreadcrumbs('/dashboard');
  assertEqual(crumbs, [
    { label: 'Home', path: '/' },
    { label: 'Transaction Dashboard', path: '/dashboard' },
  ], 'dashboard breadcrumbs hierarchy');
};

tests['should return correct hierarchy for api-tools page'] = () => {
  const crumbs = getDefaultBreadcrumbs('/api-tools');
  assertEqual(crumbs, [
    { label: 'Home', path: '/' },
    { label: 'API Reference', path: '/api' },
    { label: 'API Workbench', path: '/api-tools' },
  ], 'api-tools breadcrumbs hierarchy');
};

tests['should return correct hierarchy for metrics page'] = () => {
  const crumbs = getDefaultBreadcrumbs('/metrics');
  assertEqual(crumbs, [
    { label: 'Home', path: '/' },
    { label: 'Transaction Dashboard', path: '/dashboard' },
    { label: 'API Metrics', path: '/metrics' },
  ], 'metrics breadcrumbs hierarchy');
};

tests['should return correct hierarchy for logs-glossary page'] = () => {
  const crumbs = getDefaultBreadcrumbs('/logs-glossary');
  assertEqual(crumbs, [
    { label: 'Home', path: '/' },
    { label: 'Logs Dashboard', path: '/logs' },
    { label: 'Logs Glossary', path: '/logs-glossary' },
  ], 'logs-glossary breadcrumbs hierarchy');
};

tests['should return correct hierarchy for test-generator page'] = () => {
  const crumbs = getDefaultBreadcrumbs('/test-generator');
  assertEqual(crumbs, [
    { label: 'Home', path: '/' },
    { label: 'API Workbench', path: '/api-tools' },
    { label: 'Test Generator', path: '/test-generator' },
  ], 'test-generator breadcrumbs hierarchy');
};

tests['should fallback to segment capitalization for unknown paths'] = () => {
  const crumbs = getDefaultBreadcrumbs('/custom-deep-page');
  assertEqual(crumbs, [
    { label: 'Home', path: '/' },
    { label: 'Custom Deep Page', path: '/custom-deep-page' },
  ], 'fallback breadcrumbs hierarchy');
};

// Run tests
async function runTests(): Promise<void> {
  const testNames = Object.keys(tests);
  let passed = 0;
  let failed = 0;
  const failures: { name: string; error: Error }[] = [];

  console.log(`\n📋 Running ${testNames.length} breadcrumb tests...\n`);

  for (const testName of testNames) {
    try {
      tests[testName]();
      console.log(`✓ ${testName}`);
      passed++;
    } catch (error) {
      console.log(`✗ ${testName}`);
      if (error instanceof Error) {
        failures.push({ name: testName, error });
      }
      failed++;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${testNames.length} tests`);
  console.log(`${'='.repeat(60)}\n`);

  if (failures.length > 0) {
    console.log('Failed tests:\n');
    for (const { name, error } of failures) {
      console.log(`  ✗ ${name}`);
      console.log(`    ${error.message}\n`);
    }
    process.exit(1);
  } else {
    console.log('✓ All breadcrumb tests passed!');
    process.exit(0);
  }
}

runTests();
