import React from 'react';
import { HistoryEntry } from '../hooks/useRequestHistory';

interface RequestHistoryProps {
  history: HistoryEntry[];
  onLoad: (method: string, path: string) => void;
  onClear: () => void;
}

export const RequestHistory: React.FC<RequestHistoryProps> = ({ history, onLoad, onClear }) => {
  if (history.length === 0) {
    return (
      <div className="mock-empty">
        <p>No request history yet. Save a configuration to start tracking.</p>
      </div>
    );
  }

  return (
    <>
      <div className="mock-history-header">
        <h3>Recent Requests</h3>
        <button className="mock-btn mock-btn-ghost mock-btn-sm" onClick={onClear}>
          🗑️ Clear History
        </button>
      </div>
      <div className="mock-history-list">
        {history.map((entry) => (
          <div key={entry.id} className="mock-history-item">
            <div className="mock-history-info">
              <span className={`mock-method-badge method-${entry.method.toLowerCase()}`}>
                {entry.method}
              </span>
              <code className="mock-history-path">{entry.path}</code>
              <span className="mock-status-badge">Status: {entry.statusCode}</span>
              <span className="mock-history-meta">Latency: {entry.latency}ms</span>
              <span className="mock-history-time">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <button
              className="mock-btn mock-btn-sm"
              onClick={() => onLoad(entry.method, entry.path)}
            >
              ↻ Load
            </button>
          </div>
        ))}
      </div>
    </>
  );
};
