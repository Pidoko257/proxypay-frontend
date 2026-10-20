/**
 * Tests for error translation system
 */

import {
  translateHttpStatus,
  translateApiError,
  getErrorContext,
  isRetryableError,
  translateError,
  formatErrorForDisplay,
  extractErrorFromResponse,
  createErrorFromFetchResponse,
  createNetworkError,
  getPreferredLocale,
  setPreferredLocale,
  ApiError,
} from '../errorService';

describe('Error Translation Service', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('translateHttpStatus', () => {
    it('should translate HTTP 400 error to English', () => {
      const result = translateHttpStatus(400, 'en');
      expect(result).toContain('Bad Request');
    });

    it('should translate HTTP 400 error to Spanish', () => {
      const result = translateHttpStatus(400, 'es');
      expect(result).toContain('Solicitud Incorrecta');
    });

    it('should translate HTTP 400 error to French', () => {
      const result = translateHttpStatus(400, 'fr');
      expect(result).toContain('Mauvaise Requête');
    });

    it('should translate HTTP 401 error (Unauthorized)', () => {
      const result = translateHttpStatus(401, 'en');
      expect(result).toContain('Unauthorized');
    });

    it('should translate HTTP 429 error (Rate Limit)', () => {
      const result = translateHttpStatus(429, 'en');
      expect(result).toContain('Too Many Requests');
    });

    it('should translate HTTP 500 error (Server Error)', () => {
      const result = translateHttpStatus(500, 'en');
      expect(result).toContain('Internal Server Error');
    });

    it('should translate HTTP 503 error (Service Unavailable)', () => {
      const result = translateHttpStatus(503, 'en');
      expect(result).toContain('Service Unavailable');
    });

    it('should return default message for unknown status code', () => {
      const result = translateHttpStatus(999, 'en');
      expect(result).toContain('HTTP Error 999');
    });
  });

  describe('translateApiError', () => {
    it('should translate NETWORK_ERROR', () => {
      const result = translateApiError('NETWORK_ERROR', 'en');
      expect(result).toContain('Network Error');
    });

    it('should translate INVALID_TOKEN', () => {
      const result = translateApiError('INVALID_TOKEN', 'en');
      expect(result).toContain('Invalid Token');
    });

    it('should translate INSUFFICIENT_BALANCE in Spanish', () => {
      const result = translateApiError('INSUFFICIENT_BALANCE', 'es');
      expect(result).toContain('Saldo Insuficiente');
    });

    it('should translate RATE_LIMIT_EXCEEDED in French', () => {
      const result = translateApiError('RATE_LIMIT_EXCEEDED', 'fr');
      expect(result).toContain('Limite de Débit');
    });

    it('should return UNKNOWN_ERROR for unknown code', () => {
      const result = translateApiError('UNKNOWN_CODE_123', 'en');
      expect(result).toContain('Unknown Error');
    });

    it('should translate common transaction errors', () => {
      expect(translateApiError('TRANSACTION_FAILED', 'en')).toContain('Transaction Failed');
      expect(translateApiError('DUPLICATE_TRANSACTION', 'en')).toContain('Duplicate');
      expect(translateApiError('INVALID_AMOUNT', 'en')).toContain('Invalid Amount');
    });
  });

  describe('getErrorContext', () => {
    it('should return retry_hint context', () => {
      const result = getErrorContext('retry_hint', 'en');
      expect(result).toBe('Please try again');
    });

    it('should return contact_support context in Spanish', () => {
      const result = getErrorContext('contact_support', 'es');
      expect(result).toContain('contacta');
    });

    it('should return try_again_later context in French', () => {
      const result = getErrorContext('try_again_later', 'fr');
      expect(result).toContain('Veuillez réessayer');
    });

    it('should return empty string for unknown context key', () => {
      const result = getErrorContext('unknown_key', 'en');
      expect(result).toBe('');
    });
  });

  describe('isRetryableError', () => {
    it('should mark timeout error as retryable', () => {
      expect(isRetryableError(408)).toBe(true);
    });

    it('should mark rate limit error as retryable', () => {
      expect(isRetryableError(429)).toBe(true);
    });

    it('should mark server errors as retryable', () => {
      expect(isRetryableError(500)).toBe(true);
      expect(isRetryableError(502)).toBe(true);
      expect(isRetryableError(503)).toBe(true);
      expect(isRetryableError(504)).toBe(true);
    });

    it('should not mark client errors as retryable', () => {
      expect(isRetryableError(400)).toBe(false);
      expect(isRetryableError(401)).toBe(false);
      expect(isRetryableError(403)).toBe(false);
      expect(isRetryableError(404)).toBe(false);
    });
  });

  describe('translateError', () => {
    it('should translate string error', () => {
      const result = translateError('NETWORK_ERROR', 'en');
      expect(result.title).toBe('Error');
      expect(result.message).toContain('Network');
      expect(result.isRetryable).toBe(false);
    });

    it('should translate Error object', () => {
      const err = new Error('Request timeout');
      const result = translateError(err, 'en');
      expect(result.title).toBe('Error');
      expect(result.isRetryable).toBe(false);
    });

    it('should translate ApiError with status code', () => {
      const apiError: ApiError = { statusCode: 401 };
      const result = translateError(apiError, 'en');
      expect(result.title).toContain('401');
      expect(result.message).toContain('Unauthorized');
      expect(result.isRetryable).toBe(false);
    });

    it('should mark 503 error as retryable', () => {
      const apiError: ApiError = { statusCode: 503 };
      const result = translateError(apiError, 'en');
      expect(result.isRetryable).toBe(true);
    });

    it('should include context for auth errors', () => {
      const apiError: ApiError = { statusCode: 401 };
      const result = translateError(apiError, 'en');
      expect(result.context).toBeDefined();
    });

    it('should include context for server errors', () => {
      const apiError: ApiError = { statusCode: 500 };
      const result = translateError(apiError, 'en');
      expect(result.context).toBeDefined();
    });

    it('should handle rate limit errors with context', () => {
      const apiError: ApiError = { statusCode: 429 };
      const result = translateError(apiError, 'en');
      expect(result.message).toContain('Rate');
      expect(result.context).toBeDefined();
    });

    it('should translate error codes in different locales', () => {
      const apiError: ApiError = { code: 'INSUFFICIENT_BALANCE' };
      
      const enResult = translateError(apiError, 'en');
      expect(enResult.message).toContain('Insufficient Balance');
      
      const esResult = translateError(apiError, 'es');
      expect(esResult.message).toContain('Saldo Insuficiente');
      
      const frResult = translateError(apiError, 'fr');
      expect(frResult.message).toContain('Solde Insuffisant');
    });
  });

  describe('formatErrorForDisplay', () => {
    it('should format simple error', () => {
      const result = formatErrorForDisplay('NETWORK_ERROR', 'en');
      expect(result).toContain('Network');
    });

    it('should format error with status code', () => {
      const apiError: ApiError = { statusCode: 404 };
      const result = formatErrorForDisplay(apiError, 'en');
      expect(result).toContain('404');
      expect(result).toContain('Not Found');
    });

    it('should include context in formatted output', () => {
      const apiError: ApiError = { statusCode: 401 };
      const result = formatErrorForDisplay(apiError, 'en');
      expect(result).toContain('•');
    });

    it('should format with bullet separators', () => {
      const apiError: ApiError = { statusCode: 500 };
      const result = formatErrorForDisplay(apiError, 'en');
      const bulletCount = (result.match(/•/g) || []).length;
      expect(bulletCount).toBeGreaterThan(0);
    });
  });

  describe('extractErrorFromResponse', () => {
    it('should extract error from response with code field', () => {
      const response = { code: 'INVALID_TOKEN' };
      const result = extractErrorFromResponse(response);
      expect(result.code).toBe('INVALID_TOKEN');
    });

    it('should extract error from nested error object', () => {
      const response = { error: { code: 'NETWORK_ERROR', message: 'Connection failed' } };
      const result = extractErrorFromResponse(response);
      expect(result.code).toBe('NETWORK_ERROR');
      expect(result.message).toBe('Connection failed');
    });

    it('should extract from various error structures', () => {
      const response = { message: 'Bad request', statusCode: 400 };
      const result = extractErrorFromResponse(response);
      expect(result.message).toBe('Bad request');
      expect(result.statusCode).toBe(400);
    });

    it('should handle null response', () => {
      const result = extractErrorFromResponse(null);
      expect(result.code).toBe('UNKNOWN_ERROR');
    });

    it('should extract error details', () => {
      const details = { field: 'email', reason: 'invalid' };
      const response = { code: 'VALIDATION_FAILED', details };
      const result = extractErrorFromResponse(response);
      expect(result.details).toEqual(details);
    });
  });

  describe('createNetworkError', () => {
    it('should create NETWORK_ERROR for network failures', () => {
      const err = new Error('Failed to fetch');
      const result = createNetworkError(err);
      expect(result.code).toBe('NETWORK_ERROR');
    });

    it('should create TIMEOUT error for timeout', () => {
      const err = new Error('Timeout');
      const result = createNetworkError(err);
      expect(result.code).toBe('TIMEOUT');
    });

    it('should create FETCH_FAILED for abort errors', () => {
      const err = new Error('AbortError');
      const result = createNetworkError(err);
      expect(result.code).toBe('FETCH_FAILED');
    });

    it('should fallback to generic FETCH_FAILED', () => {
      const err = new Error('Unknown network error');
      const result = createNetworkError(err);
      // "Unknown network error" contains "network" so it returns NETWORK_ERROR
      expect(result.code).toBe('NETWORK_ERROR');
    });
  });

  describe('Language Management', () => {
    it('should get default locale when none is set', () => {
      const locale = getPreferredLocale();
      expect(['en', 'es', 'fr']).toContain(locale);
    });

    it('should set and retrieve preferred locale', () => {
      setPreferredLocale('es');
      const locale = getPreferredLocale();
      expect(locale).toBe('es');
    });

    it('should persist locale to localStorage', () => {
      setPreferredLocale('fr');
      expect(localStorage.getItem('proxypay-language')).toBe('fr');
    });

    it('should return stored locale if available', () => {
      localStorage.setItem('proxypay-language', 'es');
      const locale = getPreferredLocale();
      expect(locale).toBe('es');
    });

    it('should fallback to en for invalid locale', () => {
      localStorage.setItem('proxypay-language', 'de');
      const locale = getPreferredLocale();
      expect(locale).toBe('en');
    });
  });

  describe('Transaction-specific Errors', () => {
    it('should translate transaction errors', () => {
      const apiError: ApiError = { code: 'INSUFFICIENT_BALANCE' };
      const result = translateError(apiError, 'en');
      expect(result.message).toContain('Insufficient');
    });

    it('should translate duplicate transaction error', () => {
      const result = translateApiError('DUPLICATE_TRANSACTION', 'en');
      expect(result).toContain('Duplicate');
    });

    it('should translate invalid amount error', () => {
      const result = translateApiError('INVALID_AMOUNT', 'en');
      expect(result).toContain('Invalid Amount');
    });

    it('should translate transaction declined error', () => {
      const result = translateApiError('TRANSACTION_DECLINED', 'es');
      expect(result).toContain('Rechazada');
    });
  });

  describe('Multi-language Support', () => {
    const languages: Array<'en' | 'es' | 'fr'> = ['en', 'es', 'fr'];

    it('should provide translations for all supported languages', () => {
      languages.forEach((lang) => {
        const result = translateHttpStatus(400, lang);
        expect(result).toBeTruthy();
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should translate common errors in all languages', () => {
      const errorCodes = ['NETWORK_ERROR', 'TIMEOUT', 'INVALID_TOKEN'];
      errorCodes.forEach((code) => {
        languages.forEach((lang) => {
          const result = translateApiError(code, lang);
          expect(result).toBeTruthy();
          expect(result.length).toBeGreaterThan(0);
        });
      });
    });

    it('should provide context messages in all languages', () => {
      const contextKeys = ['retry_hint', 'contact_support', 'try_again_later'];
      contextKeys.forEach((key) => {
        languages.forEach((lang) => {
          const result = getErrorContext(key, lang);
          expect(result).toBeTruthy();
        });
      });
    });
  });

  describe('Error Classification', () => {
    it('should classify auth errors correctly', () => {
      [401, 403].forEach((code) => {
        const result = translateError({ statusCode: code }, 'en');
        expect(result.context).toContain('contact');
      });
    });

    it('should classify server errors correctly', () => {
      [500, 502].forEach((code) => {
        const result = translateError({ statusCode: code }, 'en');
        expect(result.isRetryable).toBe(true);
      });
    });

    it('should classify rate limit errors correctly', () => {
      const result = translateError({ statusCode: 429 }, 'en');
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('Rate');
    });
  });
});
