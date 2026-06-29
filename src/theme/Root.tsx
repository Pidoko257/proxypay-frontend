import React from 'react';

export default function Root({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <>
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      {children}
    </>
  );
}
