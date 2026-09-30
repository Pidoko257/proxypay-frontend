/**
 * Environment variable validation utility
 * Validates required environment variables at application startup
 * and provides helpful error messages for missing or invalid variables.
 */

interface EnvValidationRule {
  name: string;
  required?: boolean;
  validate?: (value: string) => boolean;
  format?: string; // Human-readable format description
}

const VALIDATION_RULES: EnvValidationRule[] = [
  {
    name: 'REACT_APP_API_BASE_URL',
    required: true,
    validate: (value: string) => /^https?:\/\//.test(value),
    format: 'Valid HTTP(S) URL',
  },
  {
    name: 'REACT_APP_API_TIMEOUT',
    required: false,
    validate: (value: string) => /^\d+$/.test(value) && parseInt(value, 10) > 0,
    format: 'Positive integer (milliseconds)',
  },
  {
    name: 'REACT_APP_ENVIRONMENT',
    required: false,
    validate: (value: string) => /^(development|staging|production)$/.test(value),
    format: 'One of: development, staging, production',
  },
  {
    name: 'REACT_APP_LOG_LEVEL',
    required: false,
    validate: (value: string) => /^(debug|info|warn|error)$/.test(value),
    format: 'One of: debug, info, warn, error',
  },
];

interface ValidationError {
  variable: string;
  reason: string;
  format?: string;
}

export interface EnvValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validate all configured environment variables
 * @returns Validation result with any errors
 */
export function validateEnvironment(): EnvValidationResult {
  const errors: ValidationError[] = [];

  for (const rule of VALIDATION_RULES) {
    const value = process.env[rule.name];

    // Check if required variable is missing
    if (rule.required && !value) {
      errors.push({
        variable: rule.name,
        reason: `Required environment variable is missing`,
        format: rule.format,
      });
      continue;
    }

    // Skip optional variables that are not set
    if (!value) {
      continue;
    }

    // Validate format if validator is provided
    if (rule.validate && !rule.validate(value)) {
      errors.push({
        variable: rule.name,
        reason: `Invalid format for environment variable`,
        format: rule.format,
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors into a readable error message
 * @param result Validation result from validateEnvironment()
 * @returns Formatted error message
 */
export function formatValidationError(result: EnvValidationResult): string {
  if (result.valid) {
    return '';
  }

  const lines = [
    '❌ Environment Configuration Error',
    '',
    'The following environment variables are missing or invalid:',
    '',
  ];

  result.errors.forEach((error, index) => {
    lines.push(`${index + 1}. ${error.variable}`);
    lines.push(`   Reason: ${error.reason}`);
    if (error.format) {
      lines.push(`   Expected format: ${error.format}`);
    }
  });

  lines.push('');
  lines.push('Please set the required environment variables and restart the application.');
  lines.push('');
  lines.push('Documentation: https://github.com/Pidoko257/proxypay-frontend#environment-setup');

  return lines.join('\n');
}

/**
 * Throw an error with validation details if environment is invalid
 * Call this during application initialization
 * @throws Error if any required environment variables are invalid
 */
export function assertValidEnvironment(): void {
  const result = validateEnvironment();
  if (!result.valid) {
    const message = formatValidationError(result);
    console.error(message);
    throw new Error(`Environment validation failed: ${result.errors.map(e => e.variable).join(', ')}`);
  }
}

/**
 * Display validation errors in the browser console with formatting
 * @param result Validation result from validateEnvironment()
 */
export function displayValidationErrors(result: EnvValidationResult): void {
  if (result.valid) {
    return;
  }

  console.group('%c⚠️ Environment Validation Errors', 'color: #ff6b6b; font-weight: bold; font-size: 14px;');

  result.errors.forEach((error) => {
    console.error(`%c${error.variable}`, 'color: #ff6b6b; font-weight: bold;');
    console.error(`Reason: ${error.reason}`);
    if (error.format) {
      console.error(`Expected format: ${error.format}`);
    }
    console.log('---');
  });

  console.groupEnd();
}
