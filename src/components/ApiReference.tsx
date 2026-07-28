import React from 'react';
import { RedocStandalone } from 'redoc';
import AuthSelector from './AuthSelector';
import SearchSuggestions from './SearchSuggestions';

export default function ApiReference(): React.JSX.Element {
  return (
    <div className="api-reference-root">
      <div className="api-topbar">
        <SearchSuggestions />
        <AuthSelector />
      </div>
      <div className="api-reference-content">
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
    </div>
  );
}
