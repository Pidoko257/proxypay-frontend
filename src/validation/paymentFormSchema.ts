import { z } from 'zod';
import { getCurrencyConfig } from '../config/currencyValidation';

/**
 * Payment form validation schema
 * 
 * Uses Zod for runtime validation with currency-specific constraints.
 * The amount field validates against min/max limits and decimal precision
 * based on the selected currency.
 */

/**
 * Create a dynamic amount validation schema based on currency
 * 
 * @param currency - Selected currency code
 * @returns Zod schema for amount validation
 */
export function createAmountSchema(currency: string) {
  const config = getCurrencyConfig(currency);
  
  return z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (value) => {
        const num = parseFloat(value);
        return !isNaN(num);
      },
      'Amount must be a valid number'
    )
    .refine(
      (value) => {
        const num = parseFloat(value);
        return num >= config.min;
      },
      `Minimum amount is ${config.min} ${currency}`
    )
    .refine(
      (value) => {
        const num = parseFloat(value);
        return num <= config.max;
      },
      `Maximum amount is ${config.max} ${currency}`
    )
    .refine(
      (value) => {
        const decimalPlaces = value.split('.')[1]?.length || 0;
        return decimalPlaces <= config.decimalPlaces;
      },
      `Maximum ${config.decimalPlaces} decimal places allowed for ${currency}`
    );
}

/**
 * Payment form schema
 * 
 * @param currency - Selected currency code (default: 'XAF')
 * @returns Complete form validation schema
 */
export function createPaymentFormSchema(currency: string = 'XAF') {
  return z.object({
    currency: z.string().min(1, 'Currency is required'),
    amount: createAmountSchema(currency),
    recipient: z.string().min(1, 'Recipient is required'),
    description: z.string().optional(),
  });
}

/**
 * Type inference from the schema
 */
export type PaymentFormData = z.infer<ReturnType<typeof createPaymentFormSchema>>;
