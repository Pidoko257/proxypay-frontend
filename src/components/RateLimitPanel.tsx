import React, { useEffect, useState } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

function Panel() {
  const { useRateLimit } = require('../hooks/useRateLimit');
  const { limit, remaining, resetAt } = useRateLimit();
  const [open, setOpen] = useState(false);
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!resetAt) { setCountdown(null); return; }
    function tick() {
      const secs = Math.max(0, Math.round((resetAt!.getTime() - Date.now()) / 1000));
      if (secs === 0) { setCountdown('now'); return; }
      const m = Math.floor(secs / 60), s = secs % 60;
      setCountdown(m > 0 ? `${m}m ${s}s` : `${s}s`);
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [resetAt]);

  const hasData = limit !== null;
  const exhausted = hasData && remaining === 0;
  const pct = hasData && limit! > 0 ? Math.round((remaining! / limit!) * 100) : null;

  return (
    <div className={`rl-panel${open ? ' rl-panel--open' : ''}`}>
      <button
        className={`rl-panel__tab${exhausted ? ' rl-panel__tab--exhausted' : ''}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Rate limit status"
      >
        {exhausted ? '⛔' : '📊'} Rate Limit
        {hasData && <span className="rl-panel__badge">{remaining}/{limit}</span>}
      </button>

      {open && (
        <div className="rl-panel__body" role="status">
          {!hasData ? (
            <p className="rl-panel__empty">No API calls made yet.</p>
          ) : (
            <>
              <div className="rl-panel__row">
                <span>Remaining</span>
                <strong className={exhausted ? 'rl-panel__val--warn' : ''}>{remaining}</strong>
              </div>
              <div className="rl-panel__row">
                <span>Limit</span>
                <strong>{limit}</strong>
              </div>
              {pct !== null && (
                <div className="rl-panel__bar-wrap" aria-label={`${pct}% remaining`}>
                  <div
                    className={`rl-panel__bar${exhausted ? ' rl-panel__bar--empty' : ''}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              )}
              {countdown !== null && (
                <div className="rl-panel__row">
                  <span>Resets in</span>
                  <strong>{countdown}</strong>
                </div>
              )}
              {resetAt && (
                <div className="rl-panel__row">
                  <span>Reset at</span>
                  <span className="rl-panel__time">{resetAt.toLocaleTimeString()}</span>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function RateLimitPanel(): React.JSX.Element {
  return (
    <BrowserOnly fallback={null}>
      {() => <Panel />}
    </BrowserOnly>
  );
}
