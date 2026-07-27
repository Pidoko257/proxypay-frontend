import React, { useState, useEffect, useRef } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { useHistory } from '@docusaurus/router';

interface Endpoint {
  path: string;
  method: string;
  summary: string;
  operationId: string;
  tag: string;
}

export default function SearchBar(): React.JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  const history = useHistory();
  const baseUrl = siteConfig.baseUrl || '/';
  
  const [query, setQuery] = useState('');
  const [endpoints, setEndpoints] = useState<Endpoint[]>([]);
  const [results, setResults] = useState<Endpoint[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch and parse openapi.yaml on focus
  const loadIndex = async () => {
    if (isLoaded) return;
    try {
      const res = await fetch(`${baseUrl}openapi.yaml`);
      if (!res.ok) throw new Error('Failed to load openapi.yaml');
      const yamlText = await res.text();
      
      const parsed = parseOpenApiYaml(yamlText);
      setEndpoints(parsed);
      setIsLoaded(true);
    } catch (err) {
      console.error('Error loading search index:', err);
    }
  };

  // Simple, robust client-side YAML parser for OpenAPI paths
  const parseOpenApiYaml = (yamlText: string): Endpoint[] => {
    const lines = yamlText.split('\n');
    const endpoints: { [key: string]: Endpoint } = {};
    let currentPath = '';
    let currentMethod = '';
    let inPaths = false;
    let pathsIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.match(/^(\s*)/)?.[0].length || 0;

      if (trimmed.startsWith('paths:')) {
        inPaths = true;
        pathsIndent = indent;
        continue;
      }

      if (inPaths) {
        if (indent <= pathsIndent && trimmed && !trimmed.startsWith('paths:')) {
          inPaths = false;
          continue;
        }

        const pathKeyMatch = trimmed.match(/^['"]?(\/[^'":\s]+)['"]?\s*:/);
        if (pathKeyMatch) {
          currentPath = pathKeyMatch[1];
          currentMethod = '';
          continue;
        }

        const methodKeyMatch = trimmed.match(/^(get|post|put|delete|patch)\s*:/i);
        if (methodKeyMatch && currentPath) {
          currentMethod = methodKeyMatch[1].toLowerCase();
          const key = `${currentMethod} ${currentPath}`;
          endpoints[key] = {
            path: currentPath,
            method: currentMethod,
            summary: '',
            operationId: '',
            tag: ''
          };
          continue;
        }

        if (currentPath && currentMethod) {
          const key = `${currentMethod} ${currentPath}`;
          
          const summaryMatch = trimmed.match(/^summary:\s*['"]?(.*?)['"]?$/);
          if (summaryMatch) {
            endpoints[key].summary = summaryMatch[1];
            continue;
          }

          const opIdMatch = trimmed.match(/^operationId:\s*['"]?(.*?)['"]?$/);
          if (opIdMatch) {
            endpoints[key].operationId = opIdMatch[1];
            continue;
          }

          if (trimmed.startsWith('tags:')) {
            const inlineTags = trimmed.match(/^tags:\s*\[\s*['"]?(.*?)['"]?\s*\]/);
            if (inlineTags) {
              endpoints[key].tag = inlineTags[1];
            } else {
              let j = i + 1;
              while (j < lines.length) {
                const nextLine = lines[j];
                const nextTrimmed = nextLine.trim();
                const nextIndent = nextLine.match(/^(\s*)/)?.[0].length || 0;
                if (nextIndent > indent && nextTrimmed.startsWith('-')) {
                  endpoints[key].tag = nextTrimmed.replace(/^-\s*/, '').replace(/['"]/g, '');
                  break;
                }
                if (nextIndent <= indent) break;
                j++;
              }
            }
          }
        }
      }
    }
    return Object.values(endpoints);
  };

  // Listen to keyboard shortcut '/'
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
        loadIndex();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isLoaded]);

  // Handle clicking outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query and filter results
  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setSelectedIndex(0);

    if (!val.trim()) {
      setResults([]);
      return;
    }

    const lowerVal = val.toLowerCase();
    const filtered = endpoints.filter(
      item =>
        item.path.toLowerCase().includes(lowerVal) ||
        item.method.toLowerCase().includes(lowerVal) ||
        item.summary.toLowerCase().includes(lowerVal) ||
        item.tag.toLowerCase().includes(lowerVal)
    );
    setResults(filtered);
  };

  const handleSelect = (item: Endpoint) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);

    const hash = item.operationId
      ? `#operation/${item.operationId}`
      : item.tag
      ? `#tag/${item.tag}`
      : '';

    history.push(`${baseUrl}api${hash}`);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results.length > 0) {
        handleSelect(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className="navbar__search">
      <div className="search-bar-container">
        <input
          ref={inputRef}
          type="text"
          className="search-input"
          placeholder="Search API..."
          value={query}
          onFocus={() => {
            loadIndex();
            setIsOpen(true);
          }}
          onChange={handleQueryChange}
          onKeyDown={handleInputKeyDown}
        />
        <span className="search-shortcut">/</span>
      </div>

      {isOpen && query.trim() !== '' && (
        <div className="search-results-overlay">
          {results.length > 0 ? (
            results.map((item, idx) => (
              <a
                key={`${item.method}-${item.path}`}
                className={`search-result-item ${idx === selectedIndex ? 'selected' : ''}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(idx)}
                style={{ display: 'block', textDecoration: 'none' }}
              >
                <div className="search-result-header">
                  <span className={`search-result-method ${item.method}`}>
                    {item.method}
                  </span>
                  <span className="search-result-path">{item.path}</span>
                </div>
                {item.summary && (
                  <div className="search-result-summary">{item.summary}</div>
                )}
              </a>
            ))
          ) : (
            <div className="search-no-results">No API endpoints match "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
}
