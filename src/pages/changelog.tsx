import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import Breadcrumb from '../components/Breadcrumb';

export default function ChangelogPage(): React.JSX.Element {
  return (
    <Layout title="API Changelog" description="ProxyPay API changelog and release history">
      <Breadcrumb />
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading changelog...</p>}>
        {() => {
          const ChangelogViewer = require('../components/ChangelogViewer').default;
          return <ChangelogViewer />;
        }}
      </BrowserOnly>
    </Layout>
  );
}