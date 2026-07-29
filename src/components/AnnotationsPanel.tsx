import React, { useState, useEffect, useCallback, useMemo } from 'react';

interface Annotation {
  id: string;
  endpointPath: string;
  endpointMethod: string;
  text: string;
  type: 'tip' | 'gotcha' | 'note' | 'example';
  author: string;
  timestamp: number;
  upvotes: number;
  downvotes: number;
  flagged: boolean;
  pinned: boolean;
  archived: boolean;
}

const ANNOTATIONS_KEY = 'proxypay-annotations';
const USERNAME_KEY = 'proxypay-username';
const VOTES_KEY = 'proxypay-annotation-votes';
const PINNED_KEY = 'proxypay-pinned-annotations';

const ANNOTATION_TYPES = [
  { value: 'tip', label: '💡 Tip', color: '#2e8555' },
  { value: 'gotcha', label: '⚠️ Gotcha', color: '#e6a700' },
  { value: 'note', label: '📝 Note', color: '#3578e5' },
  { value: 'example', label: '📋 Example', color: '#8b5cf6' },
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function loadAnnotations(): Annotation[] {
  try {
    const raw = localStorage.getItem(ANNOTATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAnnotations(annotations: Annotation[]): void {
  localStorage.setItem(ANNOTATIONS_KEY, JSON.stringify(annotations));
}

function loadUsername(): string {
  return localStorage.getItem(USERNAME_KEY) || '';
}

function saveUsername(name: string): void {
  localStorage.setItem(USERNAME_KEY, name);
}

function loadVotes(): Record<string, 'up' | 'down' | null> {
  try {
    const raw = localStorage.getItem(VOTES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveVotes(votes: Record<string, 'up' | 'down' | null>): void {
  localStorage.setItem(VOTES_KEY, JSON.stringify(votes));
}

export default function AnnotationsPanel(): React.JSX.Element {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [votes, setVotes] = useState<Record<string, 'up' | 'down' | null>>({});
  const [toast, setToast] = useState('');
  const [activeView, setActiveView] = useState<'browse' | 'add' | 'admin'>('browse');

  // Add form state
  const [endpointPath, setEndpointPath] = useState('/api/v1/');
  const [endpointMethod, setEndpointMethod] = useState('GET');
  const [annotationText, setAnnotationText] = useState('');
  const [annotationType, setAnnotationType] = useState<'tip' | 'gotcha' | 'note' | 'example'>('tip');

  // Browse filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterEndpoint, setFilterEndpoint] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  useEffect(() => {
    setAnnotations(loadAnnotations());
    setUsername(loadUsername());
    setVotes(loadVotes());
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  }, []);

  const handleLogin = useCallback(() => {
    const name = usernameInput.trim();
    if (!name) return;
    setUsername(name);
    saveUsername(name);
    showToast(`Logged in as ${name}`);
  }, [usernameInput, showToast]);

  const handleLogout = useCallback(() => {
    setUsername('');
    saveUsername('');
    showToast('Logged out');
  }, [showToast]);

  const handleAddAnnotation = useCallback(() => {
    if (!username) {
      showToast('Please set a username first');
      return;
    }
    if (!annotationText.trim()) {
      showToast('Please enter annotation text');
      return;
    }

    const newAnnotation: Annotation = {
      id: generateId(),
      endpointPath,
      endpointMethod,
      text: annotationText.trim(),
      type: annotationType,
      author: username,
      timestamp: Date.now(),
      upvotes: 0,
      downvotes: 0,
      flagged: false,
      pinned: false,
      archived: false,
    };

    const updated = [newAnnotation, ...annotations];
    setAnnotations(updated);
    saveAnnotations(updated);
    setAnnotationText('');
    showToast('Annotation added!');
    setActiveView('browse');
  }, [username, annotationText, endpointPath, endpointMethod, annotationType, annotations, showToast]);

  const handleVote = useCallback(
    (annotationId: string, direction: 'up' | 'down') => {
      if (!username) {
        showToast('Please set a username to vote');
        return;
      }

      const prevVote = votes[annotationId];
      const updatedAnnotations = annotations.map((a) => {
        if (a.id !== annotationId) return a;
        let { upvotes, downvotes } = a;
        if (prevVote === 'up') upvotes--;
        if (prevVote === 'down') downvotes--;
        if (direction === 'up') upvotes++;
        if (direction === 'down') downvotes++;
        return { ...a, upvotes: Math.max(0, upvotes), downvotes: Math.max(0, downvotes) };
      });

      const newVotes = {
        ...votes,
        [annotationId]: prevVote === direction ? null : direction,
      };

      setAnnotations(updatedAnnotations);
      saveAnnotations(updatedAnnotations);
      setVotes(newVotes);
      saveVotes(newVotes);
    },
    [username, votes, annotations, showToast]
  );

  const handleFlag = useCallback(
    (annotationId: string) => {
      const updated = annotations.map((a) =>
        a.id === annotationId ? { ...a, flagged: !a.flagged } : a
      );
      setAnnotations(updated);
      saveAnnotations(updated);
      showToast('Annotation flagged for review');
    },
    [annotations, showToast]
  );

  const handlePin = useCallback(
    (annotationId: string) => {
      const updated = annotations.map((a) =>
        a.id === annotationId ? { ...a, pinned: !a.pinned } : a
      );
      setAnnotations(updated);
      saveAnnotations(updated);
      const pinned = updated.filter((a) => a.pinned).map((a) => a.id);
      localStorage.setItem(PINNED_KEY, JSON.stringify(pinned));
      showToast(updated.find((a) => a.id === annotationId)?.pinned ? 'Pinned!' : 'Unpinned');
    },
    [annotations, showToast]
  );

  const handleArchive = useCallback(
    (annotationId: string) => {
      const updated = annotations.map((a) =>
        a.id === annotationId ? { ...a, archived: !a.archived } : a
      );
      setAnnotations(updated);
      saveAnnotations(updated);
      showToast(updated.find((a) => a.id === annotationId)?.archived ? 'Archived' : 'Restored');
    },
    [annotations, showToast]
  );

  const handleDelete = useCallback(
    (annotationId: string) => {
      const updated = annotations.filter((a) => a.id !== annotationId);
      setAnnotations(updated);
      saveAnnotations(updated);
      showToast('Annotation deleted');
    },
    [annotations, showToast]
  );

  const handleBulkModerate = useCallback(
    (action: 'clear-flags' | 'archive-flagged') => {
      let updated = [...annotations];
      if (action === 'clear-flags') {
        updated = updated.map((a) => (a.flagged ? { ...a, flagged: false } : a));
      } else if (action === 'archive-flagged') {
        updated = updated.map((a) => (a.flagged ? { ...a, archived: true, flagged: false } : a));
      }
      setAnnotations(updated);
      saveAnnotations(updated);
      showToast('Moderation action applied');
    },
    [annotations, showToast]
  );

  const filteredAnnotations = useMemo(() => {
    let filtered = annotations.filter((a) => (showArchived ? true : !a.archived));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.text.toLowerCase().includes(q) ||
          a.endpointPath.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q)
      );
    }
    if (filterType !== 'all') {
      filtered = filtered.filter((a) => a.type === filterType);
    }
    if (filterEndpoint) {
      filtered = filtered.filter((a) => a.endpointPath.includes(filterEndpoint));
    }

    // Sort: pinned first, then by score (upvotes - downvotes), then by date
    filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      const scoreA = a.upvotes - a.downvotes;
      const scoreB = b.upvotes - b.downvotes;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.timestamp - a.timestamp;
    });

    return filtered;
  }, [annotations, searchQuery, filterType, filterEndpoint, showArchived]);

  const flagCount = annotations.filter((a) => a.flagged).length;

  return (
    <div className="annotations-panel">
      <div className="annotations-header">
        <h2>💬 Community Annotations</h2>
        <p className="annotations-subtitle">
          Tips, gotchas, and notes from the community on API endpoints.
        </p>
      </div>

      {toast && <div className="mock-toast">{toast}</div>}

      {/* User auth bar */}
      <div className="annotations-user-bar">
        {username ? (
          <div className="annotations-user-info">
            <span className="annotations-user-avatar">👤</span>
            <strong>{username}</strong>
            <button className="mock-btn mock-btn-ghost mock-btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="annotations-login-row">
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Enter username to participate..."
              className="mock-input annotations-username-input"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button className="mock-btn mock-btn-primary mock-btn-sm" onClick={handleLogin}>
              Set Username
            </button>
          </div>
        )}
      </div>

      {/* View tabs */}
      <div className="mock-tabs">
        <button
          className={`mock-tab ${activeView === 'browse' ? 'active' : ''}`}
          onClick={() => setActiveView('browse')}
        >
          📖 Browse ({filteredAnnotations.length})
        </button>
        <button
          className={`mock-tab ${activeView === 'add' ? 'active' : ''}`}
          onClick={() => setActiveView('add')}
        >
          ✏️ Add Annotation
        </button>
        <button
          className={`mock-tab ${activeView === 'admin' ? 'active' : ''}`}
          onClick={() => setActiveView('admin')}
        >
          ⚙️ Admin {flagCount > 0 && <span className="annotations-flag-count">{flagCount}</span>}
        </button>
      </div>

      {activeView === 'browse' && (
        <div className="annotations-browse">
          <div className="annotations-filters">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search annotations..."
              className="mock-input annotations-search"
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="mock-select annotations-filter-select"
            >
              <option value="all">All types</option>
              {ANNOTATION_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={filterEndpoint}
              onChange={(e) => setFilterEndpoint(e.target.value)}
              placeholder="Filter by path..."
              className="mock-input annotations-filter-select"
            />
            <label className="mock-checkbox-label annotations-archive-toggle">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
              />
              <span>Show archived</span>
            </label>
          </div>

          {filteredAnnotations.length === 0 ? (
            <div className="mock-empty">
              <p>No annotations found. Be the first to add one!</p>
            </div>
          ) : (
            <div className="annotations-list">
              {filteredAnnotations.map((a) => (
                <div
                  key={a.id}
                  className={`annotation-card ${a.pinned ? 'annotation-pinned' : ''} ${a.flagged ? 'annotation-flagged' : ''}`}
                >
                  <div className="annotation-header">
                    <span
                      className="annotation-type-badge"
                      style={{ backgroundColor: ANNOTATION_TYPES.find((t) => t.value === a.type)?.color }}
                    >
                      {ANNOTATION_TYPES.find((t) => t.value === a.type)?.label}
                    </span>
                    <span className={`mock-method-badge method-${a.endpointMethod.toLowerCase()}`}>
                      {a.endpointMethod}
                    </span>
                    <code className="annotation-endpoint">{a.endpointPath}</code>
                    {a.pinned && <span className="annotation-pin-badge">📌 Pinned</span>}
                    {a.flagged && <span className="annotation-flag-badge">🚩 Flagged</span>}
                    {a.archived && <span className="annotation-archive-badge">📦 Archived</span>}
                  </div>
                  <p className="annotation-text">{a.text}</p>
                  <div className="annotation-footer">
                    <div className="annotation-meta">
                      <span className="annotation-author">👤 {a.author}</span>
                      <span className="annotation-date">{new Date(a.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="annotation-actions">
                      <div className="annotation-votes">
                        <button
                          className={`mock-btn mock-btn-sm annotation-vote-btn ${votes[a.id] === 'up' ? 'annotation-voted' : ''}`}
                          onClick={() => handleVote(a.id, 'up')}
                          title="Upvote"
                        >
                          👍 {a.upvotes}
                        </button>
                        <button
                          className={`mock-btn mock-btn-sm annotation-vote-btn ${votes[a.id] === 'down' ? 'annotation-voted' : ''}`}
                          onClick={() => handleVote(a.id, 'down')}
                          title="Downvote"
                        >
                          👎 {a.downvotes}
                        </button>
                      </div>
                      <button
                        className="mock-btn mock-btn-sm mock-btn-ghost"
                        onClick={() => handlePin(a.id)}
                        title={a.pinned ? 'Unpin' : 'Pin'}
                      >
                        {a.pinned ? '📌 Unpin' : '📌 Pin'}
                      </button>
                      <button
                        className="mock-btn mock-btn-sm mock-btn-ghost"
                        onClick={() => handleFlag(a.id)}
                        title={a.flagged ? 'Unflag' : 'Flag'}
                      >
                        {a.flagged ? '✅ Resolve' : '🚩 Flag'}
                      </button>
                      <button
                        className="mock-btn mock-btn-sm mock-btn-ghost"
                        onClick={() => handleArchive(a.id)}
                      >
                        {a.archived ? '📂 Restore' : '📦 Archive'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'add' && (
        <div className="annotations-add">
          <h3>Add New Annotation</h3>
          {!username ? (
            <div className="mock-empty">
              <p>Please set a username above to add annotations.</p>
            </div>
          ) : (
            <div className="annotations-add-form">
              <div className="mock-grid">
                <div className="mock-field">
                  <label>Endpoint Path</label>
                  <input
                    type="text"
                    value={endpointPath}
                    onChange={(e) => setEndpointPath(e.target.value)}
                    placeholder="/api/v1/users"
                    className="mock-input"
                  />
                </div>
                <div className="mock-field">
                  <label>HTTP Method</label>
                  <select
                    value={endpointMethod}
                    onChange={(e) => setEndpointMethod(e.target.value)}
                    className="mock-select"
                  >
                    {HTTP_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mock-field">
                <label>Annotation Type</label>
                <div className="annotations-type-selector">
                  {ANNOTATION_TYPES.map((t) => (
                    <button
                      key={t.value}
                      className={`annotations-type-btn ${annotationType === t.value ? 'active' : ''}`}
                      style={{
                        borderColor: annotationType === t.value ? t.color : 'transparent',
                        backgroundColor: annotationType === t.value ? t.color + '20' : 'var(--ifm-background-surface-color)',
                      }}
                      onClick={() => setAnnotationType(t.value as any)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mock-field">
                <label>Your Annotation</label>
                <textarea
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  rows={4}
                  placeholder="Share a tip, gotcha, note, or example about this endpoint..."
                  className="mock-textarea"
                />
              </div>
              <button className="mock-btn mock-btn-primary" onClick={handleAddAnnotation}>
                💬 Add Annotation
              </button>
            </div>
          )}
        </div>
      )}

      {activeView === 'admin' && (
        <div className="annotations-admin">
          <h3>⚙️ Admin Dashboard</h3>
          <div className="annotations-admin-stats">
            <div className="annotations-stat-card">
              <span className="annotations-stat-value">{annotations.length}</span>
              <span className="annotations-stat-label">Total</span>
            </div>
            <div className="annotations-stat-card annotations-stat-warning">
              <span className="annotations-stat-value">{flagCount}</span>
              <span className="annotations-stat-label">Flagged</span>
            </div>
            <div className="annotations-stat-card">
              <span className="annotations-stat-value">{annotations.filter((a) => a.pinned).length}</span>
              <span className="annotations-stat-label">Pinned</span>
            </div>
            <div className="annotations-stat-card">
              <span className="annotations-stat-value">{annotations.filter((a) => a.archived).length}</span>
              <span className="annotations-stat-label">Archived</span>
            </div>
          </div>

          <div className="annotations-admin-actions">
            <button
              className="mock-btn mock-btn-secondary"
              onClick={() => handleBulkModerate('clear-flags')}
              disabled={flagCount === 0}
            >
              ✅ Clear All Flags
            </button>
            <button
              className="mock-btn mock-btn-secondary"
              onClick={() => handleBulkModerate('archive-flagged')}
              disabled={flagCount === 0}
            >
              📦 Archive All Flagged
            </button>
          </div>

          <h4>All Flagged Annotations</h4>
          {annotations.filter((a) => a.flagged).length === 0 ? (
            <div className="mock-empty"><p>No flagged annotations. 🎉</p></div>
          ) : (
            <div className="annotations-list">
              {annotations
                .filter((a) => a.flagged)
                .map((a) => (
                  <div key={a.id} className="annotation-card annotation-flagged">
                    <div className="annotation-header">
                      <span className={`mock-method-badge method-${a.endpointMethod.toLowerCase()}`}>
                        {a.endpointMethod}
                      </span>
                      <code>{a.endpointPath}</code>
                      <span className="annotation-author">by {a.author}</span>
                    </div>
                    <p className="annotation-text">{a.text}</p>
                    <div className="annotation-footer">
                      <div className="annotation-actions">
                        <button className="mock-btn mock-btn-sm" onClick={() => handleFlag(a.id)}>
                          ✅ Clear Flag
                        </button>
                        <button className="mock-btn mock-btn-sm" onClick={() => handleArchive(a.id)}>
                          📦 Archive
                        </button>
                        <button className="mock-btn mock-btn-sm mock-btn-danger" onClick={() => handleDelete(a.id)}>
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
