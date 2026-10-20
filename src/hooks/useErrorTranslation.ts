/**
 * React hook for translating and managing API errors
 */

import { useCallback, useState } from 'react';
import {
  ApiError,
  TranslatedError,
  translateError,
  formatErrorForDisplay,
  getPreferredLocale,
  setPreferredLocale,
  createErrorFromFetchResponse,
  createNetworkError,
  ErrorLocale,
} from '../i18n/errorService';

export interface UseErrorTranslationOptions {
  onError?: (error: TranslatedError) => void;
  locale?: ErrorLocale;
}

export interface UseErrorTranslation {
  currentLocale: ErrorLocale;
  setLocale: (locale: ErrorLocale) => void;
  translateError: (error: ApiError | Error | string) => TranslatedError;
  formatError: (error: ApiError | Error | string) => string;
  handleFetchError: (response: Response) => Promise<TranslatedError>;
  handleNetworkError: (error: Error) => TranslatedError;
  clearError: () => void;
  error: TranslatedError | null;
  setError: (error: ApiError | Error | string | null) => void;
}

/**
 * Hook for managing error translation in components
 * 
 * @example
 * const { error, setError, formatError, currentLocale, setLocale } = useErrorTranslation();
 * 
 * // In error handler
 * try {
 *   const response = await fetch(url);
 *   if (!response.ok) {
 *     const err = await handleFetchError(response);
 *     // err is automatically translated
 *   }
 * } catch (e) {
 *   const err = handleNetworkError(e);
 *   // Network error is automatically translated
 * }
 */
export function useErrorTranslation(options?: UseErrorTranslationOptions): UseErrorTranslation {
  const [currentLocale, setCurrentLocale] = useState<ErrorLocale>(options?.locale || getPreferredLocale());
  const [error, setErrorState] = useState<TranslatedError | null>(null);

  const setLocale = useCallback((locale: ErrorLocale) => {
    setCurrentLocale(locale);
    setPreferredLocale(locale);
  }, []);

  const handleTranslateError = useCallback((err: ApiError | Error | string) => {
    const translated = translateError(err, currentLocale);
    setErrorState(translated);
    options?.onError?.(translated);
    return translated;
  }, [currentLocale, options]);

  const handleFormatError = useCallback((err: ApiError | Error | string) => {
    return formatErrorForDisplay(err, currentLocale);
  }, [currentLocale]);

  const handleFetchError = useCallback(async (response: Response): Promise<TranslatedError> => {
    const apiError = await createErrorFromFetchResponse(response);
    return handleTranslateError(apiError);
  }, [handleTranslateError]);

  const handleNetworkError = useCallback((err: Error): TranslatedError => {
    const apiError = createNetworkError(err);
    return handleTranslateError(apiError);
  }, [handleTranslateError]);

  const clearError = useCallback(() => {
    setErrorState(null);
  }, []);

  const setError = useCallback((err: ApiError | Error | string | null) => {
    if (err === null) {
      clearError();
    } else {
      handleTranslateError(err);
    }
  }, [clearError, handleTranslateError]);

  return {
    currentLocale,
    setLocale,
    translateError: handleTranslateError,
    formatError: handleFormatError,
    handleFetchError,
    handleNetworkError,
    clearError,
    error,
    setError,
  };
}
