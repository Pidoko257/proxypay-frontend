import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useColorMode } from '@docusaurus/theme-common';

function RedocApiReferenceInner(): React.JSX.Element {
  const { colorMode } = useColorMode();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#operation/')) {
        const el = document.getElementById(hash.slice(1));
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          el.classList.add('highlighted-operation');
          setTimeout(() => el.classList.remove('highlighted-operation'), 2000);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    const redocEl = document.querySelector('.redoc-wrap');
    if (redocEl) {
      redocEl.style.display = 'none';
      setTimeout(() => {
        redocEl.style.display = '';
      }, 50);
    }
  }, [colorMode, mounted]);

  return (
    <div style={{ position: 'relative' }}>
      <style>{`
        .redoc-wrap {
          --redoc-color-schema: ${colorMode === 'dark' ? 'dark' : 'light'};
        }
        .redoc-wrap .menu-content {
          background: var(--ifm-background-surface-color) !important;
        }
        .redoc-wrap .api-content {
          background: var(--ifm-background-color) !important;
        }
        .highlighted-operation {
          animation: pulse-highlight 2s ease-in-out;
        }
        @keyframes pulse-highlight {
          0% { background-color: rgba(46, 133, 85, 0.15); }
          100% { background-color: transparent; }
        }
      `}</style>
      {(() => {
        const ApiReference = require('../../components/ApiReference').default;
        return <ApiReference />;
      })()}
    </div>
  );
}

export default function ApiReferencePage(): React.JSX.Element {
  return (
    <Layout title="API Reference" description="ProxyPay REST API full reference powered by Redoc">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading API reference...</p>}>
        {() => <RedocApiReferenceInner />}
      </BrowserOnly>
    </Layout>
  );
}
