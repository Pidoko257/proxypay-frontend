import React, { useState, useRef } from 'react';

export interface MobileMoneyProvider {
  id: string;
  name: string;
  brandColor: string;
  countries: string[];
  fee: string;
}

const PROVIDERS: MobileMoneyProvider[] = [
  {
    id: 'mtn-momo',
    name: 'MTN MoMo',
    brandColor: '#FFCC00',
    countries: ['Ghana', 'Uganda', 'Côte d\'Ivoire'],
    fee: '1.0%',
  },
  {
    id: 'airtel-money',
    name: 'Airtel Money',
    brandColor: '#E40000',
    countries: ['Kenya', 'Tanzania', 'Zambia'],
    fee: '0.9%',
  },
  {
    id: 'orange-money',
    name: 'Orange Money',
    brandColor: '#FF6600',
    countries: ['Senegal', 'Mali', 'Cameroon'],
    fee: '1.2%',
  },
];

interface ProviderCardGridProps {
  onSelect?: (providerId: string) => void;
}

function ProviderLogo({ color, initial }: { color: string; initial: string }) {
  return (
    <svg width={48} height={48} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx={24} cy={24} r={24} fill={color} />
      <text
        x={24}
        y={24}
        dominantBaseline="central"
        textAnchor="middle"
        fill={color === '#FFCC00' ? '#333' : '#fff'}
        fontSize={18}
        fontWeight="bold"
      >
        {initial}
      </text>
    </svg>
  );
}

export default function ProviderCardGrid({ onSelect }: ProviderCardGridProps): React.JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    onSelect?.(id);
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex: number | null = null;

    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (index + 1) % PROVIDERS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (index - 1 + PROVIDERS.length) % PROVIDERS.length;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(PROVIDERS[index].id);
      return;
    }

    if (nextIndex !== null) {
      handleSelect(PROVIDERS[nextIndex].id);
      cardRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label="Select mobile money provider"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}
    >
      {PROVIDERS.map((provider, index) => {
        const isSelected = selectedId === provider.id;
        return (
          <div
            key={provider.id}
            ref={(el) => {
              cardRefs.current[index] = el;
            }}
            role="radio"
            aria-checked={isSelected}
            tabIndex={0}
            onClick={() => handleSelect(provider.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            style={{
              border: `2px solid ${isSelected ? provider.brandColor : '#ddd'}`,
              borderRadius: '8px',
              padding: '1.25rem',
              cursor: 'pointer',
              outline: 'none',
              backgroundColor: isSelected ? `${provider.brandColor}1A` : '#fff',
              transition: 'border-color 0.15s ease-in-out, background-color 0.15s ease-in-out',
              boxShadow: isSelected ? `0 0 0 3px ${provider.brandColor}40` : 'none',
            }}
          >
            <div style={{ marginBottom: '0.75rem' }}>
              <ProviderLogo color={provider.brandColor} initial={provider.name[0]} />
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.375rem' }}>
              {provider.name}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#555', marginBottom: '0.25rem' }}>
              {provider.countries.join(', ')}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#333', fontWeight: 600 }}>
              Fee: {provider.fee}
            </div>
          </div>
        );
      })}
    </div>
  );
}
