# Feature Flag Management

This document covers how to add, configure, and deploy feature flags in the
ProxyPay API Documentation Portal.

---

## Overview

Feature flags let the team ship code to production without immediately exposing
it to all users. The flag system lives entirely in the browser — overrides are
stored in `localStorage` / `sessionStorage` with no backend dependency — which
makes it quick to iterate while keeping the portal statically deployable.

**Three override scopes** (higher beats lower):

| Scope | Storage | Lifetime | Use case |
|---|---|---|---|
| Session | `sessionStorage` | Tab close | Quick developer testing |
| User | `localStorage` keyed by user ID | Permanent | Beta users / early access |
| Global | `localStorage` | Permanent | Organisation-wide rollouts |

When no override is present the flag falls back to its registered default.

---

## Files

```
src/featureFlags/
  feature-flag-service.ts    — Core service + FLAG_REGISTRY
  flag-analytics.ts          — Event tracker (exposure / toggle / reset)
  FeatureFlagContext.tsx      — React context + useFeatureFlag hook
  index.ts                   — Barrel re-export
  __tests__/
    feature-flags.test.ts    — 30 self-contained tests

src/components/
  FeatureFlagSettings.tsx    — Full settings page UI
  FeatureFlagSettings.module.css
  FeatureFlagDebugPanel.tsx  — Floating debug overlay
  FeatureFlagDebugPanel.module.css

src/pages/
  settings.tsx               — /settings route (hosts the UI)
```

---

## Adding a New Flag

Edit `src/featureFlags/feature-flag-service.ts` and append an entry to
`FLAG_REGISTRY`:

```ts
{
  key: 'my-new-feature',          // kebab-case, unique
  name: 'My New Feature',         // shown in settings UI
  description: 'Short description visible to users.',
  defaultEnabled: false,          // safe default
  // allowlist: ['user-id-1'],    // optional early-access list
  // internal: true,              // hides from non-internal badge
}
```

That's it. The settings page, debug panel, and tests will all pick up the new
flag automatically.

**Naming conventions**

- Use `kebab-case` for keys.
- Prefix with a feature area when there are many flags (`payments-v2-checkout`,
  `logs-fulltext-search`).
- Avoid negation (`disable-old-flow`) — prefer positive names (`new-flow`).

---

## Using a Flag in a Component

### Option A — hook (recommended)

```tsx
import { useFeatureFlag } from '@site/src/featureFlags';

export function ApiExplorer() {
  const { isEnabled } = useFeatureFlag('new-api-explorer');

  if (!isEnabled) return <LegacyApiExplorer />;
  return <NewApiExplorer />;
}
```

### Option B — access all flags at once

```tsx
import { useFeatureFlags } from '@site/src/featureFlags';

export function NavBar() {
  const { isEnabled } = useFeatureFlags();

  return (
    <nav>
      {isEnabled('performance-benchmarks') && <BenchmarksLink />}
    </nav>
  );
}
```

Both hooks require the component to be rendered inside a
`<FeatureFlagProvider>`. If your page doesn't already include one, wrap the page
root (see [Provider setup](#provider-setup)).

---

## Provider Setup

The `/settings` page ships with its own provider. For other pages, add the
provider at the layout level or in the specific page that needs flag-gated
content:

```tsx
import { FeatureFlagProvider } from '@site/src/featureFlags';

export default function MyPage() {
  return (
    <FeatureFlagProvider userId={currentUser?.id}>
      <MyPageContent />
    </FeatureFlagProvider>
  );
}
```

`userId` is optional. Without it, user-scoped overrides cannot be set but
session and global overrides still work.

---

## Configuring Flags via the Settings UI

Navigate to `/settings` in the running portal.

1. **User ID** — enter a user ID to activate per-user overrides.
2. **Scope filter** — narrow the list to session, user, or global flags.
3. **Toggle** — the slider writes a **session** override (safest default).
4. **Set scope…** dropdown — write directly to session / user / global storage.
5. **Clear override** — removes the override and falls back to the next scope.
6. **Reset all overrides** — wipes all scopes simultaneously (confirmation
   required).

---

## Debug Panel

The floating 🚩 button (bottom-right) opens the debug panel. It is only
mounted when the `debug-panel` flag is enabled.

To enable it for your session:

1. Open `/settings`.
2. Find **Feature Flag Debug Panel** in the list.
3. Toggle it ON (or set scope to Session ON).

The panel has two tabs:

- **Flags** — shows every registered flag with its resolved value and scope.
  Overridden flags are highlighted.
- **Analytics** — shows an exposure / toggle / reset event summary and a
  timeline of recent events.

---

## Graduated Rollout Workflow

### Step 1 — Dark launch (no users)

Add the flag with `defaultEnabled: false`. Deploy. No user sees the feature.

### Step 2 — Internal testing

Enable via a session override on your own machine, or add your internal user ID
to `allowlist` in the flag definition for a permanent personal preview.

### Step 3 — Beta rollout

Use the settings page or the `FeatureFlagService.setUserFlag` API to enable the
flag for a known set of beta user IDs.

```ts
const svc = FeatureFlagService.getInstance();
const betaUsers = ['user-101', 'user-202', 'user-303'];
betaUsers.forEach((uid) => svc.setUserFlag('new-api-explorer', true, uid));
```

Because overrides are stored client-side, this needs to run in the browser for
each beta user (e.g., on login). For a server-side list, embed the allowed IDs
in the `allowlist` field in the registry.

### Step 4 — Full rollout

Set a global override to `true`:

```ts
FeatureFlagService.getInstance().setGlobalFlag('new-api-explorer', true);
```

Or change `defaultEnabled` to `true` in the registry and deploy.

### Step 5 — Cleanup

Once stable, remove the flag guard from the component code and delete the entry
from `FLAG_REGISTRY`. Running `npm test` will confirm no tests reference the
removed key.

---

## Programmatic API

```ts
import { FeatureFlagService } from '@site/src/featureFlags';

const svc = FeatureFlagService.getInstance();

// Check
svc.isEnabled('new-api-explorer');               // uses default
svc.isEnabled('new-api-explorer', 'user-42');    // per-user resolution

// Inspect full state
svc.resolve('new-api-explorer', 'user-42');
// → { key, enabled, scope: 'user' | 'session' | 'global', lastModified }

// All flags
svc.getAllFlags('user-42');

// Write overrides
svc.setSessionFlag('new-api-explorer', true);
svc.setUserFlag('new-api-explorer', true, 'user-42');
svc.setGlobalFlag('new-api-explorer', true);

// Clear overrides
svc.clearSessionFlag('new-api-explorer');
svc.clearUserFlag('new-api-explorer', 'user-42');
svc.clearGlobalFlag('new-api-explorer');

// Nuclear option
svc.resetAll('user-42');
```

---

## Analytics

Flag events are stored in `localStorage` under `proxypay-feature-flag-analytics`
and capped at 500 entries.

```ts
import { FlagAnalyticsTracker } from '@site/src/featureFlags';

const tracker = FlagAnalyticsTracker.getInstance();

// All raw events
tracker.getEvents();

// Aggregated summary
const summary = tracker.getSummary();
// summary.totalEvents, .exposures, .toggles, .resets
// summary.topFlags   — sorted by exposure count
// summary.recentEvents — last 20 events, newest first

// Clear (useful in tests or on sign-out)
tracker.clearEvents();
```

**Exposure deduplication** — each flag is recorded at most once per browser
session regardless of how many times `isEnabled` is called. This prevents
analytics noise without losing signal.

---

## Running Tests

```bash
# Feature flag tests only
npm run test:flags

# Full test suite
npm test
```

Tests are self-contained (no module imports) and run with `ts-node
--transpile-only`. They cover 30 scenarios across the service and analytics
tracker, including override precedence, allowlist, reset, and deduplication.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Flag shows wrong value in component | No `<FeatureFlagProvider>` above the component | Add a provider to the page or layout |
| User-scoped overrides not persisting | `userId` not passed to the provider | Pass `userId={currentUser.id}` |
| Debug panel not visible | `debug-panel` flag is OFF | Enable it in `/settings` |
| Analytics events not recording | `FlagAnalyticsTracker` not called after `isEnabled` | Use `useFeatureFlag` or `useFeatureFlags` — they call the tracker automatically |
| Old flag value stuck after code change | Session or localStorage override | Clear overrides via `/settings` → Reset all |
