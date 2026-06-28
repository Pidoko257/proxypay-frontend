/**
 * Currency validation configuration
 * 
 * Defines minimum/maximum limits and decimal precision rules for each currency.
 * This config drives the payment amount validation logic.
 * 
 * @example
 * ```ts
 * import { getCurrencyConfig } from '@/config/currencyValidation';
 * 
 * const config = getCurrencyConfig('XAF');
 * console.log(config.min); // 100
 * console.log(config.max); // 5000000
 * console.log(config.decimalPlaces); // 2
 * ```
 */

export interface CurrencyValidationConfig {
  /** Minimum amount allowed for this currency */
  min: number;
  /** Maximum amount allowed for this currency */
  max: number;
  /** Number of decimal places allowed */
  decimalPlaces: number;
  /** Currency display name */
  name: string;
  /** Currency type (fiat or crypto) */
  type: 'fiat' | 'crypto';
}

/**
 * Currency validation rules
 * 
 * - MTN MoMo: 100 XAF minimum, 5,000,000 XAF maximum
 * - Orange Money: 100 XAF minimum, 5,000,000 XAF maximum
 * - XLM (Stellar): 0.0000001 XLM minimum, 10,000,000 XLM maximum (7 decimal places)
 * - EUR: 0.01 EUR minimum, 50,000 EUR maximum (2 decimal places)
 * - USD: 0.01 USD minimum, 50,000 USD maximum (2 decimal places)
 */
export const CURRENCY_VALIDATION_CONFIG: Record<string, CurrencyValidationConfig> = {
  XAF: {
    min: 100,
    max: 5000000,
    decimalPlaces: 2,
    name: 'Central African CFA Franc',
    type: 'fiat',
  },
  MTN: {
    min: 100,
    max: 5000000,
    decimalPlaces: 2,
    name: 'MTN Mobile Money',
    type: 'fiat',
  },
  ORANGE: {
    min: 100,
    max: 5000000,
    decimalPlaces: 2,
    name: 'Orange Money',
    type: 'fiat',
  },
  XLM: {
    min: 0.0000001,
    max: 10000000,
    decimalPlaces: 7,
    name: 'Stellar Lumens',
    type: 'crypto',
  },
  EUR: {
    min: 0.01,
    max: 50000,
    decimalPlaces: 2,
    name: 'Euro',
    type: 'fiat',
  },
  USD: {
    min: 0.01,
    max: 50000,
    decimalPlaces: 2,
    name: 'US Dollar',
    type: 'fiat',
  },
  GBP: {
    min: 0.01,
    max: 50000,
    decimalPlaces: 2,
    name: 'British Pound',
    type: 'fiat',
  },
};

/**
 * Get validation configuration for a specific currency
 * 
 * @param currency - Currency code (e.g., 'XAF', 'XLM', 'USD')
 * @returns Validation configuration object
 * @throws Error if currency is not supported
 */
export function getCurrencyConfig(currency: string): CurrencyValidationConfig {
  const config = CURRENCY_VALIDATION_CONFIG[currency];
  
  if (!config) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
  
  return config;
}

/**
 * Check if a currency is supported
 * 
 * @param currency - Currency code to check
 * @returns True if currency is supported
 */
export function isSupportedCurrency(currency: string): boolean {
  return currency in CURRENCY_VALIDATION_CONFIG;
}

/**
 * Get all supported currency codes
 * 
 * @returns Array of supported currency codes
 */
export function getSupportedCurrencies(): string[] {
  return Object.keys(CURRENCY_VALIDATION_CONFIG);
}
