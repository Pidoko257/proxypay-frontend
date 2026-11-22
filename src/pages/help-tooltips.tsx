import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function HelpTooltipsPage(): JSX.Element {
  return (
    <Layout
      title="Help & Tooltips"
      description="Contextual help tooltips for ProxyPay portal — hover or focus the ? icons for inline guidance."
    >
      <BrowserOnly fallback={<div style={{ padding: '2rem' }}>Loading…</div>}>
        {() => {
          const TooltipDemo = require('../components/TooltipDemo').default;
          return <TooltipDemo />;
        }}
      </BrowserOnly>
    </Layout>
  );
}
