import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

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
  flagReason?: string;
}

interface UserMeta {
  username: string;
  joinDate: number;
}

const ANNOTATIONS_KEY = 'proxypay-annotations';
const USERNAME_KEY = 'proxypay-username';
const VOTES_KEY = 'proxypay-annotation-votes';
const PINNED_KEY = 'proxypay-pinned-annotations';
const USERS_KEY = 'proxypay-annotation-users';

const ANNOTATION_TYPES = [
  { value: 'tip', label: '💡 Tip', color: '#2e8555' },
  { value: 'gotcha', label: '⚠️ Gotcha', color: '#e6a700' },
  { value: 'note', label: '📝 Note', color: '#3578e5' },
  { value: 'example', label: '📋 Example', color: '#8b5cf6' },
];

const FLAG_REASONS = ['Spam', 'Inaccurate', 'Offensive', 'Outdated', 'Duplicate', 'Other'];

const SORT_OPTIONS = [
  { value: 'score', label: 'Highest Rated' },
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'controversial', label: 'Most Discussed' },
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'];

const AVATAR_COLORS = [
  '#2e8555', '#3578e5', '#8b5cf6', '#e6a700', '#dc2626',
  '#0891b2', '#7c3aed', '#db2777', '#ea580c', '#4f46e5',
];

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function stringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || '?';
}

function getScoreColor(score: number): string {
  if (score >= 5) return '#2e8555';
  if (score >= 1) return '#3578e5';
  if (score === 0) return '#6b7280';
  if (score >= -3) return '#e6a700';
  return '#dc2626';
}

function getHelpfulnessPercent(upvotes: number, downvotes: number): number | null {
  const total = upvotes + downvotes;
  if (total === 0) return null;
  return Math.round((upvotes / total) * 100);
}

// ── Markdown renderer ──────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // Split into paragraphs
  const paragraphs = text.split(/\n\n+/);

  paragraphs.forEach((para, pi) => {
    if (pi > 0) nodes.push(<br key={`br-${pi}`} />);

    const lines = para.split('\n');
    lines.forEach((line, li) => {
      if (li > 0) nodes.push(<br key={`lbr-${pi}-${li}`} />);

      // Inline code
      const segments: React.ReactNode[] = [];
      let remaining = line;
      let keyIdx = 0;

      // Process inline code (`...`)
      while (remaining.length > 0) {
        const tickIdx = remaining.indexOf('`');
        if (tickIdx === -1) {
          segments.push(<span key={`s-${pi}-${li}-${keyIdx++}`}>{processInlineFormatting(remaining)}</span>);
          break;
        }
        if (tickIdx > 0) {
          segments.push(<span key={`s-${pi}-${li}-${keyIdx++}`}>{processInlineFormatting(remaining.slice(0, tickIdx))}</span>);
        }
        const endTick = remaining.indexOf('`', tickIdx + 1);
        if (endTick === -1) {
          segments.push(<span key={`s-${pi}-${li}-${keyIdx++}`}>{processInlineFormatting(remaining.slice(tickIdx))}</span>);
          break;
        }
        segments.push(
          <code key={`c-${pi}-${li}-${keyIdx++}`} className="annotation-inline-code">
            {remaining.slice(tickIdx + 1, endTick)}
          </code>
        );
        remaining = remaining.slice(endTick + 1);
      }

      nodes.push(<span key={`l-${pi}-${li}`}>{segments}</span>);
    });
  });

  return nodes;
}

function processInlineFormatting(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // Bold: **...**
    const boldMatch = remaining.match(/^(.*?)\*\*(.+?)\*\*(.*)/s);
    if (boldMatch) {
      if (boldMatch[1]) {
        const linkNodes = processLinks(boldMatch[1], keyIdx);
        nodes.push(...linkNodes.nodes);
        keyIdx = linkNodes.nextKey;
      }
      nodes.push(<strong key={`b-${keyIdx++}`}>{boldMatch[2]}</strong>);
      remaining = boldMatch[3];
      continue;
    }
    // Italic: *...* (single asterisk, not double)
    const italicMatch = remaining.match(/^(.*?[^*]|^)\*([^*]+)\*(.*)/s);
    if (italicMatch && !remaining.match(/^\*\*/)) {
      if (italicMatch[1]) {
        const linkNodes = processLinks(italicMatch[1], keyIdx);
        nodes.push(...linkNodes.nodes);
        keyIdx = linkNodes.nextKey;
      }
      nodes.push(<em key={`i-${keyIdx++}`}>{italicMatch[2]}</em>);
      remaining = italicMatch[3];
      continue;
    }
    // Links
    const linkNodes = processLinks(remaining, keyIdx);
    nodes.push(...linkNodes.nodes);
    break;
  }

  return nodes.length > 0 ? nodes : [<span key="f">{text}</span>];
}

function processLinks(text: string, startIdx: number): { nodes: React.ReactNode[]; nextKey: number } {
  const nodes: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = startIdx;

  while (remaining.length > 0) {
    const linkMatch = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)(.*)/s);
    if (linkMatch) {
      if (linkMatch[1]) {
        nodes.push(<span key={`lk-${keyIdx++}`}>{linkMatch[1]}</span>);
      }
      nodes.push(
        <a key={`a-${keyIdx++}`} href={linkMatch[3]} target="_blank" rel="noopener noreferrer" className="annotation-link">
          {linkMatch[2]}
        </a>
      );
      remaining = linkMatch[4];
    } else {
      nodes.push(<span key={`lk-${keyIdx++}`}>{remaining}</span>);
      break;
    }
  }

  return { nodes, nextKey: keyIdx };
}

// ── Storage helpers ─────────────────────────────────────────────────

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

function loadUsers(): Record<string, UserMeta> {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsers(users: Record<string, UserMeta>): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getOrCreateUser(username: string): UserMeta {
  const users = loadUsers();
  if (users[username]) return users[username];
  const meta: UserMeta = { username, joinDate: Date.now() };
  users[username] = meta;
  saveUsers(users);
  return meta;
}

// ── Main component ──────────────────────────────────────────────────

export default function AnnotationsPanel(): React.JSX.Element {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [votes, setVotes] = useState<Record<string, 'up' | 'down' | null>>({});
  const [toast, setToast] = useState('');
  const [activeView, setActiveView] = useState<'browse' | 'add' | 'admin'>('browse');
  const [userJoinDate, setUserJoinDate] = useState<number | null>(null);

  // Add form state
  const [endpointPath, setEndpointPath] = useState('/api/v1/');
  const [endpointMethod, setEndpointMethod] = useState('GET');
  const [annotationText, setAnnotationText] = useState('');
  const [annotationType, setAnnotationType] = useState<'tip' | 'gotcha' | 'note' | 'example'>('tip');
  const [textPreview, setTextPreview] = useState(false);

  // Browse filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterEndpoint, setFilterEndpoint] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');
  const [showArchived, setShowArchived] = useState(false);
  const [sortBy, setSortBy] = useState<string>('score');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Flag reason state
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagReasonInput, setFlagReasonInput] = useState('');

  const flagPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAnnotations(loadAnnotations());
    const savedUser = loadUsername();
    setUsername(savedUser);
    setVotes(loadVotes());
    if (savedUser) {
      const meta = getOrCreateUser(savedUser);
      setUserJoinDate(meta.joinDate);
    }
  }, []);

  // Close flag popover on outside click
  useEffect(() => {
    if (!flaggingId) return;
    const handler = (e: MouseEvent) => {
      if (flagPopoverRef.current && !flagPopoverRef.current.contains(e.target as Node)) {
        setFlaggingId(null);
        setFlagReasonInput('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [flaggingId]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  }, []);

  const handleLogin = useCallback(() => {
    const name = usernameInput.trim();
    if (!name) return;
    setUsername(name);
    saveUsername(name);
    const meta = getOrCreateUser(name);
    setUserJoinDate(meta.joinDate);
    showToast(`Welcome, ${name}!`);
  }, [usernameInput, showToast]);

  const handleLogout = useCallback(() => {
    setUsername('');
    setUserJoinDate(null);
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

  const openFlagPopover = useCallback((annotationId: string) => {
    setFlaggingId(annotationId);
    setFlagReasonInput('');
  }, []);

  const handleFlagSubmit = useCallback(
    (annotationId: string) => {
      const updated = annotations.map((a) =>
        a.id === annotationId ? { ...a, flagged: !a.flagged, flagReason: a.flagged ? undefined : flagReasonInput || 'Unspecified' } : a
      );
      setAnnotations(updated);
      saveAnnotations(updated);
      showToast(updated.find((a) => a.id === annotationId)?.flagged ? 'Annotation flagged for review' : 'Flag cleared');
      setFlaggingId(null);
      setFlagReasonInput('');
    },
    [annotations, flagReasonInput, showToast]
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
        updated = updated.map((a) => (a.flagged ? { ...a, flagged: false, flagReason: undefined } : a));
      } else if (action === 'archive-flagged') {
        updated = updated.map((a) => (a.flagged ? { ...a, archived: true, flagged: false, flagReason: undefined } : a));
      }
      setAnnotations(updated);
      saveAnnotations(updated);
      showToast('Moderation action applied');
    },
    [annotations, showToast]
  );

  const clearDateFilters = useCallback(() => {
    setDateFrom('');
    setDateTo('');
  }, []);

  const filteredAnnotations = useMemo(() => {
    let filtered = annotations.filter((a) => (showArchived ? true : !a.archived));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.text.toLowerCase().includes(q) ||
          a.endpointPath.toLowerCase().includes(q) ||
          a.author.toLowerCase().includes(q) ||
          (a.flagReason && a.flagReason.toLowerCase().includes(q))
      );
    }
    if (filterType !== 'all') {
      filtered = filtered.filter((a) => a.type === filterType);
    }
    if (filterEndpoint) {
      filtered = filtered.filter((a) => a.endpointPath.includes(filterEndpoint));
    }
    if (filterMethod !== 'all') {
      filtered = filtered.filter((a) => a.endpointMethod === filterMethod);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      filtered = filtered.filter((a) => a.timestamp >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo).getTime() + 86400000; // end of day
      filtered = filtered.filter((a) => a.timestamp <= to);
    }

    // Sort
    filtered.sort((a, b) => {
      // Pinned always first
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      switch (sortBy) {
        case 'newest':
          return b.timestamp - a.timestamp;
        case 'oldest':
          return a.timestamp - b.timestamp;
        case 'controversial':
          // Most total votes
          const totalA = a.upvotes + a.downvotes;
          const totalB = b.upvotes + b.downvotes;
          if (totalB !== totalA) return totalB - totalA;
          return b.timestamp - a.timestamp;
        case 'score':
        default:
          const scoreA = a.upvotes - a.downvotes;
          const scoreB = b.upvotes - b.downvotes;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return b.timestamp - a.timestamp;
      }
    });

    return filtered;
  }, [annotations, searchQuery, filterType, filterEndpoint, filterMethod, showArchived, sortBy, dateFrom, dateTo]);

  // Admin stats
  const flagCount = annotations.filter((a) => a.flagged).length;
  const topContributors = useMemo(() => {
    const counts: Record<string, number> = {};
    annotations.forEach((a) => {
      counts[a.author] = (counts[a.author] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [annotations]);
  const totalVotes = annotations.reduce((sum, a) => sum + a.upvotes + a.downvotes, 0);
  const avgVotesPerAnnotation = annotations.length > 0 ? (totalVotes / annotations.length).toFixed(1) : '0';

  const userColor = username ? stringToColor(username) : '#6b7280';
  const userInitials = username ? getInitials(username) : '?';

  return (
    <div className="annotations-panel">
      <div className="annotations-header">
        <h2>💬 Community Annotations</h2>
        <p className="annotations-subtitle">
          Tips, gotchas, and notes from the community on API endpoints.
          {annotations.length > 0 && (
            <span className="annotations-header-stats">
              <span>{annotations.length} annotation{annotations.length !== 1 ? 's' : ''}</span>
              <span>·</span>
              <span>{new Set(annotations.map((a) => a.author)).size} contributor{new Set(annotations.map((a) => a.author)).size !== 1 ? 's' : ''}</span>
            </span>
          )}
        </p>
      </div>

      {toast && <div className="mock-toast">{toast}</div>}

      {/* User auth bar */}
      <div className="annotations-user-bar">
        {username ? (
          <div className="annotations-user-info">
            <div className="annotations-user-avatar-circle" style={{ backgroundColor: userColor }}>
              {userInitials}
            </div>
            <div className="annotations-user-details">
              <strong className="annotations-user-name">{username}</strong>
              {userJoinDate && (
                <span className="annotations-user-join-date">
                  Member since {new Date(userJoinDate).toLocaleDateString()}
                </span>
              )}
            </div>
            <button className="mock-btn mock-btn-ghost mock-btn-sm" onClick={handleLogout}>
              Logout
            </button>
          </div>
        ) : (
          <div className="annotations-login-row">
            <div className="annotations-login-avatar-placeholder">👤</div>
            <input
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="Enter username to participate..."
              className="mock-input annotations-username-input"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <button className="mock-btn mock-btn-primary mock-btn-sm" onClick={handleLogin}>
              Join &amp; Participate
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
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="mock-select annotations-filter-select"
            >
              <option value="all">All methods</option>
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mock-select annotations-filter-select"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div className="annotations-filters annotations-filters-row2">
            <input
              type="text"
              value={filterEndpoint}
              onChange={(e) => setFilterEndpoint(e.target.value)}
              placeholder="Filter by path..."
              className="mock-input annotations-filter-select"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="mock-input annotations-date-input"
              title="From date"
            />
            <span className="annotations-date-separator">–</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="mock-input annotations-date-input"
              title="To date"
            />
            {(dateFrom || dateTo) && (
              <button className="mock-btn mock-btn-ghost mock-btn-sm" onClick={clearDateFilters}>
                ✕ Clear
              </button>
            )}
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
            <div className="annotations-empty-state">
              <div className="annotations-empty-icon">💬</div>
              <h3>No annotations found</h3>
              <p>
                {annotations.length === 0
                  ? 'Be the first to share a tip, gotcha, or note about an API endpoint!'
                  : 'Try adjusting your filters or search query.'}
              </p>
              {annotations.length === 0 && (
                <button className="mock-btn mock-btn-primary" onClick={() => setActiveView('add')}>
                  ✏️ Add the first annotation
                </button>
              )}
            </div>
          ) : (
            <div className="annotations-list">
              {filteredAnnotations.map((a) => {
                const score = a.upvotes - a.downvotes;
                const scoreColor = getScoreColor(score);
                const helpfulness = getHelpfulnessPercent(a.upvotes, a.downvotes);

                return (
                  <div
                    key={a.id}
                    className={`annotation-card ${a.pinned ? 'annotation-pinned' : ''} ${a.flagged ? 'annotation-flagged' : ''}`}
                  >
                    <div className="annotation-card-top">
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

                      {/* Score pill */}
                      <div className="annotation-score-pill" style={{ borderColor: scoreColor, color: scoreColor }}>
                        <span className="annotation-score-value">{score > 0 ? '+' : ''}{score}</span>
                        {helpfulness !== null && (
                          <span className="annotation-score-helpful">{helpfulness}% helpful</span>
                        )}
                      </div>
                    </div>

                    <div className="annotation-text">
                      {renderMarkdown(a.text)}
                    </div>

                    <div className="annotation-footer">
                      <div className="annotation-meta">
                        <span className="annotation-author-avatar" style={{ backgroundColor: stringToColor(a.author) }}>
                          {getInitials(a.author)}
                        </span>
                        <span className="annotation-author-name">{a.author}</span>
                        <span className="annotation-date">{new Date(a.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="annotation-actions">
                        <div className="annotation-votes">
                          <button
                            className={`mock-btn mock-btn-sm annotation-vote-btn ${votes[a.id] === 'up' ? 'annotation-voted' : ''}`}
                            onClick={() => handleVote(a.id, 'up')}
                            title="Upvote — this is helpful"
                          >
                            👍 <span className="annotation-vote-count">{a.upvotes}</span>
                          </button>
                          <button
                            className={`mock-btn mock-btn-sm annotation-vote-btn ${votes[a.id] === 'down' ? 'annotation-voted-down' : ''}`}
                            onClick={() => handleVote(a.id, 'down')}
                            title="Downvote — not helpful"
                          >
                            👎 <span className="annotation-vote-count">{a.downvotes}</span>
                          </button>
                        </div>
                        <button
                          className="mock-btn mock-btn-sm mock-btn-ghost"
                          onClick={() => handlePin(a.id)}
                          title={a.pinned ? 'Unpin' : 'Pin this annotation'}
                        >
                          {a.pinned ? '📌 Unpin' : '📌 Pin'}
                        </button>
                        {a.flagged ? (
                          <button
                            className="mock-btn mock-btn-sm mock-btn-ghost"
                            onClick={() => handleFlagSubmit(a.id)}
                            title="Clear flag"
                          >
                            ✅ Resolve
                          </button>
                        ) : (
                          <div className="annotation-flag-wrapper" ref={flaggingId === a.id ? flagPopoverRef : undefined}>
                            <button
                              className="mock-btn mock-btn-sm mock-btn-ghost"
                              onClick={() => openFlagPopover(a.id)}
                              title="Flag for moderation"
                            >
                              🚩 Flag
                            </button>
                            {flaggingId === a.id && (
                              <div className="annotation-flag-popover">
                                <div className="annotation-flag-popover-header">Report annotation</div>
                                <div className="annotation-flag-reasons">
                                  {FLAG_REASONS.map((reason) => (
                                    <button
                                      key={reason}
                                      className={`annotation-flag-reason-chip ${flagReasonInput === reason ? 'active' : ''}`}
                                      onClick={() => setFlagReasonInput(flagReasonInput === reason ? '' : reason)}
                                    >
                                      {reason}
                                    </button>
                                  ))}
                                </div>
                                <input
                                  type="text"
                                  value={flagReasonInput}
                                  onChange={(e) => setFlagReasonInput(e.target.value)}
                                  placeholder="Or type a custom reason..."
                                  className="mock-input"
                                />
                                <div className="annotation-flag-actions">
                                  <button
                                    className="mock-btn mock-btn-sm mock-btn-danger"
                                    onClick={() => handleFlagSubmit(a.id)}
                                  >
                                    🚩 Submit Flag
                                  </button>
                                  <button
                                    className="mock-btn mock-btn-sm mock-btn-ghost"
                                    onClick={() => { setFlaggingId(null); setFlagReasonInput(''); }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                        <button
                          className="mock-btn mock-btn-sm mock-btn-ghost"
                          onClick={() => handleArchive(a.id)}
                          title={a.archived ? 'Restore' : 'Archive'}
                        >
                          {a.archived ? '📂 Restore' : '📦 Archive'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeView === 'add' && (
        <div className="annotations-add">
          <h3>✏️ Add New Annotation</h3>
          {!username ? (
            <div className="annotations-empty-state">
              <div className="annotations-empty-icon">👤</div>
              <h3>Login required</h3>
              <p>Please set a username above to share annotations with the community.</p>
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
                <label>
                  Your Annotation{' '}
                  <span className="mock-label-hint">— Markdown supported: **bold** *italic* `code` [links](url)</span>
                </label>
                <textarea
                  value={annotationText}
                  onChange={(e) => setAnnotationText(e.target.value)}
                  rows={5}
                  placeholder="Share a tip, gotcha, note, or example about this endpoint...&#10;&#10;**Tip:** Use markdown to format your annotation!"
                  className="mock-textarea"
                />
              </div>
              {annotationText.trim() && (
                <div className="mock-field">
                  <label className="mock-checkbox-label">
                    <input
                      type="checkbox"
                      checked={textPreview}
                      onChange={(e) => setTextPreview(e.target.checked)}
                    />
                    <span>Preview rendered markdown</span>
                  </label>
                  {textPreview && (
                    <div className="annotation-preview-box">
                      {renderMarkdown(annotationText)}
                    </div>
                  )}
                </div>
              )}
              <div className="mock-field">
                <label className="mock-label-hint" style={{ textTransform: 'none', fontWeight: 400 }}>
                  Posting as <strong style={{ color: userColor }}>{username}</strong>
                </label>
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
            <div className="annotations-stat-card">
              <span className="annotations-stat-value">{totalVotes}</span>
              <span className="annotations-stat-label">Total Votes</span>
            </div>
            <div className="annotations-stat-card">
              <span className="annotations-stat-value">{avgVotesPerAnnotation}</span>
              <span className="annotations-stat-label">Avg Votes/Post</span>
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

          {/* Top Contributors */}
          {topContributors.length > 0 && (
            <div className="annotations-admin-section">
              <h4>🏆 Top Contributors</h4>
              <div className="annotations-contributors-list">
                {topContributors.map(([author, count], idx) => (
                  <div key={author} className="annotations-contributor-card">
                    <span className="annotations-contributor-rank">#{idx + 1}</span>
                    <span
                      className="annotation-author-avatar"
                      style={{ backgroundColor: stringToColor(author) }}
                    >
                      {getInitials(author)}
                    </span>
                    <span className="annotations-contributor-name">{author}</span>
                    <span className="annotations-contributor-count">{count} annotation{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="annotations-admin-section">
            <h4>🚩 Flagged Annotations</h4>
            {annotations.filter((a) => a.flagged).length === 0 ? (
              <div className="annotations-empty-state">
                <div className="annotations-empty-icon">🎉</div>
                <p>No flagged annotations. All clear!</p>
              </div>
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
                        <span className="annotation-author-name">by {a.author}</span>
                        {a.flagReason && (
                          <span className="annotation-flag-reason-badge" title={`Reason: ${a.flagReason}`}>
                            🏷️ {a.flagReason}
                          </span>
                        )}
                      </div>
                      <div className="annotation-text">
                        {renderMarkdown(a.text)}
                      </div>
                      <div className="annotation-footer">
                        <div className="annotation-meta">
                          <span className="annotation-date">{new Date(a.timestamp).toLocaleString()}</span>
                          <span className="annotation-meta-votes">👍 {a.upvotes} 👎 {a.downvotes}</span>
                        </div>
                        <div className="annotation-actions">
                          <button className="mock-btn mock-btn-sm" onClick={() => handleFlagSubmit(a.id)}>
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
        </div>
      )}
    </div>
  );
}
