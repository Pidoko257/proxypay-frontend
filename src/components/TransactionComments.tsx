/**
 * TransactionComments — Issue #634
 *
 * Displays and manages comments/annotations for a specific transaction.
 * Supports @mentions, basic markdown formatting, and editing/deleting
 * own comments. Data is persisted in localStorage.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { sanitizeAnnotationText } from '../utils/sanitize';

// ---------- types ----------

interface TxComment {
  id: string;
  transactionId: string;
  author: string;
  text: string;
  timestamp: number;
  editedAt?: number;
}

interface TransactionCommentsProps {
  transactionId: string;
}

// ---------- constants ----------

const COMMENTS_KEY_PREFIX = 'proxypay-tx-comments-';
const TX_USERNAME_KEY = 'proxypay-tx-username';

// ---------- helpers ----------

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function loadComments(transactionId: string): TxComment[] {
  try {
    const raw = localStorage.getItem(COMMENTS_KEY_PREFIX + transactionId);
    return raw ? (JSON.parse(raw) as TxComment[]) : [];
  } catch {
    return [];
  }
}

function saveComments(transactionId: string, comments: TxComment[]): void {
  try {
    localStorage.setItem(
      COMMENTS_KEY_PREFIX + transactionId,
      JSON.stringify(comments),
    );
  } catch {
    // storage unavailable — silently continue
  }
}

function loadTxUsername(): string {
  try {
    return localStorage.getItem(TX_USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveTxUsername(name: string): void {
  try {
    localStorage.setItem(TX_USERNAME_KEY, name);
  } catch {
    // silently continue
  }
}

function formatTimestamp(ts: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

/**
 * Renders comment text with:
 * - **bold** → <strong>
 * - *italic* → <em>
 * - `code` → <code>
 * - @mention → <strong className="tx-comments-mention">
 *
 * NOTE: text has already been sanitized (HTML entities escaped) before this
 * function is called, so it is safe to use React children directly.
 */
function renderCommentText(text: string): React.ReactNode[] {
  // Split on markdown tokens and @mentions
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|@[a-zA-Z0-9][a-zA-Z0-9._-]{1,31})/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={idx}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={idx} className="tx-comments-inline-code">{part.slice(1, -1)}</code>;
    }
    if (/^@[a-zA-Z0-9][a-zA-Z0-9._-]{1,31}$/.test(part)) {
      return (
        <strong key={idx} className="tx-comments-mention">
          {part}
        </strong>
      );
    }
    return part;
  });
}

// ---------- component ----------

export default function TransactionComments({
  transactionId,
}: TransactionCommentsProps): React.JSX.Element {
  const [comments, setComments] = useState<TxComment[]>([]);
  const [username, setUsername] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [toast, setToast] = useState('');

  // Load data from localStorage on mount
  useEffect(() => {
    setComments(loadComments(transactionId));
    setUsername(loadTxUsername());
  }, [transactionId]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    const timer = setTimeout(() => setToast(''), 3500);
    return () => clearTimeout(timer);
  }, []);

  // ---------- username setup ----------

  const handleSetUsername = useCallback(() => {
    const trimmed = sanitizeAnnotationText(usernameInput).trim();
    if (!trimmed) return;
    saveTxUsername(trimmed);
    setUsername(trimmed);
    setUsernameInput('');
  }, [usernameInput]);

  // ---------- add comment ----------

  const handleAddComment = useCallback(() => {
    const trimmed = sanitizeAnnotationText(commentInput).trim();
    if (!trimmed || !username) return;
    const newComment: TxComment = {
      id: generateId(),
      transactionId,
      author: username,
      text: trimmed,
      timestamp: Date.now(),
    };
    const updated = [...comments, newComment];
    setComments(updated);
    saveComments(transactionId, updated);
    setCommentInput('');
    showToast('Comment added.');
  }, [commentInput, comments, transactionId, username, showToast]);

  // ---------- edit comment ----------

  const handleStartEdit = useCallback((comment: TxComment) => {
    setEditingId(comment.id);
    setEditText(comment.text);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = sanitizeAnnotationText(editText).trim();
    if (!trimmed) return;
    const updated = comments.map((c) =>
      c.id === editingId ? { ...c, text: trimmed, editedAt: Date.now() } : c,
    );
    setComments(updated);
    saveComments(transactionId, updated);
    setEditingId(null);
    setEditText('');
    showToast('Comment updated.');
  }, [editingId, editText, comments, transactionId, showToast]);

  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  // ---------- delete comment ----------

  const handleDelete = useCallback(
    (id: string) => {
      const updated = comments.filter((c) => c.id !== id);
      setComments(updated);
      saveComments(transactionId, updated);
      showToast('Comment deleted.');
    },
    [comments, transactionId, showToast],
  );

  // ---------- render ----------

  if (!username) {
    return (
      <div className="tx-comments-setup">
        <p className="tx-comments-setup-label">
          Choose a display name to post comments:
        </p>
        <div className="tx-comments-setup-row">
          <input
            className="tx-comments-input"
            type="text"
            placeholder="Your display name"
            value={usernameInput}
            onChange={(e) => setUsernameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSetUsername()}
            maxLength={40}
            aria-label="Display name"
          />
          <button
            className="tx-comments-btn tx-comments-btn--primary"
            onClick={handleSetUsername}
            disabled={!usernameInput.trim()}
          >
            Set Name
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tx-comments-container">
      {toast && (
        <div className="tx-comments-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      <p className="tx-comments-identity">
        Commenting as <strong>{username}</strong>{' '}
        <button
          className="tx-comments-btn-link"
          onClick={() => {
            saveTxUsername('');
            setUsername('');
          }}
        >
          (change)
        </button>
      </p>

      {/* Comment input */}
      <div className="tx-comments-compose">
        <textarea
          className="tx-comments-textarea"
          placeholder={`Add a comment for ${transactionId}… Use @username, **bold**, *italic*, \`code\``}
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          rows={3}
          maxLength={1000}
          aria-label="New comment"
        />
        <div className="tx-comments-compose-actions">
          <button
            className="tx-comments-btn tx-comments-btn--primary"
            onClick={handleAddComment}
            disabled={!commentInput.trim()}
          >
            Post Comment
          </button>
        </div>
      </div>

      {/* Comment list */}
      <div className="tx-comments-list" aria-label={`Comments for ${transactionId}`}>
        {comments.length === 0 && (
          <p className="tx-comments-empty">No comments yet. Be the first!</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="tx-comments-item">
            <div className="tx-comments-item-header">
              <span className="tx-comments-author">{comment.author}</span>
              <span className="tx-comments-timestamp">
                {formatTimestamp(comment.timestamp)}
                {comment.editedAt && (
                  <em className="tx-comments-edited"> (edited)</em>
                )}
              </span>
            </div>

            {editingId === comment.id ? (
              <div className="tx-comments-edit-form">
                <textarea
                  className="tx-comments-textarea"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  aria-label="Edit comment"
                />
                <div className="tx-comments-compose-actions">
                  <button
                    className="tx-comments-btn tx-comments-btn--primary"
                    onClick={handleSaveEdit}
                    disabled={!editText.trim()}
                  >
                    Save
                  </button>
                  <button
                    className="tx-comments-btn tx-comments-btn--secondary"
                    onClick={handleCancelEdit}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="tx-comments-text">
                {renderCommentText(comment.text)}
              </p>
            )}

            {comment.author === username && editingId !== comment.id && (
              <div className="tx-comments-item-actions">
                <button
                  className="tx-comments-btn-link"
                  onClick={() => handleStartEdit(comment)}
                  aria-label={`Edit comment by ${comment.author}`}
                >
                  Edit
                </button>
                <button
                  className="tx-comments-btn-link tx-comments-btn-link--danger"
                  onClick={() => handleDelete(comment.id)}
                  aria-label={`Delete comment by ${comment.author}`}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
