import React from 'react';
import SearchModal from '../components/SearchModal';

export default function Root({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <>
      {children}
      <SearchModal />
    </>
  );
}
