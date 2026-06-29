import React, { useState, useRef, useEffect, useCallback } from 'react';

interface MobileMoneyProvider {
  name: string;
  code: string;
}

interface CountryOption {
  code: string;
  name: string;
  flag: string;
  currency: string;
  mobileMoneyProviders: MobileMoneyProvider[];
}

interface CountryCurrencySelectorProps {
  countries: CountryOption[];
  onSelect: (country: CountryOption) => void;
  placeholder?: string;
}

const FLAGS: Record<string, string> = {
  NG: '🇳🇬', GH: '🇬🇭', KE: '🇰🇪', ZA: '🇿🇦', UG: '🇺🇬',
  TZ: '🇹🇿', RW: '🇷🇼', ZM: '🇿🇲', CM: '🇨🇲', CI: '🇨🇮',
  SN: '🇸🇳', BJ: '🇧🇯', ML: '🇲🇱', BF: '🇧🇫', NE: '🇳🇪',
};

const DEFAULT_COUNTRIES: CountryOption[] = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', mobileMoneyProviders: [{ name: 'Paga', code: 'paga' }, { name: 'OPay', code: 'opay' }, { name: 'PalmPay', code: 'palmpay' }] },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS', mobileMoneyProviders: [{ name: 'MTN MoMo', code: 'mtn_momo' }, { name: 'Vodafone Cash', code: 'vodafone_cash' }, { name: 'AirtelTigo Money', code: 'airteltigo_money' }] },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', mobileMoneyProviders: [{ name: 'M-Pesa', code: 'm_pesa' }, { name: 'Airtel Money', code: 'airtel_money' }] },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', mobileMoneyProviders: [{ name: 'SnapScan', code: 'snapscan' }, { name: 'Yoco', code: 'yoco' }] },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX', mobileMoneyProviders: [{ name: 'MTN MoMo', code: 'mtn_momo' }, { name: 'Airtel Money', code: 'airtel_money' }] },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS', mobileMoneyProviders: [{ name: 'M-Pesa', code: 'm_pesa' }, { name: 'Tigo Pesa', code: 'tigo_pesa' }, { name: 'Airtel Money', code: 'airtel_money' }] },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF', mobileMoneyProviders: [{ name: 'MTN MoMo', code: 'mtn_momo' }, { name: 'Airtel Money', code: 'airtel_money' }] },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', currency: 'ZMW', mobileMoneyProviders: [{ name: 'MTN MoMo', code: 'mtn_momo' }, { name: 'Airtel Money', code: 'airtel_money' }] },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', currency: 'XAF', mobileMoneyProviders: [{ name: 'MTN MoMo', code: 'mtn_momo' }, { name: 'Orange Money', code: 'orange_money' }] },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', currency: 'XOF', mobileMoneyProviders: [{ name: 'MTN MoMo', code: 'mtn_momo' }, { name: 'Orange Money', code: 'orange_money' }] },
];

export default function CountryCurrencySelector({
  countries = DEFAULT_COUNTRIES,
  onSelect,
  placeholder = 'Search country or currency...',
}: CountryCurrencySelectorProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = countries.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.currency.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [search]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = useCallback((country: CountryOption) => {
    setSelectedCountry(country);
    setSearch('');
    setIsOpen(false);
    onSelect(country);
  }, [onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filtered.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filtered.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filtered.length) {
          handleSelect(filtered[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', maxWidth: 400 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          border: '1px solid var(--ifm-color-emphasis-300)',
          borderRadius: 'var(--ifm-global-radius)',
          padding: '0.5rem',
          cursor: 'text',
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {selectedCountry && !search && (
          <span style={{ marginRight: '0.5rem', fontSize: '1.2rem' }}>
            {selectedCountry.flag}
          </span>
        )}
        <input
          ref={inputRef}
          type="text"
          value={selectedCountry && !isOpen ? `${selectedCountry.flag} ${selectedCountry.name} (${selectedCountry.currency})` : search}
          placeholder={placeholder}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
            setSelectedCountry(null);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '0.9rem',
            fontFamily: 'inherit',
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--ifm-color-emphasis-500)' }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <ul
          ref={listRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            margin: '0.25rem 0 0',
            padding: 0,
            listStyle: 'none',
            background: 'var(--ifm-background-surface-color)',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: 'var(--ifm-global-radius)',
            maxHeight: 300,
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
        >
          {filtered.length === 0 ? (
            <li style={{ padding: '0.75rem', color: 'var(--ifm-color-emphasis-500)', textAlign: 'center' }}>
              No countries found
            </li>
          ) : (
            filtered.map((country, i) => (
              <li
                key={country.code}
                role="option"
                aria-selected={highlightedIndex === i}
                onClick={() => handleSelect(country)}
                onMouseEnter={() => setHighlightedIndex(i)}
                style={{
                  padding: '0.6rem 0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  background: highlightedIndex === i ? 'var(--ifm-hover-overlay)' : 'transparent',
                }}
              >
                <span style={{ fontSize: '1.3rem' }}>{country.flag}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{country.name}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--ifm-color-emphasis-600)' }}>
                    {country.currency}
                    {country.mobileMoneyProviders.length > 0 && (
                      <span> · {country.mobileMoneyProviders.map((p) => p.name).join(', ')}</span>
                    )}
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
