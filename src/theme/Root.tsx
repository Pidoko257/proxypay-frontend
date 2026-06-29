import React from 'react';
import StatusBanner from '../components/StatusBanner';

export default function Root({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <>
      <StatusBanner />
      {children}
    </>
  );
}
