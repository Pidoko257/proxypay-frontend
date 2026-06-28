/**
 * Tests for currency validation configuration
 * 
 * This file documents and tests the currency validation config object
 * as required by the acceptance criteria.
 */

import {
  getCurrencyConfig,
  isSupportedCurrency,
  getSupportedCurrencies,
  CURRENCY_VALIDATION_CONFIG,
} from '../currencyValidation';

describe('Currency Validation Config', () => {
  describe('getCurrencyConfig', () => {
    it('should return correct config for XAF', () => {
      const config = getCurrencyConfig('XAF');
      expect(config.min).toBe(100);
      expect(config.max).toBe(5000000);
      expect(config.decimalPlaces).toBe(2);
      expect(config.name).toBe('Central African CFA Franc');
      expect(config.type).toBe('fiat');
    });

    it('should return correct config for MTN', () => {
      const config = getCurrencyConfig('MTN');
      expect(config.min).toBe(100);
      expect(config.max).toBe(5000000);
      expect(config.decimalPlaces).toBe(2);
      expect(config.name).toBe('MTN Mobile Money');
      expect(config.type).toBe('fiat');
    });

    it('should return correct config for XLM', () => {
      const config = getCurrencyConfig('XLM');
      expect(config.min).toBe(0.0000001);
      expect(config.max).toBe(10000000);
      expect(config.decimalPlaces).toBe(7);
      expect(config.name).toBe('Stellar Lumens');
      expect(config.type).toBe('crypto');
    });

    it('should return correct config for EUR', () => {
      const config = getCurrencyConfig('EUR');
      expect(config.min).toBe(0.01);
      expect(config.max).toBe(50000);
      expect(config.decimalPlaces).toBe(2);
      expect(config.name).toBe('Euro');
      expect(config.type).toBe('fiat');
    });

    it('should throw error for unsupported currency', () => {
      expect(() => getCurrencyConfig('BTC')).toThrow('Unsupported currency: BTC');
    });
  });

  describe('isSupportedCurrency', () => {
    it('should return true for supported currencies', () => {
      expect(isSupportedCurrency('XAF')).toBe(true);
      expect(isSupportedCurrency('MTN')).toBe(true);
      expect(isSupportedCurrency('XLM')).toBe(true);
      expect(isSupportedCurrency('EUR')).toBe(true);
      expect(isSupportedCurrency('USD')).toBe(true);
    });

    it('should return false for unsupported currencies', () => {
      expect(isSupportedCurrency('BTC')).toBe(false);
      expect(isSupportedCurrency('ETH')).toBe(false);
      expect(isSupportedCurrency('JPY')).toBe(false);
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return array of all supported currency codes', () => {
      const currencies = getSupportedCurrencies();
      expect(Array.isArray(currencies)).toBe(true);
      expect(currencies).toContain('XAF');
      expect(currencies).toContain('MTN');
      expect(currencies).toContain('XLM');
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('USD');
    });
  });

  describe('CURRENCY_VALIDATION_CONFIG structure', () => {
    it('should have all required fields for each currency', () => {
      Object.entries(CURRENCY_VALIDATION_CONFIG).forEach(([code, config]) => {
        expect(config).toHaveProperty('min');
        expect(config).toHaveProperty('max');
        expect(config).toHaveProperty('decimalPlaces');
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('type');
        expect(['fiat', 'crypto']).toContain(config.type);
        expect(typeof config.min).toBe('number');
        expect(typeof config.max).toBe('number');
        expect(typeof config.decimalPlaces).toBe('number');
        expect(typeof config.name).toBe('string');
      });
    });

    it('should have min < max for all currencies', () => {
      Object.values(CURRENCY_VALIDATION_CONFIG).forEach((config) => {
        expect(config.min).toBeLessThan(config.max);
      });
    });

    it('should have decimalPlaces >= 0 for all currencies', () => {
      Object.values(CURRENCY_VALIDATION_CONFIG).forEach((config) => {
        expect(config.decimalPlaces).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Specific currency constraints per issue requirements', () => {
    it('MTN MoMo should have min 100 XAF and max 5,000,000 XAF', () => {
      const config = getCurrencyConfig('MTN');
      expect(config.min).toBe(100);
      expect(config.max).toBe(5000000);
    });

    it('XLM should allow 7 decimal places', () => {
      const config = getCurrencyConfig('XLM');
      expect(config.decimalPlaces).toBe(7);
    });

    it('Fiat currencies should allow 2 decimal places', () => {
      const fiatCurrencies = ['XAF', 'MTN', 'ORANGE', 'EUR', 'USD', 'GBP'];
      fiatCurrencies.forEach((currency) => {
        const config = getCurrencyConfig(currency);
        expect(config.decimalPlaces).toBe(2);
      });
    });
  });
});
