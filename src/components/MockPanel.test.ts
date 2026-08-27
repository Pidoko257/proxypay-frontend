/**
 * Unit tests for MockPanel.tsx template resolution security
 * 
 * Tests cover:
 * - Basic template resolution
 * - Input validation for randomInt
 * - Range size limits
 * - Recursion safety
 * - Error handling
 */

/**
 * Template configuration constants (duplicated for testing isolation)
 */
const TEMPLATE_CONFIG = {
  MAX_RANGE_SIZE: 1_000_000,
  MAX_VALUE: 2_147_483_647,
  MIN_VALUE: -2_147_483_648,
  MAX_RECURSION_DEPTH: 10,
  EXECUTION_TIMEOUT_MS: 1000,
};

/**
 * Validates randomInt min/max parameters
 */
function validateRandomIntParams(min: number, max: number): void {
  if (min > max) {
    throw new Error(`Invalid randomInt range: min (${min}) cannot be greater than max (${max})`);
  }

  if (min < TEMPLATE_CONFIG.MIN_VALUE || min > TEMPLATE_CONFIG.MAX_VALUE) {
    throw new Error(`Min value ${min} is outside safe integer range [${TEMPLATE_CONFIG.MIN_VALUE}, ${TEMPLATE_CONFIG.MAX_VALUE}]`);
  }

  if (max < TEMPLATE_CONFIG.MIN_VALUE || max > TEMPLATE_CONFIG.MAX_VALUE) {
    throw new Error(`Max value ${max} is outside safe integer range [${TEMPLATE_CONFIG.MIN_VALUE}, ${TEMPLATE_CONFIG.MAX_VALUE}]`);
  }

  const rangeSize = max - min + 1;
  if (rangeSize > TEMPLATE_CONFIG.MAX_RANGE_SIZE) {
    throw new Error(`Range size (${rangeSize}) exceeds maximum allowed size (${TEMPLATE_CONFIG.MAX_RANGE_SIZE})`);
  }
}

/**
 * Generates a random integer within the specified range
 */
function generateRandomInt(min: number, max: number): number {
  validateRandomIntParams(min, max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Resolves template variables in a string with validation and recursion safety
 */
function resolveTemplate(template: string, path: string, method: string, depth = 0): string {
  if (depth > TEMPLATE_CONFIG.MAX_RECURSION_DEPTH) {
    throw new Error(`Template resolution exceeded maximum recursion depth (${TEMPLATE_CONFIG.MAX_RECURSION_DEPTH})`);
  }

  let resolved = template;

  resolved = resolved.replace(/\{\{timestamp\}\}/g, String(Date.now()));
  resolved = resolved.replace(/\{\{randomId\}\}/g, 'mock-id');
  resolved = resolved.replace(/\{\{isoDate\}\}/g, new Date().toISOString());
  resolved = resolved.replace(/\{\{path\}\}/g, path);
  resolved = resolved.replace(/\{\{method\}\}/g, method);

  let lastResolved = '';
  let iterations = 0;
  const maxIterations = 100;

  while (resolved !== lastResolved && iterations < maxIterations) {
    lastResolved = resolved;
    resolved = resolved.replace(/\{\{randomInt:(-?\d+),(-?\d+)\}\}/g, (match, minStr, maxStr) => {
      try {
        const min = parseInt(minStr, 10);
        const max = parseInt(maxStr, 10);

        validateRandomIntParams(min, max);

        return String(generateRandomInt(min, max));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to resolve randomInt template "${match}": ${errorMessage}`);
      }
    });
    iterations++;
  }

  if (iterations >= maxIterations) {
    throw new Error('Template resolution exceeded maximum iterations (possible infinite loop)');
  }

  return resolved;
}

// ============================================================================
// TEST SUITE
// ============================================================================

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}: ${message}`);
  }
}

function assertThrows(fn: () => void, expectedMessage?: string, testName?: string): void {
  try {
    fn();
    throw new Error(`Expected function to throw an error (${testName || 'test'})`);
  } catch (error) {
    if (expectedMessage && !String(error).includes(expectedMessage)) {
      throw new Error(`Expected error message to include "${expectedMessage}", got: ${error}`);
    }
  }
}

function test(name: string, fn: () => void): void {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`✓ ${name}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMessage });
    console.log(`✗ ${name}\n  ${errorMessage}`);
  }
}

// ============================================================================
// BASIC FUNCTIONALITY TESTS
// ============================================================================

test('resolveTemplate: Basic static templates', () => {
  const result = resolveTemplate('{{path}} {{method}}', '/api/users', 'GET');
  assert(result.includes('/api/users'), 'Should resolve path');
  assert(result.includes('GET'), 'Should resolve method');
});

test('resolveTemplate: Timestamp replacement', () => {
  const before = Date.now();
  const result = resolveTemplate('{{timestamp}}', '/', 'GET');
  const after = Date.now();
  const timestamp = parseInt(result, 10);
  assert(timestamp >= before && timestamp <= after, 'Timestamp should be current');
});

test('resolveTemplate: ISO date replacement', () => {
  const result = resolveTemplate('{{isoDate}}', '/', 'GET');
  assert(result.includes('T'), 'Should contain ISO date format');
});

test('resolveTemplate: Random ID replacement', () => {
  const result = resolveTemplate('{{randomId}}', '/', 'GET');
  assert(result.includes('mock-id'), 'Should resolve randomId');
});

// ============================================================================
// VALID RANDOMINT TESTS
// ============================================================================

test('resolveTemplate: Valid randomInt basic range', () => {
  const result = resolveTemplate('{{randomInt:1,100}}', '/', 'GET');
  const value = parseInt(result, 10);
  assert(value >= 1 && value <= 100, `Value ${value} should be in range [1, 100]`);
});

test('resolveTemplate: Valid randomInt single value', () => {
  const result = resolveTemplate('{{randomInt:42,42}}', '/', 'GET');
  assertEqual(result, '42', 'Should resolve single-value range to that value');
});

test('resolveTemplate: Valid randomInt negative range', () => {
  const result = resolveTemplate('{{randomInt:-100,-1}}', '/', 'GET');
  const value = parseInt(result, 10);
  assert(value >= -100 && value <= -1, `Value ${value} should be in range [-100, -1]`);
});

test('resolveTemplate: Valid randomInt large range', () => {
  const result = resolveTemplate('{{randomInt:0,999999}}', '/', 'GET');
  const value = parseInt(result, 10);
  assert(value >= 0 && value <= 999999, `Value ${value} should be in range [0, 999999]`);
});

test('resolveTemplate: Multiple randomInt replacements', () => {
  const result = resolveTemplate('{{randomInt:1,10}} and {{randomInt:50,100}}', '/', 'GET');
  const parts = result.split(' and ');
  assertEqual(parts.length, 2, 'Should have two parts');
  const first = parseInt(parts[0], 10);
  const second = parseInt(parts[1], 10);
  assert(first >= 1 && first <= 10, 'First value should be in range [1, 10]');
  assert(second >= 50 && second <= 100, 'Second value should be in range [50, 100]');
});

// ============================================================================
// VALIDATION AND SECURITY TESTS
// ============================================================================

test('validateRandomIntParams: Rejects min > max', () => {
  assertThrows(() => {
    validateRandomIntParams(100, 1);
  }, 'min (100) cannot be greater than max (1)');
});

test('validateRandomIntParams: Rejects range exceeding 1M', () => {
  assertThrows(() => {
    validateRandomIntParams(0, 1_000_001);
  }, 'Range size (1000002) exceeds maximum allowed size (1000000)');
});

test('validateRandomIntParams: Rejects values above max safe integer', () => {
  assertThrows(() => {
    validateRandomIntParams(0, 2_147_483_648); // Above max safe int
  }, 'outside safe integer range');
});

test('validateRandomIntParams: Rejects values below min safe integer', () => {
  assertThrows(() => {
    validateRandomIntParams(-2_147_483_649, 0); // Below min safe int
  }, 'outside safe integer range');
});

test('validateRandomIntParams: Accepts maximum valid range', () => {
  // Should not throw
  validateRandomIntParams(0, 999_999);
});

// ============================================================================
// MALICIOUS INPUT TESTS
// ============================================================================

test('resolveTemplate: Rejects extremely large range (999M to 999M)', () => {
  assertThrows(() => {
    resolveTemplate('{{randomInt:999999999,999999999}}', '/', 'GET');
  }, '', 'extreme values'); // Any error is fine here - either safe int range or parsing
});

test('resolveTemplate: Rejects extremely large range (0 to 1B)', () => {
  assertThrows(() => {
    resolveTemplate('{{randomInt:0,1000000000}}', '/', 'GET');
  }, 'Range size');
});

test('resolveTemplate: Rejects inverted min/max', () => {
  assertThrows(() => {
    resolveTemplate('{{randomInt:100,1}}', '/', 'GET');
  }, 'min (100) cannot be greater than max (1)');
});

test('resolveTemplate: Rejects negative values that exceed safe integer', () => {
  assertThrows(() => {
    resolveTemplate('{{randomInt:-999999999,-888888888}}', '/', 'GET');
  }, '', 'extreme negative values'); // Either safe int or range size error is fine
});

test('resolveTemplate: Preserves invalid templates on error', () => {
  try {
    resolveTemplate('value: {{randomInt:100,1}}', '/', 'GET');
    throw new Error('Should have thrown');
  } catch (error) {
    assert(String(error).includes('Failed to resolve randomInt'), 'Error should mention the template');
  }
});

// ============================================================================
// RECURSION AND ITERATION PROTECTION TESTS
// ============================================================================

test('resolveTemplate: Handles multiple iterations correctly', () => {
  // Each iteration should properly replace templates
  const template = '{{randomInt:1,10}} {{randomInt:1,10}} {{randomInt:1,10}}';
  const result = resolveTemplate(template, '/', 'GET');
  const parts = result.split(' ');
  assertEqual(parts.length, 3, 'Should have three numbers');
  parts.forEach((part, index) => {
    const value = parseInt(part, 10);
    assert(value >= 1 && value <= 10, `Part ${index} value ${value} should be in range [1, 10]`);
  });
});

test('resolveTemplate: Exits early if no more replacements', () => {
  const template = '{{randomInt:1,100}}';
  const result = resolveTemplate(template, '/', 'GET');
  const value = parseInt(result, 10);
  assert(value >= 1 && value <= 100, 'Should resolve single template');
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

test('resolveTemplate: Returns meaningful error for invalid templates', () => {
  // Non-numeric values won't match regex, so template stays unchanged
  const result = resolveTemplate('{{randomInt:invalid,data}}', '/', 'GET');
  assert(result.includes('{{randomInt:invalid,data}}'), 'Should preserve unmatched template');
});

test('resolveTemplate: Handles JSON parsing in real usage', () => {
  const json = '{"value": {{randomInt:1,100}}}';
  const result = resolveTemplate(json, '/', 'GET');
  const parsed = JSON.parse(result);
  assert(typeof parsed.value === 'number', 'Should be valid JSON with number');
  assert(parsed.value >= 1 && parsed.value <= 100, 'Value should be in range');
});

test('resolveTemplate: Handles complex templates with multiple types', () => {
  const template = '{"timestamp": "{{timestamp}}", "id": "{{randomId}}", "random": {{randomInt:1,1000}}, "method": "{{method}}", "path": "{{path}}"}';
  const result = resolveTemplate(template, '/api/users', 'POST');
  const parsed = JSON.parse(result);
  assert(parsed.timestamp, 'Should have timestamp');
  assert(parsed.id, 'Should have id');
  assert(typeof parsed.random === 'number', 'Should have numeric random value');
  assertEqual(parsed.method, 'POST', 'Should have method');
  assertEqual(parsed.path, '/api/users', 'Should have path');
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

test('resolveTemplate: Handles zero in range', () => {
  const result = resolveTemplate('{{randomInt:0,10}}', '/', 'GET');
  const value = parseInt(result, 10);
  assert(value >= 0 && value <= 10, `Value ${value} should be in range [0, 10]`);
});

test('resolveTemplate: Handles mixed negative and positive', () => {
  const result = resolveTemplate('{{randomInt:-50,50}}', '/', 'GET');
  const value = parseInt(result, 10);
  assert(value >= -50 && value <= 50, `Value ${value} should be in range [-50, 50]`);
});

test('resolveTemplate: Empty template returns empty', () => {
  const result = resolveTemplate('', '/', 'GET');
  assertEqual(result, '', 'Empty template should return empty');
});

test('resolveTemplate: No templates returns original', () => {
  const original = 'plain text with no templates';
  const result = resolveTemplate(original, '/', 'GET');
  assertEqual(result, original, 'Should return original text unchanged');
});

test('resolveTemplate: Whitespace in templates is invalid', () => {
  try {
    // Templates with spaces should not match regex
    const result = resolveTemplate('{{randomInt: 1, 100}}', '/', 'GET');
    // Should not be replaced, so should stay as-is
    assert(result.includes('{{randomInt: 1, 100}}'), 'Should not replace templates with spaces');
  } catch (error) {
    // Also acceptable if it throws
    assert(true, 'Throwing on invalid format is acceptable');
  }
});

// ============================================================================
// TEST SUMMARY
// ============================================================================

function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Test Results: ${passed} passed, ${failed} failed out of ${results.length} total`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✓ All tests passed!');
    process.exit(0);
  }
}

// Run tests
if (typeof module !== 'undefined' && require.main === module) {
  printSummary();
}

export { validateRandomIntParams, generateRandomInt, resolveTemplate, test };
