# Multi-Language Error Message Support

This implementation provides comprehensive multi-language error message support for the ProxyPay API.

## Features

- ✅ **Multi-language support** for English, Spanish, and French
- ✅ **HTTP status code translation** (400-505)
- ✅ **API error code translation** (network, auth, validation, transaction, rate limit errors)
- ✅ **Error context messages** with guidance on how to recover
- ✅ **React hook integration** (`useErrorTranslation`)
- ✅ **Automatic language detection** and persistence
- ✅ **Retryable error detection** for better UX
- ✅ **Comprehensive test coverage** (86 tests)

## Files

### Error Translation System
- `src/i18n/errors.ts` - Translation catalogs for all error messages
- `src/i18n/errorService.ts` - Core error translation service with utilities
- `src/i18n/__tests__/errorService.test.ts` - 58 tests for translation service

### React Hook
- `src/hooks/useErrorTranslation.ts` - React hook for error handling in components
- `src/hooks/__tests__/useErrorTranslation.test.ts` - 28 tests for React hook

### Updated Components
- `src/components/ApiTools.tsx` - Example integration showing how to use translations

## Usage

### Basic Error Translation

```typescript
import { translateError, translateHttpStatus, getPreferredLocale } from '../i18n/errorService';

// Translate HTTP status code
const message = translateHttpStatus(401, 'en');
// "Unauthorized - Authentication required or invalid credentials"

// Translate API error code
const message = translateApiError('INSUFFICIENT_BALANCE', 'es');
// "Saldo Insuficiente - La cuenta no tiene saldo suficiente para esta transacción"

// Get current user locale
const locale = getPreferredLocale(); // 'en' | 'es' | 'fr'
```

### React Component Integration

```typescript
import { useErrorTranslation } from '../hooks/useErrorTranslation';

function MyComponent() {
  const {
    error,
    setError,
    currentLocale,
    setLocale,
    formatError,
    handleFetchError,
    handleNetworkError,
  } = useErrorTranslation();

  // Handle API error
  const handleFetch = async () => {
    try {
      const response = await fetch('/api/transaction');
      if (!response.ok) {
        const error = await handleFetchError(response);
        // Error is automatically translated and stored
        console.log(error.message); // User-friendly message in current language
      }
    } catch (e) {
      const error = handleNetworkError(e);
      // Network error automatically categorized and translated
    }
  };

  // Format error for display
  const displayMessage = formatError({ statusCode: 404 });
  // "Not Found - The requested resource does not exist • (404)"

  // Change language
  const switchLanguage = () => {
    setLocale('es'); // Switches to Spanish
  };

  return (
    <>
      {error && <div role="alert">{error.message}</div>}
      <button onClick={handleFetch}>Fetch Data</button>
      <button onClick={switchLanguage}>Cambiar a Español</button>
    </>
  );
}
```

### With Error Callback

```typescript
const { error } = useErrorTranslation({
  locale: 'es',
  onError: (translated) => {
    // Called whenever an error is set
    console.log(translated.title);
    console.log(translated.message);
    console.log(translated.isRetryable);
    console.log(translated.context); // Additional guidance
  },
});
```

## Supported Languages

- **English (en)** - Default
- **Spanish (es)** - Español
- **French (fr)** - Français

Language preference is:
1. Stored in `localStorage` under key `proxypay-language`
2. Automatically detected from browser `navigator.language` on first visit
3. Falls back to English if browser language isn't supported

## Error Messages Covered

### HTTP Status Codes
- 4xx Client Errors: 400, 401, 403, 404, 405, 408, 409, 410, 412-418, 422, 429
- 5xx Server Errors: 500, 501, 502, 503, 504, 505

### API Error Codes
- **Network**: `NETWORK_ERROR`, `TIMEOUT`, `FETCH_FAILED`
- **Authentication**: `INVALID_TOKEN`, `EXPIRED_TOKEN`, `MISSING_CREDENTIALS`, `INSUFFICIENT_PERMISSIONS`, `INVALID_API_KEY`
- **Validation**: `INVALID_REQUEST_BODY`, `MISSING_REQUIRED_FIELD`, `INVALID_PARAMETER`, `INVALID_JSON`, `VALIDATION_FAILED`
- **Resources**: `RESOURCE_NOT_FOUND`, `RESOURCE_ALREADY_EXISTS`, `RESOURCE_DELETED`
- **Transactions**: `INVALID_AMOUNT`, `INSUFFICIENT_BALANCE`, `TRANSACTION_FAILED`, `TRANSACTION_DECLINED`, `TRANSACTION_TIMEOUT`, `DUPLICATE_TRANSACTION`
- **Rate Limiting**: `RATE_LIMIT_EXCEEDED`, `QUOTA_EXCEEDED`
- **Server**: `SERVER_ERROR`, `SERVICE_UNAVAILABLE`, `MAINTENANCE`, `INTERNAL_ERROR`

## API Reference

### Error Service Functions

#### `translateHttpStatus(statusCode: number, locale?: ErrorLocale): string`
Translates an HTTP status code to a user-friendly message.

#### `translateApiError(errorCode: string, locale?: ErrorLocale): string`
Translates an API error code to a user-friendly message.

#### `translateError(error: ApiError | Error | string, locale?: ErrorLocale): TranslatedError`
Comprehensive error translation that handles various error formats.

#### `formatErrorForDisplay(error: ApiError | Error | string, locale?: ErrorLocale): string`
Formats error for user display with bullet-separated components.

#### `isRetryableError(statusCode: number): boolean`
Determines if an error should be retried.

#### `getPreferredLocale(): ErrorLocale`
Gets the user's preferred language.

#### `setPreferredLocale(locale: ErrorLocale): void`
Sets and persists the user's preferred language.

### Types

```typescript
interface ApiError {
  code?: string;
  message?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

interface TranslatedError {
  title: string;
  message: string;
  statusCode?: number;
  errorCode?: string;
  context?: string; // Additional guidance
  isRetryable: boolean;
}

type ErrorLocale = 'en' | 'es' | 'fr';
```

## Testing

Run all tests:
```bash
npx jest src/i18n/__tests__/errorService.test.ts src/hooks/__tests__/useErrorTranslation.test.ts
```

Tests cover:
- ✓ All HTTP status codes in 3 languages
- ✓ All API error codes with multi-language support
- ✓ Error context and retryability detection
- ✓ React hook state management and callbacks
- ✓ Locale switching and persistence
- ✓ Fetch response parsing
- ✓ Network error classification
- ✓ Transaction-specific errors

## Example: Updating a Component

Before:
```typescript
.catch((error: unknown) => {
  if (active) {
    setLoadError(error instanceof Error ? error.message : 'Unable to load the OpenAPI file.');
  }
});
```

After:
```typescript
.catch((error: unknown) => {
  if (active) {
    const errorMessage = error instanceof Error ? error.message : 'Unable to load the OpenAPI file.';
    const translated = formatError(errorMessage);
    setLoadError(translated);
  }
});
```

## Future Enhancements

- Add more languages as needed
- Integrate with error logging/monitoring services
- Add error analytics to track common issues
- Create error boundary components for React
- Add error recovery suggestions based on error type
- Integrate with backend error code catalogs

## License

Part of the ProxyPay project.
