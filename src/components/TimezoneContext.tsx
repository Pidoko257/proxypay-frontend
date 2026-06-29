import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const TZ_KEY = 'proxypay_timezone';

interface TimezoneContextValue {
  timezone: string;
  setTimezone: (tz: string) => void;
  formatTimestamp: (isoString: string, opts?: Intl.DateTimeFormatOptions) => string;
}

const TimezoneContext = createContext<TimezoneContextValue>({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  setTimezone: () => {},
  formatTimestamp: (s) => s,
});

export function TimezoneProvider({ children }: { children: React.ReactNode }) {
  const [timezone, setTzState] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(TZ_KEY) || Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  });

  const setTimezone = useCallback((tz: string) => {
    localStorage.setItem(TZ_KEY, tz);
    setTzState(tz);
  }, []);

  const formatTimestamp = useCallback(
    (isoString: string, opts: Intl.DateTimeFormatOptions = {}) => {
      const defaults: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      };
      return new Intl.DateTimeFormat('en-US', { ...defaults, ...opts, timeZone: timezone }).format(
        new Date(isoString),
      );
    },
    [timezone],
  );

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, formatTimestamp }}>
      {children}
    </TimezoneContext.Provider>
  );
}

export function useTimezone() {
  return useContext(TimezoneContext);
}
