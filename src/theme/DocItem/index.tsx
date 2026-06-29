import React from 'react';
import DocItem from '@theme-original/DocItem';
import FeedbackWidget from '../../../src/components/FeedbackWidget';

export default function DocItemWrapper(props: any) {
  return (
    <>
      <DocItem {...props} />
      <div style={{ padding: '0 16px 48px' }}>
        <FeedbackWidget />
      </div>
    </>
  );
}
