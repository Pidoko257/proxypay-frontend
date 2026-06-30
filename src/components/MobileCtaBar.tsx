import React, { useEffect, useState } from 'react';
import Link from '@docusaurus/Link';

export default function MobileCtaBar(): React.JSX.Element {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setHidden(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      className="mobile-cta-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        padding: '0.75rem 1.25rem',
        background: 'var(--ifm-background-surface-color, #fff)',
        borderTop: '1px solid var(--ifm-color-emphasis-300)',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 100,
        transition: 'transform 0.3s ease, opacity 0.3s ease',
        transform: hidden ? 'translateY(100%)' : 'translateY(0)',
        opacity: hidden ? 0 : 1,
        pointerEvents: hidden ? 'none' : 'auto',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
      }}
    >
      <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--ifm-color-emphasis-700)' }}>
        Ready to integrate?
      </span>
      <Link className="button button--primary button--sm" to="/api">
        Start Building →
      </Link>
    </div>
  );
}
