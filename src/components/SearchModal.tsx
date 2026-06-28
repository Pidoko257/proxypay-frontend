import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useHistory } from '@docusaurus/router';
import searchIndex, { SearchResult } from '../data/search-index';

export default function SearchModal(): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const history = useHistory();

  const results = useMemo(() => {
    if (!query.trim()) return searchIndex;
    const lower = query.toLowerCase();
    return searchIndex.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.description.toLowerCase().includes(lower) ||
        item.keywords.some((kw) => kw.toLowerCase().includes(lower)),
    );
  }, [query]);

  const groupedResults = useMemo(() => {
    const groups: { category: string; items: SearchResult[] }[] = [];
    const categoryOrder = ['Docs', 'API Reference', 'Guides'] as const;
    for (const cat of categoryOrder) {
      const items = results.filter((r) => r.category === cat);
      if (items.length > 0) {
        groups.push({ category: cat, items });
      }
    }
    return groups;
  }, [results]);

  const flatResults = useMemo(
    () => groupedResults.flatMap((g) => g.items),
    [groupedResults],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!listRef.current || flatResults.length === 0) return;
    const el = listRef.current.querySelector(
      `[data-index="${selectedIndex}"]`,
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, flatResults.length]);

  const navigateTo = useCallback(
    (result: SearchResult) => {
      setIsOpen(false);
      history.push(result.path);
    },
    [history],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (flatResults.length === 0) return;
          setSelectedIndex((prev) => Math.min(prev + 1, flatResults.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (flatResults[selectedIndex]) {
            navigateTo(flatResults[selectedIndex]);
          }
          break;
      }
    },
    [flatResults, selectedIndex, navigateTo],
  );

  if (!isOpen) return null;

  return (
    <div
      className="search-overlay"
      onClick={() => setIsOpen(false)}
      onKeyDown={handleKeyDown}
    >
      <div
        className="search-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Search documentation"
      >
        <div className="search-input-wrapper">
          <svg
            className="search-input-icon"
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search docs, API endpoints, guides..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded
            aria-controls="search-results-list"
          />
          <kbd className="search-input-hint">ESC</kbd>
        </div>
        <div
          id="search-results-list"
          ref={listRef}
          className="search-results"
          role="listbox"
          aria-label="Search results"
        >
          {groupedResults.length === 0 ? (
            <div className="search-empty">
              No results found for "<strong>{query}</strong>"
            </div>
          ) : (
            groupedResults.map((group) => (
              <div
                key={group.category}
                className="search-category"
                role="group"
                aria-label={group.category}
              >
                <div className="search-category-header">{group.category}</div>
                {group.items.map((item) => {
                  const globalIdx = flatResults.indexOf(item);
                  return (
                    <div
                      key={item.id}
                      data-index={globalIdx}
                      id={`search-result-${item.id}`}
                      className={`search-result-item${globalIdx === selectedIndex ? ' search-result-item--selected' : ''}`}
                      role="option"
                      aria-selected={globalIdx === selectedIndex}
                      onClick={() => navigateTo(item)}
                      onMouseEnter={() => setSelectedIndex(globalIdx)}
                    >
                      <div className="search-result-title">{item.title}</div>
                      <div className="search-result-description">
                        {item.description}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
