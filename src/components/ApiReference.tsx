import React, { useState, useEffect, useRef } from 'react';
import { RedocStandalone } from 'redoc';

interface CopyMenuState {
  visible: boolean;
  x: number;
  y: number;
  codeContent: string;
}

interface ErrorSuggestion {
  title: string;
  suggestion: string;
  code?: string;
}

export default function ApiReference(): React.JSX.Element {
  const [copyMenu, setCopyMenu] = useState<CopyMenuState>({
    visible: false,
    x: 0,
    y: 0,
    codeContent: '',
  });
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [errorSuggestion, setErrorSuggestion] = useState<ErrorSuggestion | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const redocRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setCopyMenu({ ...copyMenu, visible: false });
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const codeElement = target.closest('pre code, .redoc-wrap code');
      
      if (codeElement) {
        event.preventDefault();
        const codeContent = codeElement.textContent || '';
        setCopyMenu({
          visible: true,
          x: event.clientX,
          y: event.clientY,
          codeContent,
        });
      }
    };

    const handleCopyClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const copyButton = target.closest('.copy-icon-svg, [class*="copyButton"]');
      
      if (copyButton && !copyMenu.visible) {
        const codeElement = target.closest('pre code, .redoc-wrap code');
        if (codeElement) {
          const codeContent = codeElement.textContent || '';
          copyToClipboard(codeContent, 'Plain text');
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleCopyClick);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleCopyClick);
    };
  }, [copyMenu]);

  // Collapsible TOC functionality
  useEffect(() => {
    const initCollapsibleTOC = () => {
      const observer = new MutationObserver(() => {
        const menuItems = document.querySelectorAll('.redoc-wrap .menu-item');
        
        menuItems.forEach((item) => {
          const titleElement = item.querySelector('.menu-item-title');
          const contentElement = item.querySelector('.menu-content');
          
          if (titleElement && contentElement && !titleElement.classList.contains('menu-category-title')) {
            const categoryId = `toc-category-${Array.from(menuItems).indexOf(item)}`;
            const isCollapsed = localStorage.getItem(categoryId) === 'collapsed';
            
            titleElement.classList.add('menu-category-title');
            contentElement.classList.add(isCollapsed ? 'collapsed' : 'expanded');
            
            if (isCollapsed) {
              titleElement.classList.add('collapsed');
            }
            
            titleElement.setAttribute('tabindex', '0');
            titleElement.setAttribute('role', 'button');
            titleElement.setAttribute('aria-expanded', String(!isCollapsed));
            
            const toggleCollapse = () => {
              const isCurrentlyCollapsed = contentElement.classList.contains('collapsed');
              
              if (isCurrentlyCollapsed) {
                contentElement.classList.remove('collapsed');
                contentElement.classList.add('expanded');
                titleElement.classList.remove('collapsed');
                localStorage.setItem(categoryId, 'expanded');
                titleElement.setAttribute('aria-expanded', 'true');
              } else {
                contentElement.classList.remove('expanded');
                contentElement.classList.add('collapsed');
                titleElement.classList.add('collapsed');
                localStorage.setItem(categoryId, 'collapsed');
                titleElement.setAttribute('aria-expanded', 'false');
              }
            };
            
            titleElement.addEventListener('click', toggleCollapse);
            titleElement.addEventListener('keydown', (e: Event) => {
              const keyboardEvent = e as KeyboardEvent;
              if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                e.preventDefault();
                toggleCollapse();
              }
            });
          }
        });
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });
      
      return () => observer.disconnect();
    };
    
    const timeoutId = setTimeout(initCollapsibleTOC, 1000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Error suggestion functionality
  const getErrorSuggestion = (errorText: string): ErrorSuggestion | null => {
    const lowerError = errorText.toLowerCase();
    
    if (lowerError.includes('401') || lowerError.includes('unauthorized') || lowerError.includes('authentication')) {
      return {
        title: 'Authentication Error',
        suggestion: 'Your API token is missing or invalid. Make sure to include a valid Bearer token in your Authorization header.',
        code: 'Authorization: Bearer YOUR_API_TOKEN'
      };
    }
    
    if (lowerError.includes('429') || lowerError.includes('rate limit') || lowerError.includes('too many requests')) {
      return {
        title: 'Rate Limit Exceeded',
        suggestion: 'You\'ve exceeded the API rate limit. Implement exponential backoff and retry after the suggested delay.',
        code: `// Implement exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      const delay = Math.pow(2, i) * 1000;
      await new Promise(r => setTimeout(r, delay));
    }
  }
};`
      };
    }
    
    if (lowerError.includes('400') || lowerError.includes('bad request') || lowerError.includes('invalid parameter')) {
      return {
        title: 'Invalid Parameter',
        suggestion: 'One or more parameters are invalid. Check the API documentation for valid values and required fields.',
        code: '// Verify required parameters before making the request'
      };
    }
    
    if (lowerError.includes('404') || lowerError.includes('not found')) {
      return {
        title: 'Resource Not Found',
        suggestion: 'The requested resource does not exist. Verify the endpoint URL and resource ID are correct.',
        code: '// Check the endpoint path and resource identifier'
      };
    }
    
    if (lowerError.includes('500') || lowerError.includes('internal server error')) {
      return {
        title: 'Server Error',
        suggestion: 'The server encountered an unexpected error. This is typically a temporary issue. Please retry your request.',
        code: '// Retry the request after a short delay'
      };
    }
    
    if (lowerError.includes('timeout') || lowerError.includes('etimedout')) {
      return {
        title: 'Request Timeout',
        suggestion: 'The request took too long to complete. Increase your timeout duration or check your network connection.',
        code: `// Increase timeout in your request
const response = await fetch(url, {
  timeout: 30000 // 30 seconds
});`
      };
    }
    
    return null;
  };

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const errorElements = document.querySelectorAll('.redoc-wrap .http-4xx, .redoc-wrap .http-5xx, .redoc-wrap .error');
      
      errorElements.forEach((element) => {
        const errorText = element.textContent || '';
        const suggestion = getErrorSuggestion(errorText);
        
        if (suggestion && !element.querySelector('.error-suggestion')) {
          const suggestionDiv = document.createElement('div');
          suggestionDiv.className = 'error-suggestion';
          suggestionDiv.innerHTML = `
            <div class="error-suggestion-title">💡 ${suggestion.title}</div>
            <div class="error-suggestion-text">${suggestion.suggestion}</div>
            ${suggestion.code ? `<pre class="error-suggestion-code"><code>${suggestion.code}</code></pre>` : ''}
          `;
          element.appendChild(suggestionDiv);
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    
    return () => observer.disconnect();
  }, []);

  const copyToClipboard = (content: string, format: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopyFeedback(`Copied as ${format}`);
      setTimeout(() => setCopyFeedback(null), 2000);
      setCopyMenu({ ...copyMenu, visible: false });
    });
  };

  const formatAsJson = (content: string): string => {
    try {
      const parsed = JSON.parse(content);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return content;
    }
  };

  const formatAsCurl = (content: string): string => {
    try {
      const parsed = JSON.parse(content);
      const method = parsed.method || 'GET';
      const url = parsed.url || 'https://api.example.com';
      const headers = parsed.headers || {};
      const body = parsed.body ? JSON.stringify(parsed.body) : '';
      
      let curl = `curl -X ${method} "${url}"`;
      
      Object.entries(headers).forEach(([key, value]) => {
        curl += ` \\\n  -H "${key}: ${value}"`;
      });
      
      if (body) {
        curl += ` \\\n  -d '${body}'`;
      }
      
      return curl;
    } catch {
      return content;
    }
  };

  const formatAsPowerShell = (content: string): string => {
    try {
      const parsed = JSON.parse(content);
      const method = parsed.method || 'GET';
      const url = parsed.url || 'https://api.example.com';
      const headers = parsed.headers || {};
      const body = parsed.body ? JSON.stringify(parsed.body) : '';
      
      let ps = `$headers = @{\n`;
      Object.entries(headers).forEach(([key, value]) => {
        ps += `  "${key}" = "${value}"\n`;
      });
      ps += `}\n\n`;
      ps += `$response = Invoke-RestMethod -Uri "${url}" -Method ${method} -Headers $headers`;
      if (body) {
        ps += ` -Body '${body}'`;
      }
      ps += `\n\n$response`;
      
      return ps;
    } catch {
      return content;
    }
  };

  return (
    <div ref={redocRef} style={{ position: 'relative' }}>
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
      
      {copyMenu.visible && (
        <div
          ref={menuRef}
          style={{
            position: 'fixed',
            left: `${copyMenu.x}px`,
            top: `${copyMenu.y}px`,
            backgroundColor: 'var(--ifm-background-color)',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 9999,
            minWidth: '180px',
            padding: '4px 0',
          }}
        >
          <button
            onClick={() => copyToClipboard(copyMenu.codeContent, 'Plain text')}
            style={{
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--ifm-font-color-base)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ifm-color-emphasis-100)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            📋 Plain text
          </button>
          <button
            onClick={() => copyToClipboard(formatAsJson(copyMenu.codeContent), 'JSON')}
            style={{
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--ifm-font-color-base)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ifm-color-emphasis-100)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            { } JSON
          </button>
          <button
            onClick={() => copyToClipboard(formatAsCurl(copyMenu.codeContent), 'cURL')}
            style={{
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--ifm-font-color-base)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ifm-color-emphasis-100)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            🌐 cURL
          </button>
          <button
            onClick={() => copyToClipboard(formatAsPowerShell(copyMenu.codeContent), 'PowerShell')}
            style={{
              width: '100%',
              padding: '8px 16px',
              textAlign: 'left',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--ifm-font-color-base)',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--ifm-color-emphasis-100)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            💻 PowerShell
          </button>
        </div>
      )}
      
      {copyFeedback && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            backgroundColor: 'var(--ifm-color-success)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 10000,
            animation: 'fadeIn 0.3s ease-in-out',
          }}
        >
          {copyFeedback}
        </div>
      )}
    </div>
  );
}
