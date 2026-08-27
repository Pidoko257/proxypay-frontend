import React, { useEffect } from 'react';

export default function Root({ children }: { children: React.ReactNode }): React.JSX.Element {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js').catch((error) => {
        console.warn('API documentation offline cache unavailable:', error);
      });
    }
  }, []);

  return <>{children}</>;
}