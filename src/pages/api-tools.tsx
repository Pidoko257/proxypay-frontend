import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';

export default function ApiToolsPage(): React.JSX.Element {
  return (
    <Layout title="API Workbench" description="Generate API examples, try endpoints, and export a Postman collection">
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading API tools...</p>}>
        {() => {
          const ApiTools = require('../components/ApiTools').default;
          return <ApiTools />;
        }}
      </BrowserOnly>
    </Layout>
  );
}