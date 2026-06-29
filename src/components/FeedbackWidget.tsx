import React, {useEffect, useState} from 'react';
import {useLocation} from '@docusaurus/router';

const ANALYTICS_URL =
  (typeof process !== 'undefined' && process.env.PROXYPAY_ANALYTICS_URL) ||
  'https://analytics.proxypay.io/feedback';

export default function FeedbackWidget(): JSX.Element {
  const {pathname} = useLocation();
  const storageKey = `proxypay_feedback_${pathname}`;

  const [submitted, setSubmitted] = useState<boolean>(false);
  const [vote, setVote] = useState<'up' | 'down' | null>(null);
  const [comment, setComment] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    try {
      const val = sessionStorage.getItem(storageKey);
      setSubmitted(!!val);
    } catch (e) {
      // ignore
    }
  }, [storageKey]);

  const sendFeedback = async (voteValue: 'up' | 'down', commentValue: string) => {
    if (submitted) return;
    setLoading(true);
    try {
      await fetch(ANALYTICS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: pathname, vote: voteValue, comment: commentValue }),
      });
      try {
        sessionStorage.setItem(storageKey, '1');
      } catch (e) {
        // ignore
      }
      setSubmitted(true);
    } catch (e) {
      // swallow network errors but keep the UX consistent
      console.error('Feedback submit failed', e);
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  const onVote = (v: 'up' | 'down') => {
    if (submitted) return;
    setVote(v);
    if (v === 'up') {
      sendFeedback('up', '');
    }
  };

  const onSubmit = () => {
    if (vote !== 'down') return;
    sendFeedback('down', comment);
  };

  return (
    <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid #e6e6e6' }}>
      {!submitted ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <strong>Was this helpful?</strong>
            <div>
              <button
                aria-label="thumbs-up"
                onClick={() => onVote('up')}
                disabled={!!submitted || loading}
                style={{ marginRight: 8 }}
              >
                👍
              </button>
              <button
                aria-label="thumbs-down"
                onClick={() => onVote('down')}
                disabled={!!submitted || loading}
              >
                👎
              </button>
            </div>
          </div>

          {vote === 'down' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <textarea
                placeholder="Tell us what we can improve (optional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                style={{ width: '100%', maxWidth: 720 }}
              />
              <div>
                <button onClick={onSubmit} disabled={loading}>
                  Submit
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          <strong>Thanks for your feedback!</strong>
        </div>
      )}
    </div>
  );
}
