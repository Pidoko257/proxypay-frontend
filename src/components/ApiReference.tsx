import React from 'react';
import { RedocStandalone } from 'redoc';
import ResponseSchemaExplorer from './ResponseSchemaExplorer';

export default function ApiReference(): React.JSX.Element {
  return (
    <div className="api-reference-page">
      <ResponseSchemaExplorer />
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
    </div>
  );
}
