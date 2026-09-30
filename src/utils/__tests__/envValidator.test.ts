import { validateEnvironment, formatValidationError, displayValidationErrors } from '../envValidator';

describe('Environment Validator', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnvironment', () => {
    it('should return valid when all required env vars are set correctly', () => {
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const result = validateEnvironment();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required REACT_APP_API_BASE_URL', () => {
      delete process.env.REACT_APP_API_BASE_URL;

      const result = validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].variable).toBe('REACT_APP_API_BASE_URL');
    });

    it('should validate URL format for REACT_APP_API_BASE_URL', () => {
      process.env.REACT_APP_API_BASE_URL = 'not-a-url';

      const result = validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.variable === 'REACT_APP_API_BASE_URL')).toBe(true);
    });

    it('should accept both http and https URLs', () => {
      process.env.REACT_APP_API_BASE_URL = 'http://localhost:3000';
      let result = validateEnvironment();
      expect(result.errors.filter(e => e.variable === 'REACT_APP_API_BASE_URL')).toHaveLength(0);

      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';
      result = validateEnvironment();
      expect(result.errors.filter(e => e.variable === 'REACT_APP_API_BASE_URL')).toHaveLength(0);
    });

    it('should validate REACT_APP_API_TIMEOUT format', () => {
      process.env.REACT_APP_API_TIMEOUT = 'not-a-number';

      const result = validateEnvironment();
      expect(result.errors.some(e => e.variable === 'REACT_APP_API_TIMEOUT')).toBe(true);
    });

    it('should accept valid positive integer for REACT_APP_API_TIMEOUT', () => {
      process.env.REACT_APP_API_TIMEOUT = '5000';

      const result = validateEnvironment();
      expect(result.errors.filter(e => e.variable === 'REACT_APP_API_TIMEOUT')).toHaveLength(0);
    });

    it('should validate REACT_APP_ENVIRONMENT value', () => {
      process.env.REACT_APP_ENVIRONMENT = 'invalid-env';

      const result = validateEnvironment();
      expect(result.errors.some(e => e.variable === 'REACT_APP_ENVIRONMENT')).toBe(true);
    });

    it('should accept valid environment values', () => {
      const validEnvs = ['development', 'staging', 'production'];
      validEnvs.forEach(env => {
        process.env.REACT_APP_ENVIRONMENT = env;
        const result = validateEnvironment();
        expect(result.errors.filter(e => e.variable === 'REACT_APP_ENVIRONMENT')).toHaveLength(0);
      });
    });

    it('should validate REACT_APP_LOG_LEVEL value', () => {
      process.env.REACT_APP_LOG_LEVEL = 'verbose';

      const result = validateEnvironment();
      expect(result.errors.some(e => e.variable === 'REACT_APP_LOG_LEVEL')).toBe(true);
    });

    it('should accept valid log level values', () => {
      const validLevels = ['debug', 'info', 'warn', 'error'];
      validLevels.forEach(level => {
        process.env.REACT_APP_LOG_LEVEL = level;
        const result = validateEnvironment();
        expect(result.errors.filter(e => e.variable === 'REACT_APP_LOG_LEVEL')).toHaveLength(0);
      });
    });

    it('should allow optional variables to be unset', () => {
      delete process.env.REACT_APP_API_TIMEOUT;
      delete process.env.REACT_APP_ENVIRONMENT;
      delete process.env.REACT_APP_LOG_LEVEL;
      process.env.REACT_APP_API_BASE_URL = 'https://api.example.com';

      const result = validateEnvironment();
      expect(result.valid).toBe(true);
    });
  });

  describe('formatValidationError', () => {
    it('should return empty string for valid result', () => {
      const result = { valid: true, errors: [] };
      const formatted = formatValidationError(result);
      expect(formatted).toBe('');
    });

    it('should format single error', () => {
      const result = {
        valid: false,
        errors: [
          {
            variable: 'REACT_APP_API_BASE_URL',
            reason: 'Required environment variable is missing',
            format: 'Valid HTTP(S) URL',
          },
        ],
      };

      const formatted = formatValidationError(result);
      expect(formatted).toContain('REACT_APP_API_BASE_URL');
      expect(formatted).toContain('Required environment variable is missing');
      expect(formatted).toContain('Valid HTTP(S) URL');
    });

    it('should format multiple errors', () => {
      const result = {
        valid: false,
        errors: [
          {
            variable: 'VAR1',
            reason: 'Missing',
            format: 'Format A',
          },
          {
            variable: 'VAR2',
            reason: 'Invalid',
            format: 'Format B',
          },
        ],
      };

      const formatted = formatValidationError(result);
      expect(formatted).toContain('VAR1');
      expect(formatted).toContain('VAR2');
      expect(formatted).toContain('1. VAR1');
      expect(formatted).toContain('2. VAR2');
    });

    it('should include documentation link', () => {
      const result = {
        valid: false,
        errors: [
          {
            variable: 'REACT_APP_API_BASE_URL',
            reason: 'Missing',
          },
        ],
      };

      const formatted = formatValidationError(result);
      expect(formatted).toContain('https://github.com/Pidoko257/proxypay-frontend#environment-setup');
    });
  });

  describe('displayValidationErrors', () => {
    let consoleGroupSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;
    let consoleLogSpy: jest.SpyInstance;
    let consoleGroupEndSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation();
      consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
      consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
    });

    afterEach(() => {
      consoleGroupSpy.mockRestore();
      consoleErrorSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });

    it('should not log anything for valid result', () => {
      const result = { valid: true, errors: [] };
      displayValidationErrors(result);

      expect(consoleGroupSpy).not.toHaveBeenCalled();
    });

    it('should log validation errors to console', () => {
      const result = {
        valid: false,
        errors: [
          {
            variable: 'REACT_APP_API_BASE_URL',
            reason: 'Required environment variable is missing',
            format: 'Valid HTTP(S) URL',
          },
        ],
      };

      displayValidationErrors(result);

      expect(consoleGroupSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('REACT_APP_API_BASE_URL'),
        expect.any(String)
      );
      expect(consoleGroupEndSpy).toHaveBeenCalled();
    });
  });
});
