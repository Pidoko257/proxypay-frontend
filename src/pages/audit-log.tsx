/**
 * Audit Log page — /audit-log (Issue #636)
 *
 * Renders the UserActivityAuditLog component inside the Docusaurus Layout.
 */

import React from 'react';
import Layout from '@theme/Layout';
import UserActivityAuditLog from '../components/UserActivityAuditLog';

export default function AuditLogPage(): React.JSX.Element {
  return (
    <Layout
      title="User Activity Audit Log"
      description="View and export user access events for ProxyPay"
    >
      <main className="audit-page-main">
        <UserActivityAuditLog />
      </main>
    </Layout>
  );
}
