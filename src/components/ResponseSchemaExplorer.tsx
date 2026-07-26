import React, { useMemo, useState } from 'react';

type SchemaNode = {
  name: string;
  type?: string;
  description?: string;
  required?: boolean;
  nullable?: boolean;
  enum?: string[];
  enumDescriptions?: Record<string, string>;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
};

const defaultSchema: SchemaNode = {
  name: 'payment_response',
  type: 'object',
  description: 'Example response payload for a payment intent.',
  properties: {
    id: {
      name: 'id',
      type: 'string',
      description: 'Unique identifier for the payment record.',
      required: true,
    },
    status: {
      name: 'status',
      type: 'string',
      description: 'Current processing status of the payment.',
      enum: ['pending', 'settled', 'failed'],
      enumDescriptions: {
        pending: 'The payment is still being processed.',
        settled: 'The payment completed successfully.',
        failed: 'The payment failed and requires attention.',
      },
    },
    amount: {
      name: 'amount',
      type: 'number',
      description: 'Transaction amount in the selected currency.',
      required: true,
    },
    currency: {
      name: 'currency',
      type: 'string',
      description: 'Three-letter ISO currency code.',
      nullable: true,
    },
    metadata: {
      name: 'metadata',
      type: 'object',
      description: 'Optional provider-specific attributes.',
      nullable: true,
      properties: {
        reference: {
          name: 'reference',
          type: 'string',
          description: 'External reference from the initiating system.',
        },
        riskScore: {
          name: 'riskScore',
          type: 'number',
          description: 'Estimated fraud risk score from the risk engine.',
        },
      },
    },
    recipients: {
      name: 'recipients',
      type: 'array',
      description: 'Collection of associated recipients.',
      items: {
        name: 'recipient',
        type: 'object',
        properties: {
          accountId: {
            name: 'accountId',
            type: 'string',
            description: 'Recipient account identifier.',
            required: true,
          },
          payoutMethod: {
            name: 'payoutMethod',
            type: 'string',
            description: 'How the funds should be disbursed.',
            enum: ['bank', 'mobile_money', 'crypto'],
            enumDescriptions: {
              bank: 'Transfer to a bank account.',
              mobile_money: 'Transfer to a mobile-money wallet.',
              crypto: 'Send via a supported crypto network.',
            },
          },
        },
      },
    },
    completedAt: {
      name: 'completedAt',
      type: 'string',
      description: 'Timestamp for completion when applicable.',
      nullable: true,
    },
  },
};

function matchesSearch(node: SchemaNode, searchTerm: string): boolean {
  const term = searchTerm.trim().toLowerCase();

  if (!term) {
    return true;
  }

  const haystack = [
    node.name,
    node.type,
    node.description,
    ...(node.enum ?? []),
    ...(node.enumDescriptions ? Object.values(node.enumDescriptions) : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes(term)) {
    return true;
  }

  if (node.properties) {
    return Object.values(node.properties).some((child) => matchesSearch(child, term));
  }

  if (node.items) {
    return matchesSearch(node.items, term);
  }

  return false;
}

function SchemaNodeView({
  node,
  path,
  expanded,
  onToggle,
  searchTerm,
}: {
  node: SchemaNode;
  path: string[];
  expanded: Record<string, boolean>;
  onToggle: (pathKey: string) => void;
  searchTerm: string;
}): React.JSX.Element {
  const pathKey = path.join('.');
  const shouldRenderNode = matchesSearch(node, searchTerm);
  const hasChildren = Boolean(node.properties && Object.keys(node.properties).length > 0) || Boolean(node.items);
  const isExpanded = searchTerm ? true : expanded[pathKey] ?? true;

  if (!shouldRenderNode) {
    return <></>;
  }

  return (
    <div className="schema-node">
      <div className="schema-node__row">
        <button
          type="button"
          className="schema-node__toggle"
          aria-expanded={isExpanded}
          onClick={() => onToggle(pathKey)}
          disabled={!hasChildren}
        >
          {hasChildren ? (isExpanded ? '▾' : '▸') : '•'}
        </button>
        <div className="schema-node__content">
          <div className="schema-node__header">
            <span className="schema-node__name">{node.name}</span>
            <div className="schema-node__badges">
              <span className="schema-badge schema-badge--type">{node.type ?? 'unknown'}</span>
              {node.required ? <span className="schema-badge schema-badge--required">Required</span> : null}
              {node.nullable ? <span className="schema-badge schema-badge--nullable">Nullable</span> : null}
            </div>
          </div>
          {node.description ? <p className="schema-node__description">{node.description}</p> : null}
          {node.type === 'array' && node.items ? (
            <p className="schema-node__meta">Items: {node.items.type ?? 'unknown'}</p>
          ) : null}
          {node.enum?.length ? (
            <div className="schema-node__enum">
              <span className="schema-node__enum-title">Allowed values</span>
              <ul>
                {node.enum.map((value) => (
                  <li key={value}>
                    <strong>{value}</strong>
                    {node.enumDescriptions?.[value] ? <span> — {node.enumDescriptions[value]}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {hasChildren && isExpanded ? (
        <div className="schema-node__children">
          {node.properties
            ? Object.entries(node.properties).map(([fieldName, child]) => (
                <SchemaNodeView
                  key={`${pathKey}.${fieldName}`}
                  node={child}
                  path={[...path, fieldName]}
                  expanded={expanded}
                  onToggle={onToggle}
                  searchTerm={searchTerm}
                />
              ))
            : node.items ? (
                <SchemaNodeView
                  node={node.items}
                  path={[...path, 'items']}
                  expanded={expanded}
                  onToggle={onToggle}
                  searchTerm={searchTerm}
                />
              ) : null}
        </div>
      ) : null}
    </div>
  );
}

export default function ResponseSchemaExplorer(): React.JSX.Element {
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ payment_response: true });
  const schema = useMemo(() => defaultSchema, []);

  const toggleNode = (pathKey: string) => {
    setExpanded((current) => ({ ...current, [pathKey]: !current[pathKey] }));
  };

  return (
    <section className="schema-explorer" aria-label="Response schema explorer">
      <div className="schema-explorer__header">
        <div>
          <h2>Interactive response schema</h2>
          <p>Explore nested response payloads with expandable fields, type badges, and enum details.</p>
        </div>
        <label className="schema-explorer__search" htmlFor="schema-search">
          <span className="visually-hidden">Search schema</span>
          <input
            id="schema-search"
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search fields or types"
          />
        </label>
      </div>

      <div className="schema-explorer__tree">
        <SchemaNodeView node={schema} path={[schema.name]} expanded={expanded} onToggle={toggleNode} searchTerm={searchTerm} />
      </div>
    </section>
  );
}
