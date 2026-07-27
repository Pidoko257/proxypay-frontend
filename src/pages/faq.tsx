import React from 'react';
import Layout from '@theme/Layout';
import FAQContent from '../components/FAQContent';

export default function FAQPage(): React.JSX.Element {
  return (
    <Layout title="FAQ" description="Frequently asked questions about ProxyPay API">
      <main className="faq-page">
        <FAQContent />
      </main>
    </Layout>
  );
}
