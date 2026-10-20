# Race Condition Handling for Notification Updates

## Overview

This implementation solves race conditions that occur when users make rapid changes to multiple notification channel settings. The solution uses **request versioning**, **update serialization per event type**, and **optimistic UI updates** with rollback support.

## Problem Solved

**Race Condition Scenario:**
- User toggles email notifications for "payment.settled" (Request A)
- User quickly toggles webhook notifications for "payment.settled" (Request B)
- Request B response arrives before Request A
- UI shows state from Request B, but then Request A overwrites it with stale data
- Server has state from Request A, but UI shows state from Request B
- Result: Inconsistent state between client and server

## Solution Architecture

### 1. Enhanced Notification Store
**File:** `/workspaces/proxypay-frontend/dashboard/src/stores/notificationStore.ts`

#### Key Features:

**Request Versioning**
- Each event type maintains its own version counter
- When a new update is issued, version increments
- Responses are only accepted if they match the latest version
- Stale responses (from older versions) are silently discarded

```typescript
requestVersions: Map<string, number>  // Track latest version per event type
_getNextVersion(eventType: string)    // Increment and get next version
_isUpdateStale(eventType: string, version: number)  // Check if response is stale
```

**Update Serialization**
- Updates for the same event type are queued and processed sequentially
- Only one API request per event type is in flight at any time
- Different event types can update concurrently (no global lock)

```typescript
updateQueues: Map<string, PendingUpdateState>
// Queue structure prevents concurrent requests for same event type
```

**Optimistic Updates**
- UI updates immediately when user takes action (responsive feel)
- Shows visual indicators (styling/disabled state) during pending updates
- Automatically reverts on failure

```typescript
optimisticUpdates: Map<string, NotificationSettings>
// Tracks which settings are awaiting server confirmation
```

### 2. Update Flow

```
User Action
    ↓
1. Get/create queue for event type
2. Queue the update
3. If queue not processing, start processing
    ↓
For each queued update:
4. Get next version number → Version N
5. Apply optimistic UI update
6. Mark as "in progress" (pending request)
7. Send API request
    ↓
On Response:
8. Check if Version N == Latest Version
   ├─ YES: Accept response, update UI, clear optimistic marker
   └─ NO: Discard response (newer version exists)
    ↓
Process next queued update (repeat 4-8)
```

### 3. UI Hooks for Control Management
**File:** `/workspaces/proxypay-frontend/dashboard/src/hooks/useNotificationUpdateState.ts`

#### Three Main Hooks:

**`useNotificationUpdateState(eventType)`**
- Returns: `{ isUpdating, isOptimistic, canUpdate, queuedUpdatesCount }`
- Use to disable controls during updates
- Per-event-type granularity (only conflicting controls are disabled)

```typescript
const { isUpdating, canUpdate } = useNotificationUpdateState('payment.settled')

<button disabled={!canUpdate}>
  {isUpdating ? 'Updating...' : 'Save'}
</button>
```

**`useMultipleNotificationUpdateStates(eventTypes)`**
- Returns array of states for multiple event types
- Useful for form-like UIs managing multiple settings

**`useNotificationSettingUpdater(eventType)`**
- Returns:
  - `updateEmailSetting(enabled)` - Update only email
  - `updateWebhookSetting(enabled)` - Update only webhook
  - `updateBothSettings(email, webhook)` - Update both
  - `updateState` - Current state object
  - `error` - Last error message
  - `clearError()` - Clear error

```typescript
const { updateEmailSetting, isUpdating, error } = 
  useNotificationSettingUpdater('payment.settled')

<button 
  disabled={isUpdating} 
  onClick={() => updateEmailSetting(true)}
>
  Enable Email
</button>
```

## Test Coverage

### Store Tests: 12/12 Passing ✓
**File:** `/workspaces/proxypay-frontend/dashboard/src/stores/__tests__/notificationStore.test.ts`

**Test Categories:**

1. **Request Serialization (2 tests)**
   - ✓ Same event type updates serialize correctly
   - ✓ Different event type updates process concurrently

2. **Version Tracking (3 tests)**
   - ✓ Uses latest version to track responses
   - ✓ Tracks versions independently per event type
   - ✓ Identifies stale updates correctly

3. **Optimistic Updates (2 tests)**
   - ✓ Applies optimistic update immediately
   - ✓ Rolls back on API failure

4. **Queue Management (3 tests)**
   - ✓ Processes queued updates sequentially
   - ✓ Handles failures without blocking queue
   - ✓ Processes concurrent event type updates

5. **Basic Functionality (2 tests)**
   - ✓ Loads settings correctly
   - ✓ Clears error state

### Hook Tests: 8/8 Passing ✓
**File:** `/workspaces/proxypay-frontend/dashboard/src/hooks/__tests__/useNotificationUpdateState.test.ts`

**Test Coverage:**

1. **useNotificationUpdateState**
   - ✓ Returns correct state when no updates in progress
   - ✓ Detects optimistic updates
   - ✓ Detects pending requests
   - ✓ Detects queued updates
   - ✓ Distinguishes between different event types

2. **useMultipleNotificationUpdateStates**
   - ✓ Returns states for all requested event types

3. **useNotificationSettingUpdater**
   - ✓ Provides callbacks for updating settings
   - ✓ Clears error via clearError callback

## Key Characteristics

### Race Condition Immunity
✓ Serialization prevents concurrent requests for the same resource
✓ Version tracking discards out-of-order responses
✓ Optimistic updates maintain responsive UI during network delays
✓ Automatic rollback on failure keeps state consistent

### Performance
✓ Updates for different event types process concurrently (no global lock)
✓ UI updates immediately (optimistic updates)
✓ Per-event-type granularity means only conflicting controls are disabled
✓ Minimal overhead: version tracking is just incrementing counters

### User Experience
✓ Responsive: UI updates before server confirmation
✓ Clear Feedback: Disabled states and loading indicators during updates
✓ Reliable: Automatic rollback if something fails
✓ No Inconsistency: Version tracking guarantees final state matches user's last action

## Usage Example

### Complete Notification Settings Component

```typescript
import React from 'react'
import { useNotificationSettingUpdater } from '../hooks/useNotificationUpdateState'

export const NotificationSettingRow: React.FC<{ eventType: string }> = ({ 
  eventType 
}) => {
  const {
    updateEmailSetting,
    updateWebhookSetting,
    updateState,
    error,
    clearError,
  } = useNotificationSettingUpdater(eventType)

  return (
    <div className="setting-row">
      <label>{eventType}</label>
      
      <button
        disabled={updateState.isUpdating}
        onClick={() => updateEmailSetting(true)}
        className={updateState.isOptimistic ? 'optimistic' : ''}
      >
        {updateState.isUpdating ? 'Updating...' : 'Enable Email'}
      </button>
      
      <button
        disabled={updateState.isUpdating}
        onClick={() => updateWebhookSetting(true)}
        className={updateState.isOptimistic ? 'optimistic' : ''}
      >
        {updateState.isUpdating ? 'Updating...' : 'Enable Webhook'}
      </button>

      {error && (
        <div className="error">
          {error}
          <button onClick={clearError}>Dismiss</button>
        </div>
      )}
    </div>
  )
}
```

## Files Created/Modified

### New Files:
1. `/workspaces/proxypay-frontend/dashboard/src/stores/notificationStore.ts` (306 lines)
2. `/workspaces/proxypay-frontend/dashboard/src/stores/__tests__/notificationStore.test.ts` (356 lines)
3. `/workspaces/proxypay-frontend/dashboard/src/hooks/useNotificationUpdateState.ts` (173 lines)
4. `/workspaces/proxypay-frontend/dashboard/src/hooks/__tests__/useNotificationUpdateState.test.ts` (172 lines)

### Total: ~1,000 lines of production code and comprehensive tests

## Testing

Run tests for the implementation:
```bash
cd /workspaces/proxypay-frontend/dashboard
npm test -- src/stores/__tests__/notificationStore.test.ts src/hooks/__tests__/useNotificationUpdateState.test.ts
```

Results: **20/20 Tests Passing** ✓

## Benefits

1. **No Race Conditions**: Version tracking + serialization eliminates data inconsistency
2. **Better UX**: Optimistic updates provide instant feedback
3. **Reliable**: Automatic rollback on errors
4. **Performant**: Concurrent updates for different event types
5. **Fine-Grained Control**: Per-event-type disabled states
6. **Testable**: Comprehensive test suite covering edge cases
7. **Maintainable**: Clear separation of concerns (store, hooks, UI)
