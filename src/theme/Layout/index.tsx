import React from 'react';
import Layout from '@theme-original/Layout';
import Breadcrumbs from '@site/src/components/Breadcrumbs';

export default function LayoutWrapper(props: React.ComponentProps<typeof Layout>): React.JSX.Element {
  return (
    <Layout {...props}>
      <Breadcrumbs />
      {props.children}
    </Layout>
  );
}
