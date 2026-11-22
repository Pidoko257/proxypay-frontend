import { useFeatureFlagStore } from '../stores/featureFlagStore'
import '../styles/FeatureFlagSettings.css'

export const FeatureFlagSettings = () => {
  const flags = useFeatureFlagStore((state) => state.flags)
  const setEnabled = useFeatureFlagStore((state) => state.setEnabled)
  const setScope = useFeatureFlagStore((state) => state.setScope)
  const activeFlags = flags.filter((flag) => flag.enabled)

  return (
    <section className="feature-flags-page" aria-labelledby="feature-flags-title">
      <header className="settings-header">
        <h1 id="feature-flags-title">Feature Flags</h1>
        <p>Configure staged features for this user or the current browser session.</p>
      </header>
      <div className="feature-flag-list">
        {flags.map((flag) => (
          <article className="feature-flag-row" key={flag.key}>
            <div className="feature-flag-copy">
              <h2>{flag.key}</h2>
              <p>{flag.description}</p>
            </div>
            <label className="feature-flag-setting">
              <span>Scope</span>
              <select
                aria-label={`Scope for ${flag.key}`}
                value={flag.scope}
                onChange={(event) => setScope(flag.key, event.target.value as 'user' | 'session')}
              >
                <option value="user">User</option>
                <option value="session">Session</option>
              </select>
            </label>
            <label className="feature-flag-toggle">
              <input
                type="checkbox"
                checked={flag.enabled}
                onChange={(event) => setEnabled(flag.key, event.target.checked)}
                aria-label={`Enable ${flag.key}`}
              />
              <span>{flag.enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
          </article>
        ))}
      </div>
      <section className="flag-debug-panel" aria-labelledby="flag-debug-title">
        <div className="debug-panel-heading">
          <h2 id="flag-debug-title">Active flags</h2>
          <span>{activeFlags.length} active</span>
        </div>
        {activeFlags.length ? (
          <ul>
            {activeFlags.map((flag) => <li key={flag.key}><code>{flag.key}</code><span>{flag.scope}</span></li>)}
          </ul>
        ) : <p>No flags are active.</p>}
      </section>
    </section>
  )
}