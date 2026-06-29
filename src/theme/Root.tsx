import React, { useEffect, useRef } from 'react';
import { useLocation } from '@docusaurus/router';

function FocusManager({ children }: { children: React.ReactNode }): React.JSX.Element {
  const location = useLocation();
  const isFirstMount = useRef(true);

  useEffect(() => {
    // Skip focus management on the initial page load — only fire on navigation.
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    // Give the DOM a tick to render the new page before querying for h1.
    const frame = requestAnimationFrame(() => {
      const h1 = document.querySelector<HTMLElement>('main h1');
      if (h1) {
        // tabIndex="-1" allows programmatic focus without adding the element
        // to the natural tab order.
        if (!h1.hasAttribute('tabindex')) {
          h1.setAttribute('tabindex', '-1');
        }
        h1.focus({ preventScroll: false });
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [location.pathname]);

  return <>{children}</>;
}

export default function Root({ children }: { children: React.ReactNode }): React.JSX.Element {
  return <FocusManager>{children}</FocusManager>;
}
