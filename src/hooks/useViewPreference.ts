import { useEffect, useState } from 'react';

const VIEW_PREFERENCE_KEY = 'api_view_preference';

export type ViewMode = 'card' | 'detailed';

/**
 * Hook to manage API reference view preference with localStorage persistence
 */
export function useViewPreference(defaultMode: ViewMode = 'detailed'): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_PREFERENCE_KEY);
      if (saved === 'card' || saved === 'detailed') {
        setViewModeState(saved);
      }
    } catch (e) {
      // localStorage might be unavailable in SSR context
      console.warn('localStorage unavailable:', e);
    }
    setIsHydrated(true);
  }, []);

  // Save to localStorage when changed
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_PREFERENCE_KEY, mode);
    } catch (e) {
      console.warn('Failed to save view preference:', e);
    }
  };

  return [viewMode, setViewMode];
}
