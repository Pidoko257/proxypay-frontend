import React, { useEffect, useMemo, useState } from 'react';
import { RedocStandalone } from 'redoc';
import yaml from 'yaml';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] as const;

type OpenApiTag = {
  name?: string;
};

type OpenApiSpec = {
  paths?: Record<string, Record<string, unknown>>;
  tags?: OpenApiTag[];
};

function isHttpMethod(value: string): boolean {
  return HTTP_METHODS.some((method) => method.toLowerCase() === value.toLowerCase());
}

function buildFilteredSpec(spec: OpenApiSpec | null, selectedMethods: string[], selectedTags: string[]) {
  if (!spec) {
    return null;
  }

  const normalizedMethods = selectedMethods.map((method) => method.toLowerCase());
  const normalizedTags = selectedTags.map((tag) => tag.toLowerCase());

  const filteredPaths = Object.entries(spec.paths ?? {}).reduce<Record<string, Record<string, unknown>>>((acc, [pathName, pathItem]) => {
    if (!pathItem || typeof pathItem !== 'object') {
      return acc;
    }

    const filteredPathItem = { ...pathItem } as Record<string, unknown>;

    Object.entries(filteredPathItem).forEach(([key, operation]) => {
      if (!isHttpMethod(key) || typeof operation !== 'object' || operation === null) {
        return;
      }

      const method = key.toLowerCase();
      const tags = Array.isArray((operation as { tags?: string[] }).tags)
        ? ((operation as { tags?: string[] }).tags ?? []).filter(Boolean)
        : [];
      const matchesMethod = normalizedMethods.length === 0 || normalizedMethods.includes(method);
      const matchesTags = normalizedTags.length === 0 || tags.some((tag) => normalizedTags.includes(tag.toLowerCase()));

      if (!matchesMethod || !matchesTags) {
        delete filteredPathItem[key];
      }
    });

    if (Object.keys(filteredPathItem).some((key) => isHttpMethod(key))) {
      acc[pathName] = filteredPathItem;
    }

    return acc;
  }, {});

  return {
    ...spec,
    paths: filteredPaths,
  };
}

export default function ApiReference(): React.JSX.Element {
  const [selectedMethods, setSelectedMethods] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    const params = new URLSearchParams(window.location.search);
    return (params.get('methods')?.split(',').map((method) => method.trim()).filter(Boolean) ?? []).filter((method) =>
      HTTP_METHODS.some((allowed) => allowed.toLowerCase() === method.toLowerCase()),
    );
  });
  const [selectedTags, setSelectedTags] = useState<string[]>(() => {
    if (typeof window === 'undefined') {
      return [];
    }

    const params = new URLSearchParams(window.location.search);
    return params.get('tags')?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];
  });
  const [spec, setSpec] = useState<OpenApiSpec | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSpec() {
      try {
        const response = await fetch('/openapi.yaml');
        const text = await response.text();
        const parsedSpec = yaml.parse(text) as OpenApiSpec;

        if (active) {
          setSpec(parsedSpec);
          setIsLoading(false);
        }
      } catch (error) {
        if (active) {
          setErrorMessage(error instanceof Error ? error.message : 'Unable to load the OpenAPI document.');
          setIsLoading(false);
        }
      }
    }

    void loadSpec();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();

    if (selectedMethods.length > 0) {
      params.set('methods', selectedMethods.join(','));
    }

    if (selectedTags.length > 0) {
      params.set('tags', selectedTags.join(','));
    }

    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }, [selectedMethods, selectedTags]);

  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();

    if (Array.isArray(spec?.tags)) {
      spec.tags.forEach((tag) => {
        if (tag.name) {
          tagSet.add(tag.name);
        }
      });
    }

    Object.values(spec?.paths ?? {}).forEach((pathItem) => {
      Object.entries(pathItem).forEach(([key, operation]) => {
        if (!isHttpMethod(key) || typeof operation !== 'object' || operation === null) {
          return;
        }

        const tags = Array.isArray((operation as { tags?: string[] }).tags)
          ? ((operation as { tags?: string[] }).tags ?? [])
          : [];

        tags.forEach((tag) => {
          if (tag) {
            tagSet.add(tag);
          }
        });
      });
    });

    return Array.from(tagSet).sort((left, right) => left.localeCompare(right));
  }, [spec]);

  const filteredSpec = useMemo(() => buildFilteredSpec(spec, selectedMethods, selectedTags), [spec, selectedMethods, selectedTags]);

  const toggleMethod = (method: string) => {
    setSelectedMethods((currentMethods) => {
      if (currentMethods.includes(method)) {
        return currentMethods.filter((value) => value !== method);
      }

      return [...currentMethods, method];
    });
  };

  const clearFilters = () => {
    setSelectedMethods([]);
    setSelectedTags([]);
  };

  return (
    <div className="api-reference-shell">
      <div className="api-reference-filters">
        <div className="api-reference-filter-group">
          <span className="api-reference-filter-label">Methods</span>
          <div className="api-reference-method-buttons" role="group" aria-label="Filter by HTTP method">
            {HTTP_METHODS.map((method) => {
              const isActive = selectedMethods.includes(method);
              return (
                <button
                  key={method}
                  type="button"
                  className={`api-reference-method-button${isActive ? ' is-active' : ''}`}
                  onClick={() => toggleMethod(method)}
                >
                  {method}
                </button>
              );
            })}
          </div>
        </div>

        <div className="api-reference-filter-group">
          <label className="api-reference-filter-label" htmlFor="api-reference-tag-filter">
            Tags
          </label>
          <select
            id="api-reference-tag-filter"
            className="api-reference-tag-select"
            multiple
            value={selectedTags}
            onChange={(event) => {
              const nextTags = Array.from(event.target.selectedOptions, (option) => option.value);
              setSelectedTags(nextTags);
            }}
          >
            {availableTags.length > 0 ? (
              availableTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))
            ) : (
              <option value="">No tags available</option>
            )}
          </select>
        </div>

        <button type="button" className="api-reference-clear-button" onClick={clearFilters}>
          Clear filters
        </button>
      </div>

      {isLoading ? (
        <p className="api-reference-status">Loading API reference…</p>
      ) : errorMessage ? (
        <p className="api-reference-status api-reference-status-error">{errorMessage}</p>
      ) : (
        <RedocStandalone
          spec={filteredSpec ?? undefined}
          options={{
            hideHostname: false,
            disableSearch: false,
            expandResponses: '200,201',
            requiredPropsFirst: true,
            sortPropsAlphabetically: true,
          }}
        />
      )}
    </div>
  );
}
