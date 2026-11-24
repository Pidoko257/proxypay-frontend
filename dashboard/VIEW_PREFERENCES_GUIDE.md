# View Preferences Implementation

## Overview

The view preferences system provides persistent storage for dashboard table preferences including sort order, page size, and column visibility. Preferences are stored in localStorage with versioned keys and comprehensive validation.

## Features

✅ **Persistent Storage**: Sort order and page size persist across page reloads  
✅ **Versioned Keys**: Using `viewPrefs:v1` to support future migrations  
✅ **Validation**: Strict schema validation with corruption recovery  
✅ **UI Controls**: Settings panel for column visibility, reset button  
✅ **Accessibility**: Full keyboard support, ARIA labels, focus management  
✅ **Error Handling**: Graceful degradation on localStorage failures  

## Architecture

### Store: `viewPreferencesStore.ts`

Zustand-based store with the following methods:

```typescript
// Core actions
setSortColumn(column: string | null): void
setSortDirection(direction: 'asc' | 'desc'): void
setPageSize(size: number): void         // 1-1000
toggleColumnVisibility(column: key): void
setColumnVisibility(column: key, visible: boolean): void
resetToDefaults(): void
hydrate(): void                         // Explicit hydration

// State
preferences: ViewPreferences            // Current preferences
isHydrated: boolean                     // Hydration status
```

### Persisted Data Structure

```typescript
interface ViewPreferences {
  sortColumn: string | null             // Column key or null
  sortDirection: 'asc' | 'desc'         // Sort direction
  pageSize: number                      // 1-1000, default 25
  visibleColumns: {                     // Column visibility map
    reference: boolean
    amount: boolean
    status: boolean
    provider: boolean
    timestamp: boolean
    actions: boolean
  }
}
```

### Storage Details

- **Key**: `viewPrefs:v1`
- **Location**: localStorage
- **Validation**: Strict schema validation on read
- **Default Recovery**: Returns defaults if corruption detected
- **Error Handling**: Silently fails on quota exceeded or private mode

## Integration Points

### TransactionsTable Component

The table now:
1. Loads sort preferences on mount
2. Persists sort changes automatically
3. Displays a "Reset View" button
4. Displays a Settings icon to open preferences panel

### ViewPreferencesPanel Component

A modal dialog that allows users to:
1. Toggle column visibility
2. Reset all preferences to defaults
3. Keyboard navigation (Escape to close)

## Testing

All 36 tests pass including:

- ✅ Persistence and loading
- ✅ Validation and type checking
- ✅ Corruption recovery
- ✅ localStorage failure handling
- ✅ Rapid state updates
- ✅ Versioning

Run tests:
```bash
npm test -- src/stores/__tests__/viewPreferencesStore.test.ts
```

## Manual Testing Checklist

To verify the implementation manually:

1. **Sort Persistence**:
   - Open the dashboard
   - Click a column header to sort (e.g., Amount descending)
   - Reload the page
   - ✅ The sort should be preserved

2. **Reset Functionality**:
   - Click the "Reset View" button
   - ✅ Sort should reset to default (null, ascending)
   - Reload the page
   - ✅ Should remain reset

3. **Column Visibility**:
   - Click the Settings (gear) icon
   - Toggle a column off/on
   - Click "Done"
   - Reload the page
   - ✅ Column visibility should persist

4. **Edge Cases**:
   - Open localStorage in DevTools
   - Modify `viewPrefs:v1` with invalid data
   - Reload the page
   - ✅ Should recover with defaults
   - Delete `viewPrefs:v1` key
   - Reload the page
   - ✅ Should use defaults

## Files Modified/Created

**Created:**
- `src/stores/viewPreferencesStore.ts` - Zustand store with persistence
- `src/stores/__tests__/viewPreferencesStore.test.ts` - 36 comprehensive tests
- `src/components/ViewPreferencesPanel.tsx` - Settings modal component
- `src/styles/ViewPreferencesPanel.css` - Modal styling

**Modified:**
- `src/components/TransactionsTable.tsx` - Integrated store and UI
- `src/styles/TransactionsTable.css` - Added button styling

## Browser Compatibility

Works in all modern browsers supporting:
- localStorage API
- ES2020+ features
- CSS Grid/Flexbox

Falls back gracefully in:
- Private browsing mode
- Storage quota exceeded
- Disabled localStorage
