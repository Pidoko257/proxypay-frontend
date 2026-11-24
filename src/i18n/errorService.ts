/**
 * Error translation service for ProxyPay
 * Handles conversion of error codes and HTTP status codes to user-friendly messages
 */

import { type ErrorLocale, httpStatusMessages, apiErrorMessages, errorContextMessages } from './errors';

export type { ErrorLocale };

export interface ApiError {
  code?: string;
  message?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export interface TranslatedError {
  title: string;
  message: string;
  statusCode?: number;
  errorCode?: string;
  context?: string;
  isRetryable: boolean;
}

/**
 * Get the user's preferred language
 * Falls back to 'en' if not supported
 */
export function getPreferredLocale(): ErrorLocale {
  if (typeof window === 'undefined') return 'en';
  
  const stored = localStorage.getItem('proxypay-language');
  if (stored && ['en', 'es', 'fr'].includes(stored)) {
    return stored as ErrorLocale;
  }
  
  const lang = navigator.language.split('-')[0];
  if (['es', 'fr'].includes(lang)) {
    return lang as ErrorLocale;
  }
  
  return 'en';
}

/**
 * Set the user's preferred language
 */
export function setPreferredLocale(locale: ErrorLocale): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('proxypay-language', locale);
  }
}

/**
 * Translate HTTP status code to user-friendly message
 */
export function translateHttpStatus(statusCode: number, locale: ErrorLocale = getPreferredLocale()): string {
  return httpStatusMessages[locale][statusCode] || 
    `HTTP Error ${statusCode} - An unexpected error occurred`;
}

/**
 * Translate API error code to user-friendly message
 */
export function translateApiError(errorCode: string, locale: ErrorLocale = getPreferredLocale()): string {
  return apiErrorMessages[locale][errorCode] || 
    apiErrorMessages[locale]['UNKNOWN_ERROR'];
}

/**
 * Get context message for errors
 */
export function getErrorContext(contextKey: string, locale: ErrorLocale = getPreferredLocale()): string {
  return errorContextMessages[locale][contextKey] || '';
}

/**
 * Determine if error is retryable based on status code
 */
export function isRetryableError(statusCode: number): boolean {
  // Retryable: timeout, server errors, and rate limits
  const retryableCodes = [408, 429, 500, 502, 503, 504];
  return retryableCodes.includes(statusCode);
}

/**
 * Translate complete error object
 */
export function translateError(error: ApiError | Error | string, locale: ErrorLocale = getPreferredLocale()): TranslatedError {
  if (typeof error === 'string') {
    // Simple string error - try to match against known codes
    const normalized = error.toUpperCase().replace(/\s+/g, '_');
    if (apiErrorMessages[locale][normalized]) {
      return {
        title: 'Error',
        message: apiErrorMessages[locale][normalized],
        isRetryable: false,
      };
    }
    return {
      title: 'Error',
      message: error,
      isRetryable: false,
    };
  }

  if (error instanceof Error) {
    // Native Error object
    const normalized = error.message.toUpperCase().replace(/\s+/g, '_');
    const message = apiErrorMessages[locale][normalized] || error.message;
    return {
      title: error.name || 'Error',
      message,
      isRetryable: false,
    };
  }

  // ApiError object
  const apiError = error as ApiError;
  const statusCode = apiError.statusCode;
  const errorCode = apiError.code;

  let title = 'Error';
  let message = apiError.message || '';
  let context: string | undefined;
  let isRetryable = false;

  if (statusCode) {
    title = `Error ${statusCode}`;
    message = translateHttpStatus(statusCode, locale);
    isRetryable = isRetryableError(statusCode);

    // Determine context message
    if (statusCode === 401 || statusCode === 403) {
      context = getErrorContext('contact_support', locale);
    } else if (isRetryable && statusCode !== 429) {
      context = getErrorContext('try_again_later', locale);
    } else if (statusCode === 429) {
      context = getErrorContext('retry_hint', locale);
    } else if (statusCode >= 500) {
      context = getErrorContext('contact_support_code', locale);
    }
  } else if (errorCode) {
    title = 'Error';
    message = translateApiError(errorCode, locale);
    
    // Determine if specific error codes are retryable
    const retryableErrorCodes = ['TIMEOUT', 'NETWORK_ERROR', 'SERVER_ERROR', 'SERVICE_UNAVAILABLE'];
    isRetryable = retryableErrorCodes.includes(errorCode);

    if (errorCode === 'NETWORK_ERROR') {
      context = getErrorContext('check_connection', locale);
    } else if (isRetryable) {
      context = getErrorContext('try_again_later', locale);
    }
  } else {
    message = message || translateApiError('UNKNOWN_ERROR', locale);
  }

  return {
    title,
    message,
    statusCode,
    errorCode,
    context,
    isRetryable,
  };
}

/**
 * Format translated error for display
 */
export function formatErrorForDisplay(error: ApiError | Error | string, locale: ErrorLocale = getPreferredLocale()): string {
  const translated = translateError(error, locale);
  const parts = [translated.message];
  
  if (translated.context) {
    parts.push(translated.context);
  }
  
  if (translated.statusCode) {
    parts.push(`(${translated.statusCode})`);
  }
  
  return parts.join(' • ');
}

/**
 * Extract error code from response object
 * Supports common API response formats
 */
export function extractErrorFromResponse(response: any): ApiError {
  if (!response) {
    return { code: 'UNKNOWN_ERROR' };
  }

  // Common error response formats
  const error: ApiError = {};

  // Try different error response structures
  if (response.code) error.code = response.code;
  if (response.error) {
    if (typeof response.error === 'string') error.code = response.error;
    if (response.error.code) error.code = response.error.code;
    if (response.error.message) error.message = response.error.message;
  }
  if (response.message) error.message = response.message;
  if (response.status) error.statusCode = response.status;
  if (response.statusCode) error.statusCode = response.statusCode;
  if (response.details) error.details = response.details;

  return error;
}

/**
 * Create a user-friendly error object from fetch response
 */
export async function createErrorFromFetchResponse(response: Response): Promise<ApiError> {
  const error: ApiError = {
    statusCode: response.status,
  };

  try {
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      const body = await response.json();
      const extracted = extractErrorFromResponse(body);
      return { ...error, ...extracted };
    } else {
      // Try text
      const text = await response.text();
      if (text) {
        error.message = text;
      }
    }
  } catch {
    // Failed to parse response body
  }

  return error;
}

/**
 * Create error from network/fetch failure
 */
export function createNetworkError(fetchError: Error): ApiError {
  const message = fetchError.message.toLowerCase();
  
  if (message.includes('failed to fetch') || message.includes('network')) {
    return { code: 'NETWORK_ERROR', message: 'Failed to connect to server' };
  }
  
  if (message.includes('timeout')) {
    return { code: 'TIMEOUT', message: 'Request timeout' };
  }
  
  if (message.includes('abort')) {
    return { code: 'FETCH_FAILED', message: 'Request was cancelled' };
  }
  
  return { code: 'FETCH_FAILED', message: fetchError.message };
}
