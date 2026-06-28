import React, { useState, useMemo } from 'react';

export type WebhookStatus = 'delivered' | 'failed' | 'retried';

export interface WebhookEvent {
  id: string;
  eventType: string;
  status: WebhookStatus;
  /** ISO 8601 date-time string */
  timestamp: string;
  payload: Record<string, unknown>;
}

interface WebhookEventLogProps {
  events?: WebhookEvent[];
  pageSize?: number;
}

const STATUS_COLOR: Record<WebhookStatus, string> = {
  delivered: '#2e8555',
  failed: '#c62828',
  retried: '#e65100',
};

const DEFAULT_PAGE_SIZE = 25;

const CELL_STYLE: React.CSSProperties = { padding: '0.5rem 0.75rem' };

export default function WebhookEventLog({
  events = [],
  pageSize = DEFAULT_PAGE_SIZE,
}: WebhookEventLogProps): React.JSX.Element {
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const eventTypes = useMemo(
    () => Array.from(new Set(events.map((e) => e.eventType))).sort(),
    [events],
  );

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (eventTypeFilter && e.eventType !== eventTypeFilter) return false;
      if (dateFrom && e.timestamp < dateFrom) return false;
      if (dateTo && e.timestamp > `${dateTo}T23:59:59`) return false;
      return true;
    });
  }, [events, eventTypeFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const resetPagination = () => {
    setPage(1);
    setExpandedId(null);
  };

  const hasActiveFilters = Boolean(eventTypeFilter || dateFrom || dateTo);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1rem',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <label
          style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}
        >
          Event Type
          <select
            value={eventTypeFilter}
            onChange={(e) => {
              setEventTypeFilter(e.target.value);
              resetPagination();
            }}
            style={{
              padding: '0.375rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #ccc',
              minWidth: 160,
            }}
          >
            <option value="">All</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label
          style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}
        >
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              resetPagination();
            }}
            style={{ padding: '0.375rem 0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
          />
        </label>

        <label
          style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}
        >
          To
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              resetPagination();
            }}
            style={{ padding: '0.375rem 0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
          />
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setEventTypeFilter('');
              setDateFrom('');
              setDateTo('');
              resetPagination();
            }}
            style={{
              padding: '0.375rem 0.75rem',
              borderRadius: 4,
              border: '1px solid #ccc',
              cursor: 'pointer',
              alignSelf: 'flex-end',
            }}
          >
            Clear Filters
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ background: '#f5f5f5', textAlign: 'left' }}>
              {['Event Type', 'Status', 'Timestamp', 'Payload Preview'].map((col) => (
                <th key={col} style={{ ...CELL_STYLE, borderBottom: '2px solid #ddd' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
                  No events found.
                </td>
              </tr>
            ) : (
              pageItems.map((event) => {
                const isExpanded = expandedId === event.id;
                const payloadStr = JSON.stringify(event.payload);
                const preview =
                  payloadStr.slice(0, 80) + (payloadStr.length > 80 ? '…' : '');

                return (
                  <React.Fragment key={event.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                      aria-expanded={isExpanded}
                      style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }}
                    >
                      <td style={CELL_STYLE}>{event.eventType}</td>
                      <td style={CELL_STYLE}>
                        <span style={{ color: STATUS_COLOR[event.status], fontWeight: 600 }}>
                          {event.status}
                        </span>
                      </td>
                      <td style={{ ...CELL_STYLE, whiteSpace: 'nowrap' }}>
                        {new Date(event.timestamp).toLocaleString()}
                      </td>
                      <td
                        style={{
                          ...CELL_STYLE,
                          color: '#555',
                          fontFamily: 'monospace',
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {preview}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            padding: '0.75rem 1rem',
                            background: '#fafafa',
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          <pre style={{ margin: 0, fontSize: '0.8125rem', overflowX: 'auto' }}>
                            {JSON.stringify(event.payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.75rem',
          fontSize: '0.875rem',
        }}
      >
        <span style={{ color: '#666' }}>
          {filtered.length === 0
            ? '0 events'
            : `Showing ${(safePage - 1) * pageSize + 1}–${Math.min(
                safePage * pageSize,
                filtered.length,
              )} of ${filtered.length}`}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            disabled={safePage === 1}
            onClick={() => setPage(safePage - 1)}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 4,
              border: '1px solid #ccc',
              cursor: safePage === 1 ? 'not-allowed' : 'pointer',
              opacity: safePage === 1 ? 0.5 : 1,
            }}
          >
            Previous
          </button>
          <span>
            {safePage} / {totalPages}
          </span>
          <button
            type="button"
            disabled={safePage === totalPages}
            onClick={() => setPage(safePage + 1)}
            style={{
              padding: '0.25rem 0.75rem',
              borderRadius: 4,
              border: '1px solid #ccc',
              cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
              opacity: safePage === totalPages ? 0.5 : 1,
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
