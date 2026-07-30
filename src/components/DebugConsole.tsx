import React, { useState, useCallback } from 'react';
import type { EndpointInfo } from '../hooks/useOpenApiSpec';

interface TimingBreakdown {
  dns: number;
  tcp: number;
  tls: number;
  request: number;
  response: number;
  total: number;
}

interface RequestLog {
  id: string;
  endpoint: string;
  method: string;
  url: string;
  status: number;
  timing: TimingBreakdown;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  timestamp: number;
  duration: number;
}

function generateTiming(): TimingBreakdown {
  return {
    dns: Math.round(Math.random() * 15 + 1),
    tcp: Math.round(Math.random() * 10 + 5),
    tls: Math.round(Math.random() * 20 + 10),
    request: Math.round(Math.random() * 30 + 10),
    response: Math.round(Math.random() * 50 + 20),
    total: 0,
  };
}

function generateSampleLog(id: number, endpoint: EndpointInfo): RequestLog {
  const timing = generateTiming();
  timing.total = timing.dns + timing.tcp + timing.tls + timing.request + timing.response;

  return {
    id: `req-${id}`,
    endpoint: `${endpoint.method} ${endpoint.path}`,
    method: endpoint.method,
    url: `https://api.proxypay.com${endpoint.path}`,
    status: [200, 201, 200, 200, 400, 200, 200, 422, 200][id % 9],
    timing,
    requestHeaders: {
      Authorization: 'Bearer pp_live_••••••••',
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'ProxyPay-SDK/2.1',
      'Idempotency-Key': `idem-${Date.now()}-${id}`,
    },
    responseHeaders: {
      'Content-Type': 'application/json',
      'X-Request-Id': `req_${Math.random().toString(36).slice(2, 10)}`,
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': String(99 - (id % 100)),
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 60),
    },
    requestBody:
      endpoint.method !== 'GET'
        ? JSON.stringify(
            {
              amount: 100,
              currency: 'USD',
              phone: '254712345678',
              provider: 'mpesa',
            },
            null,
            2
          )
        : undefined,
    responseBody: JSON.stringify(
      {
        id: `trx_${Math.random().toString(36).slice(2, 10)}`,
        status: 'success',
        message: 'Transaction completed',
        tracking_id: `trk_${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
      },
      null,
      2
    ),
    timestamp: Date.now() - (10 - id) * 5000,
    duration: timing.total,
  };
}

function generateCurl(log: RequestLog): string {
  let curl = `curl -X ${log.method} '${log.url}'`;
  Object.entries(log.requestHeaders).forEach(([key, value]) => {
    curl += ` \\\n  -H '${key}: ${value}'`;
  });
  if (log.requestBody) {
    curl += ` \\\n  -d '${log.requestBody.replace(/'/g, "'\\''")}'`;
  }
  return curl;
}

function generateHar(logs: RequestLog[]): string {
  const har = {
    log: {
      version: '1.2',
      creator: { name: 'ProxyPay Debug Console', version: '1.0' },
      entries: logs.map((log) => ({
        startedDateTime: new Date(log.timestamp).toISOString(),
        time: log.duration,
        request: {
          method: log.method,
          url: log.url,
          httpVersion: 'HTTP/1.1',
          headers: Object.entries(log.requestHeaders).map(([name, value]) => ({ name, value })),
          postData: log.requestBody
            ? { mimeType: 'application/json', text: log.requestBody }
            : undefined,
        },
        response: {
          status: log.status,
          statusText: log.status === 200 ? 'OK' : log.status === 201 ? 'Created' : 'Error',
          httpVersion: 'HTTP/1.1',
          headers: Object.entries(log.responseHeaders).map(([name, value]) => ({ name, value })),
          content: {
            size: log.responseBody?.length || 0,
            mimeType: 'application/json',
            text: log.responseBody,
          },
        },
        timings: {
          dns: log.timing.dns,
          connect: log.timing.tcp,
          ssl: log.timing.tls,
          send: log.timing.request,
          wait: 0,
          receive: log.timing.response,
        },
      })),
    },
  };
  return JSON.stringify(har, null, 2);
}

interface DebugConsoleProps {
  endpoints: EndpointInfo[];
  selectedEndpoint: EndpointInfo | null;
}

export default function DebugConsole({ endpoints, selectedEndpoint }: DebugConsoleProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<RequestLog | null>(null);
  const [activeTab, setActiveTab] = useState<'waterfall' | 'headers' | 'body' | 'curl' | 'timing'>('waterfall');
  const [logIndex, setLogIndex] = useState(0);

  const clearLogs = () => setLogs([]);
  const closePanel = () => setIsOpen(false);

  const runRequest = useCallback(() => {
    const idx = logIndex;
    setLogIndex(idx + 1);

    if (selectedEndpoint) {
      const newLog = generateSampleLog(idx, selectedEndpoint);
      setLogs((prev) => [newLog, ...prev].slice(0, 20));
      setSelectedLog(newLog);
    } else if (endpoints.length > 0) {
      const ep = endpoints[idx % endpoints.length];
      const newLog = generateSampleLog(idx, ep);
      setLogs((prev) => [newLog, ...prev].slice(0, 20));
      setSelectedLog(newLog);
    }
  }, [selectedEndpoint, endpoints, logIndex]);

  const exportHar = () => {
    const har = generateHar(logs);
    const blob = new Blob([har], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proxypay-debug-${new Date().toISOString().split('T')[0]}.har`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCurl = (log: RequestLog) => {
    navigator.clipboard.writeText(generateCurl(log));
  };

  const maxTiming = Math.max(...logs.map((l) => l.timing.total), 1);
  const waterfallColors: Record<string, string> = {
    dns: '#8b5cf6',
    tcp: '#3b82f6',
    tls: '#6366f1',
    request: '#10b981',
    response: '#f59e0b',
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        className={`debug-toggle ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Developer Debug Console"
        aria-label="Toggle Debug Console"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
        <span className="debug-toggle-label">Dev Tools</span>
        {logs.length > 0 && <span className="debug-toggle-count">{logs.length}</span>}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="debug-panel">
          <div className="debug-panel-header">
            <h3>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
              Developer Console
            </h3>
            <div className="debug-panel-actions">
              <button className="debug-btn" onClick={runRequest} title="Send test request">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                Send Request
              </button>
              <button className="debug-btn" onClick={exportHar} disabled={logs.length === 0} title="Export as HAR">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                HAR
              </button>
              <button className="debug-btn" onClick={clearLogs} disabled={logs.length === 0} title="Clear logs">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14" />
                </svg>
                Clear
              </button>
              <button className="debug-btn debug-btn-close" onClick={closePanel} title="Close">
                ✕
              </button>
            </div>
          </div>

          <div className="debug-panel-body">
            {/* Request List (Waterfall) */}
            <div className="debug-logs">
              <div className="debug-tabs">
                {(['waterfall', 'headers', 'body', 'curl', 'timing'] as const).map((tab) => (
                  <button
                    key={tab}
                    className={`debug-tab ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              {activeTab === 'waterfall' && (
                <div className="debug-waterfall">
                  {logs.length === 0 ? (
                    <div className="debug-empty">
                      <p>No requests yet. Click &ldquo;Send Request&rdquo; to start debugging.</p>
                    </div>
                  ) : (
                    <div className="waterfall-list">
                      {logs.map((log) => (
                        <div
                          key={log.id}
                          className={`waterfall-row ${selectedLog?.id === log.id ? 'wf-selected' : ''}`}
                          onClick={() => setSelectedLog(log)}
                        >
                          <span className={`wf-status wf-status-${log.status >= 200 && log.status < 300 ? 'success' : 'error'}`}>
                            {log.status}
                          </span>
                          <span className={`wf-method wf-method-${log.method.toLowerCase()}`}>{log.method}</span>
                          <span className="wf-endpoint">{log.endpoint}</span>
                          <span className="wf-duration">{log.duration}ms</span>
                          <div className="wf-bar-container">
                            <div className="wf-bar" style={{ width: `${(log.timing.total / maxTiming) * 100}%` }}>
                              {Object.entries(log.timing).filter(([k]) => k !== 'total').map(([phase, time]) => (
                                <div
                                  key={phase}
                                  className={`wf-segment wf-${phase}`}
                                  style={{
                                    width: `${(time / log.timing.total) * 100}%`,
                                    backgroundColor: waterfallColors[phase],
                                  }}
                                  title={`${phase}: ${time}ms`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Header Inspector */}
              {activeTab === 'headers' && selectedLog && (
                <div className="debug-headers">
                  <div className="debug-headers-section">
                    <h4>Request Headers</h4>
                    <table className="debug-header-table">
                      <tbody>
                        {Object.entries(selectedLog.requestHeaders).map(([key, value]) => (
                          <tr key={key}>
                            <td className="debug-header-key">{key}</td>
                            <td className="debug-header-value">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="debug-headers-section">
                    <h4>Response Headers</h4>
                    <table className="debug-header-table">
                      <tbody>
                        {Object.entries(selectedLog.responseHeaders).map(([key, value]) => (
                          <tr key={key}>
                            <td className="debug-header-key">{key}</td>
                            <td className="debug-header-value">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Body Viewer */}
              {activeTab === 'body' && selectedLog && (
                <div className="debug-body">
                  {selectedLog.requestBody && (
                    <div className="debug-body-section">
                      <h4>Request Body</h4>
                      <pre className="debug-body-code">{selectedLog.requestBody}</pre>
                    </div>
                  )}
                  <div className="debug-body-section">
                    <h4>Response Body</h4>
                    <pre className="debug-body-code">{selectedLog.responseBody}</pre>
                  </div>
                </div>
              )}

              {/* cURL */}
              {activeTab === 'curl' && selectedLog && (
                <div className="debug-curl">
                  <div className="debug-curl-header">
                    <h4>cURL Command</h4>
                    <button className="debug-btn" onClick={() => copyCurl(selectedLog)}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </button>
                  </div>
                  <pre className="debug-curl-code">{generateCurl(selectedLog)}</pre>
                </div>
              )}

              {/* Timing Breakdown */}
              {activeTab === 'timing' && selectedLog && (
                <div className="debug-timing">
                  <h4>Timing Breakdown</h4>
                  <div className="timing-phases">
                    {[
                      { key: 'dns', label: 'DNS Lookup' },
                      { key: 'tcp', label: 'TCP Connect' },
                      { key: 'tls', label: 'TLS Handshake' },
                      { key: 'request', label: 'Request Sent' },
                      { key: 'response', label: 'Response Received' },
                    ].map(({ key, label }) => {
                      const time = selectedLog.timing[key as keyof TimingBreakdown] as number;
                      const pct = (time / selectedLog.timing.total) * 100;
                      return (
                        <div key={key} className="timing-phase">
                          <div className="timing-phase-header">
                            <span className="timing-phase-label">{label}</span>
                            <span className="timing-phase-time">{time}ms</span>
                            <span className="timing-phase-pct">{pct.toFixed(1)}%</span>
                          </div>
                          <div className="timing-phase-bar">
                            <div
                              className={`timing-phase-fill timing-${key}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="timing-total">
                    Total: <strong>{selectedLog.timing.total}ms</strong>
                  </div>
                </div>
              )}

              {activeTab !== 'waterfall' && !selectedLog && logs.length > 0 && (
                <div className="debug-empty">
                  <p>Select a request from the waterfall view to inspect.</p>
                </div>
              )}
              {activeTab !== 'waterfall' && logs.length === 0 && (
                <div className="debug-empty">
                  <p>Send a request first to see details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export { generateCurl, generateHar, generateSampleLog };
export type { RequestLog, TimingBreakdown };
