import React from 'react';
import { RedocStandalone } from 'redoc';
import type { ApiReferenceProps } from '../types/component-props';

export default function ApiReference(_props: ApiReferenceProps): React.JSX.Element {
  return (
    <RedocStandalone
      specUrl="/openapi.yaml"
      options={{
        hideHostname: false,
        disableSearch: false,
        expandResponses: '200,201',
        requiredPropsFirst: true,
        sortPropsAlphabetically: true,
      }}
    />
  );
}
