import { useEffect } from 'react';
import { useLocation } from '@docusaurus/router';

export function ScrollToHash(): null {
  const location = useLocation();

  useEffect(() => {
    // Extract hash from location
    const hash = location.hash.slice(1);

    if (hash) {
      // Debounce scroll to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, [location.hash]);

  return null;
}

export default ScrollToHash;
