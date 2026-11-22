# View Preferences Guide

This guide documents the view preferences persistence functionality for the dashboard.

## Overview

View preferences (sort column, sort direction, column visibility) are persisted to localStorage and restored on page reload to maintain user configuration across sessions.

## Storage

| Property | Value |
|----------|-------|
| Storage Key | `dashboard_view_preferences_v1` |
| Storage Mechanism | localStorage |
| Versioning | Key includes version suffix (`v1`) for migration support |

## Persisted Preferences

| Preference | Type | Default | Description |
|------------|------|---------|-------------|
| `sortColumn` | string \| null | `null` | Currently sorted column ID |
| `sortDirection` | `'asc' \| 'desc'` | `'desc'` | Sort direction |
| `visibleColumns` | string[] | All columns | Array of visible column IDs |

## Hydration & Validation

On application startup, `hydrate()` reads from localStorage and validates the stored data:

1. **Parsing**: JSON.parse() the stored value
2. **Schema Validation**: Verify all required fields exist and have correct types
3. **Column Existence Check**: Verify `sortColumn` matches an existing column in the current schema
4. **Fallback**: If validation fails at any step, preferences reset to `defaultPreferences`

### Reset Behavior

> **Important**: Preferences reset to defaults if stored data fails validation.
> This commonly occurs when:
> - A column referenced by `sortColumn` is removed or renamed in a code update
> - localStorage data is corrupted or manually edited
> - The storage schema version is incremented (see Migration Path below)

When reset occurs:
- `sortColumn` → `null`
- `sortDirection` → `'desc'`
- `visibleColumns` → All columns visible

## Migration Path

To migrate preferences after a breaking schema change:

1. Increment the version suffix in `STORAGE_KEY`:
   ```typescript
   const STORAGE_KEY = 'dashboard_view_preferences_v2'  // was v1
   ```

2. The new version key will have no stored data, so `hydrate()` will initialize with `defaultPreferences`

3. Users will reconfigure their preferences, which are then saved under the new key

4. Optionally, implement a migration function in `hydrate()` to transform v1 data to v2:
   ```typescript
   const migrate = (v1Data: unknown): ViewPreferences => {
     // Transform old column IDs to new ones
     // Return valid ViewPreferences object
   }
   ```

## Implementation

The persistence logic is implemented in `dashboard/src/stores/viewPreferencesStore.ts` (when available). The store uses Zustand with a custom `persist` middleware that:

- Writes to localStorage on every state change
- Reads and validates on initialization
- Provides `reset()` to clear preferences and return to defaults

## Testing

To test reset behavior:

1. Set a valid `sortColumn` in localStorage
2. Reload - preferences should persist
3. Modify localStorage to reference a non-existent column
4. Reload - preferences should reset to defaults
5. Verify UI reflects default sort state