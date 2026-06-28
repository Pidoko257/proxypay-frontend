# Payment Form Validation Implementation

This document describes the implementation of form validation for the payment amount field with currency constraints, as specified in issue #13.

## Overview

The payment initiation form now includes robust client-side validation for the amount field with:
- Minimum/maximum limits per currency
- Decimal precision rules (2 for fiat, 7 for XLM)
- Real-time error messaging on blur and submit
- Configurable validation rules driven by a config object

## Implementation Details

### 1. Currency Validation Config

**File:** `src/config/currencyValidation.ts`

The validation configuration is centralized in a config object that defines:
- `min`: Minimum amount allowed
- `max`: Maximum amount allowed
- `decimalPlaces`: Number of decimal places allowed
- `name`: Currency display name
- `type`: Currency type ('fiat' or 'crypto')

**Supported Currencies:**
- **XAF** (Central African CFA Franc): min 100, max 5,000,000, 2 decimals
- **MTN** (MTN Mobile Money): min 100, max 5,000,000, 2 decimals
- **ORANGE** (Orange Money): min 100, max 5,000,000, 2 decimals
- **XLM** (Stellar Lumens): min 0.0000001, max 10,000,000, 7 decimals
- **EUR** (Euro): min 0.01, max 50,000, 2 decimals
- **USD** (US Dollar): min 0.01, max 50,000, 2 decimals
- **GBP** (British Pound): min 0.01, max 50,000, 2 decimals

**Helper Functions:**
- `getCurrencyConfig(currency)`: Get validation config for a specific currency
- `isSupportedCurrency(currency)`: Check if a currency is supported
- `getSupportedCurrencies()`: Get all supported currency codes

### 2. Zod Validation Schema

**File:** `src/validation/paymentFormSchema.ts`

The validation schema uses Zod for runtime type checking and validation:

- `createAmountSchema(currency)`: Creates dynamic amount validation based on currency
  - Validates required field
  - Validates numeric format
  - Validates minimum amount
  - Validates maximum amount
  - Validates decimal places

- `createPaymentFormSchema(currency)`: Creates complete form validation schema
  - Currency field (required)
  - Amount field (with currency-specific validation)
  - Recipient field (required)
  - Description field (optional)

### 3. Payment Form Component

**File:** `src/components/PaymentForm.tsx`

The form component uses React Hook Form with Zod resolver:

**Features:**
- Dynamic schema updates when currency changes
- Real-time validation on blur
- Inline error messages below the amount field
- Validation hints showing current currency limits
- Responsive design with inline styling

**Validation Triggers:**
- Amount field validates on blur
- Form validates on submit
- Amount re-validates when currency changes

### 4. Demo Page

**File:** `src/pages/payment-demo.tsx`

A demo page showcasing the payment form with:
- Interactive form with all validation features
- Feature list explaining validation capabilities
- Console logging of submitted data

## Usage

### Basic Usage

```tsx
import PaymentForm from '../components/PaymentForm';
import { PaymentFormData } from '../validation/paymentFormSchema';

function MyComponent() {
  const handleSubmit = (data: PaymentFormData) => {
    console.log('Payment submitted:', data);
    // Process payment
  };

  return <PaymentForm onSubmit={handleSubmit} />;
}
```

### Custom Default Currency

```tsx
<PaymentForm onSubmit={handleSubmit} defaultCurrency="USD" />
```

### Adding a New Currency

Edit `src/config/currencyValidation.ts`:

```typescript
export const CURRENCY_VALIDATION_CONFIG: Record<string, CurrencyValidationConfig> = {
  // ... existing currencies
  JPY: {
    min: 1,
    max: 1000000,
    decimalPlaces: 0,
    name: 'Japanese Yen',
    type: 'fiat',
  },
};
```

## Dependencies

The implementation requires the following packages (added to package.json):

```json
{
  "react-hook-form": "^7.53.0",
  "zod": "^3.23.8",
  "@hookform/resolvers": "^3.9.0"
}
```

## Testing

**Test File:** `src/config/__tests__/currencyValidation.test.ts`

The test suite validates:
- Config structure for each currency
- Correct min/max values per currency
- Decimal place rules (2 for fiat, 7 for XLM)
- Helper function behavior
- Error handling for unsupported currencies

Run tests with:
```bash
npm test
```

## Acceptance Criteria Status

✅ **Amount field validates against configurable min/max per selected currency**
- Implemented in `createAmountSchema` with currency-specific config

✅ **Error message appears inline below the field on blur and on submit**
- Inline error messages in PaymentForm component
- Validation triggers on blur and submit

✅ **Decimal places are limited to 2 for fiat, 7 for XLM**
- Configured in CURRENCY_VALIDATION_CONFIG
- Validated in Zod schema

✅ **Validation config object is documented and tested**
- Documented in currencyValidation.ts with JSDoc comments
- Test suite in __tests__/currencyValidation.test.ts

## Future Enhancements

Potential improvements:
- Add server-side validation
- Support for more currencies
- Currency conversion display
- Transaction fee calculation
- Recipient validation (phone number format, wallet address format)
- Multi-language support for error messages
