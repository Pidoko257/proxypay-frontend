import React, { useEffect, useRef, useState } from 'react';

type Suggestion = {
  id: string;
  title: string;
  snippet: string;
  url: string;
  score: number;
};

function debounce<T extends (...args: any[]) => void>(fn: T, wait = 250) {
  let t: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export default function SearchSuggestions(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const corpusRef = useRef<string | null>(null);

  useEffect(() => {
    // preload openapi.yaml text into memory for client-side search
    fetch('/openapi.yaml')
      .then((r) => r.text())
      .then((t) => (corpusRef.current = t))
      .catch(() => (corpusRef.current = null));
  }, []);

  function rankAndFormat(matches: Array<{ title: string; snippet: string; url: string }>): Suggestion[] {
    const popularityRaw = localStorage.getItem('search_counts') || '{}';
    const popularity = JSON.parse(popularityRaw);
    return matches
      .map((m) => {
        const pop = popularity[m.title] || 0;
        const relevance = 1; // placeholder for more advanced scoring
        return { id: m.url, title: m.title, snippet: m.snippet, url: m.url, score: relevance + pop };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  const performSearch = debounce((q: string) => {
    if (!q || q.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const matches: Array<{ title: string; snippet: string; url: string }> = [];

    // search in openapi text
    const txt = corpusRef.current;
    if (txt) {
      const lines = txt.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        if (l.toLowerCase().includes(q.toLowerCase())) {
          const title = lines[Math.max(0, i - 1)].trim().slice(0, 120) || 'API spec match';
          const snippet = l.trim().slice(0, 200);
          const url = '#';
          matches.push({ title, snippet, url });
        }
        if (matches.length > 60) break;
      }
    }

    // add some static guide entries
    const guides = [
      { title: 'Authentication Guide', snippet: 'How to authenticate with API Key, OAuth2 and mTLS', url: '/docs/auth' },
      { title: 'Payments API', snippet: 'Create and manage payments', url: '/docs/payments' },
    ];

    const combined = matches.concat(guides.filter(g => g.title.toLowerCase().includes(q.toLowerCase())));
    const ranked = rankAndFormat(combined);
    setResults(ranked);
    setOpen(true);
  }, 250);

  useEffect(() => {
    performSearch(query);
  }, [query]);

  function recordSearch(title: string) {
    try {
      const key = 'search_counts';
      const raw = localStorage.getItem(key) || '{}';
      const obj = JSON.parse(raw);
      obj[title] = (obj[title] || 0) + 1;
      localStorage.setItem(key, JSON.stringify(obj));
    } catch (e) {}
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const sel = results[active];
      if (sel) {
        recordSearch(sel.title);
        window.location.href = sel.url;
      }
    }
  }

  return (
    <div className="search-suggestions">
      <input
        aria-label="Search API"
        placeholder="Search endpoints, guides..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {open && results.length > 0 && (
        <ul className="suggestions-list">
          {results.map((r, i) => (
            <li key={r.id} className={i === active ? 'active' : ''} onMouseEnter={() => setActive(i)}>
              <a href={r.url} onClick={() => recordSearch(r.title)}>
                <div className="s-title">{r.title}</div>
                <div className="s-snippet">{r.snippet}</div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
