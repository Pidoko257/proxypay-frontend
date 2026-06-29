import React, { useState } from 'react';

interface FlowStep {
  id: string;
  label: string;
  description: string;
  apiEndpoint?: string;
  examplePayload?: Record<string, unknown>;
}

interface FlowSection {
  title: string;
  steps: FlowStep[];
}

const DEPOSIT_FLOW: FlowSection = {
  title: 'SEP-24 Deposit Flow',
  steps: [
    {
      id: 'deposit-1',
      label: 'Initiate Deposit',
      description: 'Client requests a deposit interaction URL from the anchor via the /info endpoint.',
      apiEndpoint: 'GET /info',
      examplePayload: { deposit: { enabled: true, authentication_required: false } },
    },
    {
      id: 'deposit-2',
      label: 'GET /deposit Interactive',
      description: 'Client is redirected to the anchor\'s interactive URL to complete KYC and deposit details.',
      apiEndpoint: 'GET /deposit?asset_code=USDC&account=G...',
      examplePayload: { type: 'interactive_customer_info_needed', url: 'https://anchor.com/kyc?token=abc123' },
    },
    {
      id: 'deposit-3',
      label: 'Submit KYC & Details',
      description: 'User completes interactive KYC form on the anchor-hosted page.',
      apiEndpoint: 'POST /customer (optional SEP-12)',
      examplePayload: { first_name: 'Jane', last_name: 'Doe', email_address: 'jane@example.com' },
    },
    {
      id: 'deposit-4',
      label: 'Anchor sends Stellar Payment',
      description: 'After KYC approval, the anchor sends the equivalent Stellar asset to the user\'s account.',
      apiEndpoint: 'POST /transactions/deposit/interactive (callback)',
      examplePayload: { id: 'abc-123', status: 'pending_user_transfer_start' },
    },
    {
      id: 'deposit-5',
      label: 'Poll Transaction Status',
      description: 'Client polls GET /transaction to wait for completion.',
      apiEndpoint: 'GET /transaction?id=abc-123',
      examplePayload: { transaction: { id: 'abc-123', status: 'completed', stellar_transaction_hash: 'abc...' } },
    },
  ],
};

const WITHDRAWAL_FLOW: FlowSection = {
  title: 'SEP-24 Withdrawal Flow',
  steps: [
    {
      id: 'withdraw-1',
      label: 'Initiate Withdrawal',
      description: 'Client requests a withdrawal interaction URL from the anchor.',
      apiEndpoint: 'GET /info',
      examplePayload: { withdraw: { enabled: true, authentication_required: true } },
    },
    {
      id: 'withdraw-2',
      label: 'GET /withdraw Interactive',
      description: 'Client is redirected to the anchor\'s interactive URL for withdrawal details.',
      apiEndpoint: 'GET /withdraw?asset_code=USDC&account=G...',
      examplePayload: { type: 'interactive_customer_info_needed', url: 'https://anchor.com/withdraw-kyc?token=def456' },
    },
    {
      id: 'withdraw-3',
      label: 'Submit Withdrawal Info',
      description: 'User provides off-chain account details (e.g., bank account, mobile money number).',
      apiEndpoint: 'POST /customer (optional SEP-12)',
      examplePayload: { bank_account_number: '123456789', bank_code: 'XYZ' },
    },
    {
      id: 'withdraw-4',
      label: 'User sends Stellar Payment',
      description: 'User sends the Stellar asset to the anchor\'s distribution account.',
      apiEndpoint: 'POST /transactions/withdraw/interactive (callback)',
      examplePayload: { id: 'def-456', status: 'pending_user_transfer_start' },
    },
    {
      id: 'withdraw-5',
      label: 'Anchor sends Off-chain Funds',
      description: 'After on-chain confirmation, the anchor sends fiat to the user\'s off-chain account.',
      apiEndpoint: 'POST /transactions/withdraw/interactive (callback)',
      examplePayload: { id: 'def-456', status: 'completed', amount_in: '100', amount_out: '99.5' },
    },
  ],
};

interface StepNodeProps {
  step: FlowStep;
  index: number;
  total: number;
  isSelected: boolean;
  onSelect: () => void;
}

function StepNode({ step, index, total, isSelected, onSelect }: StepNodeProps) {
  const isLast = index === total - 1;
  return (
    <g>
      {!isLast && (
        <line
          x1={0} y1={60}
          x2={0} y2={100}
          stroke="var(--ifm-color-emphasis-400)"
          strokeWidth={2}
          strokeDasharray="4 2"
        />
      )}
      <circle
        cx={0} cy={30}
        r={22}
        fill={isSelected ? 'var(--ifm-color-primary)' : 'var(--ifm-color-emphasis-200)'}
        stroke={isSelected ? 'var(--ifm-color-primary-dark)' : 'var(--ifm-color-emphasis-400)'}
        strokeWidth={2}
        style={{ cursor: 'pointer', transition: 'fill 0.2s' }}
        onClick={onSelect}
      />
      <text
        x={0} y={35}
        textAnchor="middle"
        fill={isSelected ? '#fff' : 'var(--ifm-color-emphasis-700)'}
        fontSize={14}
        fontWeight="bold"
        style={{ cursor: 'pointer', pointerEvents: 'none' }}
      >
        {index + 1}
      </text>
      <foreignObject x={-120} y={55} width={240} height={60}>
        <div
          style={{
            textAlign: 'center',
            fontSize: '0.8rem',
            fontWeight: isSelected ? 600 : 400,
            color: isSelected ? 'var(--ifm-color-primary)' : 'var(--ifm-color-emphasis-700)',
            cursor: 'pointer',
            padding: '0 0.5rem',
          }}
          onClick={onSelect}
        >
          {step.label}
        </div>
      </foreignObject>
    </g>
  );
}

interface DetailPanelProps {
  step: FlowStep | null;
  onClose: () => void;
}

function DetailPanel({ step, onClose }: DetailPanelProps) {
  if (!step) return null;

  return (
    <div
      style={{
        marginTop: '1.5rem',
        padding: '1.25rem',
        background: 'var(--ifm-background-surface-color)',
        border: '1px solid var(--ifm-color-emphasis-300)',
        borderRadius: 'var(--ifm-global-radius)',
        position: 'relative',
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          top: '0.5rem',
          right: '0.75rem',
          background: 'none',
          border: 'none',
          fontSize: '1.25rem',
          cursor: 'pointer',
          color: 'var(--ifm-color-emphasis-500)',
        }}
      >
        ×
      </button>
      <h4 style={{ marginTop: 0 }}>{step.label}</h4>
      <p>{step.description}</p>
      {step.apiEndpoint && (
        <>
          <strong>API Endpoint:</strong>
          <pre style={{ background: 'var(--ifm-pre-background)', padding: '0.75rem', borderRadius: '4px', overflow: 'auto' }}>
            <code>{step.apiEndpoint}</code>
          </pre>
        </>
      )}
      {step.examplePayload && (
        <>
          <strong>Example Payload:</strong>
          <pre style={{ background: 'var(--ifm-pre-background)', padding: '0.75rem', borderRadius: '4px', overflow: 'auto' }}>
            <code>{JSON.stringify(step.examplePayload, null, 2)}</code>
          </pre>
        </>
      )}
    </div>
  );
}

export default function SEP24FlowDiagram(): React.JSX.Element {
  const [selectedStep, setSelectedStep] = useState<FlowStep | null>(null);
  const [activeFlow, setActiveFlow] = useState<'deposit' | 'withdrawal'>('deposit');

  const flow = activeFlow === 'deposit' ? DEPOSIT_FLOW : WITHDRAWAL_FLOW;

  const handleSelect = (step: FlowStep) => {
    setSelectedStep(step);
  };

  const svgHeight = flow.steps.length * 120 + 60;
  const svgWidth = 260;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => { setActiveFlow('deposit'); setSelectedStep(null); }}
          style={{
            padding: '0.5rem 1rem',
            border: `2px solid ${activeFlow === 'deposit' ? 'var(--ifm-color-primary)' : 'var(--ifm-color-emphasis-300)'}`,
            borderRadius: 'var(--ifm-global-radius)',
            background: activeFlow === 'deposit' ? 'var(--ifm-color-primary)' : 'transparent',
            color: activeFlow === 'deposit' ? '#fff' : 'var(--ifm-color-emphasis-700)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Deposit
        </button>
        <button
          onClick={() => { setActiveFlow('withdrawal'); setSelectedStep(null); }}
          style={{
            padding: '0.5rem 1rem',
            border: `2px solid ${activeFlow === 'withdrawal' ? 'var(--ifm-color-primary)' : 'var(--ifm-color-emphasis-300)'}`,
            borderRadius: 'var(--ifm-global-radius)',
            background: activeFlow === 'withdrawal' ? 'var(--ifm-color-primary)' : 'transparent',
            color: activeFlow === 'withdrawal' ? '#fff' : 'var(--ifm-color-emphasis-700)',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Withdrawal
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowX: 'auto' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', maxWidth: svgWidth, height: 'auto', display: 'block', margin: '0 auto' }}
        >
          {flow.steps.map((step, i) => (
            <g key={step.id} transform={`translate(${svgWidth / 2}, ${i * 120 + 10})`}>
              <StepNode
                step={step}
                index={i}
                total={flow.steps.length}
                isSelected={selectedStep?.id === step.id}
                onSelect={() => handleSelect(step)}
              />
            </g>
          ))}
        </svg>
      </div>

      <DetailPanel step={selectedStep} onClose={() => setSelectedStep(null)} />
    </div>
  );
}
