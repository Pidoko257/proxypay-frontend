import React, { useEffect } from 'react';
import { RedocStandalone } from 'redoc';

export default function ApiReference(): React.JSX.Element {
  useEffect(() => {
    // Stabilize Redoc search input focus behavior
    // Prevent unnecessary re-renders of search input by preventing event bubbling
    const preventSearchInputBlur = (e: Event) => {
      const target = e.target as HTMLElement;
      
      // Check if it's the Redoc search input
      if (target.matches('input[placeholder*="search" i], input[placeholder*="Search" i]')) {
        // Prevent the event from causing re-renders that would blur the input
        e.stopPropagation();
      }
    };

    // Listen for events on the Redoc wrapper
    const redocWrapper = document.querySelector('.redoc-wrap');
    if (redocWrapper) {
      // Use capture phase to intercept events early
      redocWrapper.addEventListener('keydown', preventSearchInputBlur, true);
      redocWrapper.addEventListener('keyup', preventSearchInputBlur, true);
      redocWrapper.addEventListener('input', preventSearchInputBlur, true);

      return () => {
        redocWrapper.removeEventListener('keydown', preventSearchInputBlur, true);
        redocWrapper.removeEventListener('keyup', preventSearchInputBlur, true);
        redocWrapper.removeEventListener('input', preventSearchInputBlur, true);
      };
    }
  }, []);

  return (
    <RedocStandalone
      specUrl="/openapi.yaml"
      options={{
        hideHostname: false,
        disableSearch: false,
        expandResponses: '200,201',
        requiredPropsFirst: true,
        sortPropsAlphabetically: true,
        // Prevent auto-scroll on search input changes
        scrollYOffset: 0,
      }}
    />
  );
}
