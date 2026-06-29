import React from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import DeprecatedVersionBanner from '../components/DeprecatedVersionBanner';

export default function ApiV1Page(): React.JSX.Element {
  return (
    <Layout
      title="API Reference — v1 (Deprecated)"
      description="ProxyPay REST API v1 reference — deprecated, please migrate to v2-beta"
    >
      <div style={{ padding: '1.5rem 1.5rem 0' }}>
        <DeprecatedVersionBanner
          currentVersion="v1"
          latestVersion="v2-beta"
          migrationGuideUrl="/migration-v1-to-v2"
        />
      </div>
      <BrowserOnly fallback={<p style={{ padding: '2rem' }}>Loading API reference...</p>}>
        {() => {
          const { RedocStandalone } = require('redoc');
          return (
            <RedocStandalone
              specUrl="/openapi-v1.yaml"
              options={{
                hideHostname: false,
                disableSearch: false,
                expandResponses: '200,201',
                requiredPropsFirst: true,
                sortPropsAlphabetically: true,
              }}
            />
          );
        }}
      </BrowserOnly>
    </Layout>
  );
}
