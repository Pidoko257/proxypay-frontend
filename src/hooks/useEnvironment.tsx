import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

export type Environment = 'sandbox' | 'production';

export const ENV_URLS: Record<Environment, string> = {
  sandbox: 'https://sandbox-api.proxypay.io',
  production: 'https://api.proxypay.io',
};

const STORAGE_KEY = 'proxypay_env';

interface EnvironmentContextValue {
  env: Environment;
  apiBaseUrl: string;
  setEnv: (next: Environment) => void;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (v: boolean) => void;
}

const EnvironmentContext = createContext<EnvironmentContextValue | null>(null);

export function EnvironmentProvider({ children }: { children: React.ReactNode }) {
  const [env, setEnvState] = useState<Environment>(() => {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'sandbox' || stored === 'production') return stored;
    }
    return 'sandbox';
  });
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const setEnv = useCallback(
    (next: Environment) => {
      if (
        hasUnsavedChanges &&
        !window.confirm('You have unsaved changes. Switch environments anyway?')
      ) {
        return;
      }
      setEnvState(next);
      setHasUnsavedChanges(false);
      localStorage.setItem(STORAGE_KEY, next);
    },
    [hasUnsavedChanges],
  );

  // Expose on window for non-React dashboard features
  useEffect(() => {
    (window as any).__PROXYPAY_API_BASE__ = ENV_URLS[env];
  }, [env]);

  return (
    <EnvironmentContext.Provider
      value={{ env, apiBaseUrl: ENV_URLS[env], setEnv, hasUnsavedChanges, setHasUnsavedChanges }}
    >
      {children}
    </EnvironmentContext.Provider>
  );
}

export function useEnvironment(): EnvironmentContextValue {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error('useEnvironment must be used within EnvironmentProvider');
  return ctx;
}
