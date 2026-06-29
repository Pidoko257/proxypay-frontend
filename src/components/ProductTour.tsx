import React, { useState, useEffect, useCallback } from 'react';

const TOUR_KEY = 'proxypay_tour_completed';

const TOUR_STEPS = [
  {
    id: 'api-reference',
    title: 'API Reference',
    description: 'Browse the full REST API reference, search endpoints, and view request/response schemas.',
    selector: '[data-tour="api-reference"]',
  },
  {
    id: 'authentication',
    title: 'Authentication',
    description: 'All API requests use Bearer token authentication. Find your API keys in Account Settings.',
    selector: '[data-tour="authentication"]',
  },
  {
    id: 'error-codes',
    title: 'Error Codes',
    description: 'Consult the Error Codes reference for every ProxyPay error, its HTTP status, and remediation steps.',
    selector: '[data-tour="error-codes"]',
  },
  {
    id: 'billing',
    title: 'Billing & Usage',
    description: 'View your current plan, API usage meter, billing cycle, and download past invoices.',
    selector: '[data-tour="billing"]',
  },
  {
    id: 'timezone',
    title: 'Time Zone Preferences',
    description: 'Set your preferred time zone so all timestamps in the dashboard reflect your local time.',
    selector: '[data-tour="timezone"]',
  },
  {
    id: 'help',
    title: 'Help & Support',
    description: 'Re-launch this tour any time, open docs, or contact ProxyPay support from the Help menu.',
    selector: '[data-tour="help"]',
  },
];

interface TourStep {
  id: string;
  title: string;
  description: string;
  selector: string;
}

interface BeaconPosition {
  top: number;
  left: number;
}

function getBeaconPosition(selector: string): BeaconPosition | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY + rect.height / 2,
    left: rect.left + window.scrollX + rect.width / 2,
  };
}

interface TooltipProps {
  step: TourStep;
  stepIndex: number;
  total: number;
  position: BeaconPosition | null;
  onNext: () => void;
  onSkip: () => void;
}

function Tooltip({ step, stepIndex, total, position, onNext, onSkip }: TooltipProps) {
  const top = position ? position.top - 110 : '50%';
  const left = position ? position.left : '50%';

  const style: React.CSSProperties = position
    ? {
        position: 'absolute',
        top,
        left,
        transform: 'translateX(-50%)',
        zIndex: 10001,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001,
      };

  return (
    <div
      style={{
        ...style,
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        padding: '20px 24px',
        minWidth: 280,
        maxWidth: 340,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <strong style={{ color: '#1a202c', fontSize: 15 }}>{step.title}</strong>
        <button
          onClick={onSkip}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#718096',
            fontSize: 18,
            lineHeight: 1,
            padding: '0 0 0 12px',
          }}
          aria-label="Skip tour"
        >
          ×
        </button>
      </div>
      <p style={{ color: '#4a5568', fontSize: 13, margin: '0 0 16px' }}>{step.description}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: '#a0aec0' }}>
          {stepIndex + 1} / {total}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 13,
              color: '#718096',
            }}
          >
            Skip
          </button>
          <button
            onClick={onNext}
            style={{
              background: '#2e8555',
              border: 'none',
              borderRadius: 6,
              padding: '6px 16px',
              cursor: 'pointer',
              fontSize: 13,
              color: '#fff',
              fontWeight: 600,
            }}
          >
            {stepIndex === total - 1 ? 'Finish' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProductTourProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function ProductTour({ forceOpen = false, onClose }: ProductTourProps) {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [positions, setPositions] = useState<(BeaconPosition | null)[]>([]);

  const computePositions = useCallback(() => {
    setPositions(TOUR_STEPS.map((s) => getBeaconPosition(s.selector)));
  }, []);

  useEffect(() => {
    if (forceOpen) {
      setActive(true);
      setStepIndex(0);
      computePositions();
      return;
    }
    const done = localStorage.getItem(TOUR_KEY);
    if (!done) {
      setActive(true);
      setStepIndex(0);
      computePositions();
    }
  }, [forceOpen, computePositions]);

  useEffect(() => {
    if (!active) return;
    window.addEventListener('resize', computePositions);
    return () => window.removeEventListener('resize', computePositions);
  }, [active, computePositions]);

  const finish = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'true');
    setActive(false);
    onClose?.();
  }, [onClose]);

  const next = useCallback(() => {
    if (stepIndex < TOUR_STEPS.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      finish();
    }
  }, [stepIndex, finish]);

  if (!active) return null;

  const step = TOUR_STEPS[stepIndex];
  const pos = positions[stepIndex] ?? null;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10000 }}>
      {/* dim overlay */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          zIndex: 9999,
          pointerEvents: 'all',
        }}
        onClick={finish}
      />
      {/* beacon */}
      {pos && (
        <div
          style={{
            position: 'absolute',
            top: pos.top - 12,
            left: pos.left - 12,
            width: 24,
            height: 24,
            zIndex: 10002,
            pointerEvents: 'none',
          }}
        >
          <span className="proxypay-tour-beacon" />
        </div>
      )}
      {/* tooltip */}
      <div style={{ pointerEvents: 'all' }}>
        <Tooltip
          step={step}
          stepIndex={stepIndex}
          total={TOUR_STEPS.length}
          position={pos}
          onNext={next}
          onSkip={finish}
        />
      </div>
    </div>
  );
}

export { TOUR_KEY };
