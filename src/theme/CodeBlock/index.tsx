import React, { useState, useCallback } from 'react';
import OriginalCodeBlock from '@theme-original/CodeBlock';
import type { Props } from '@theme/CodeBlock';

export default function CodeBlock({ children, ...props }: Props): React.JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const text = typeof children === 'string' ? children.trim() : '';
    if (!text || !navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [children]);

  return (
    <div className="proxypay-code-block">
      <OriginalCodeBlock {...props}>{children}</OriginalCodeBlock>
      {typeof children === 'string' && (
        <button
          type="button"
          aria-label={copied ? 'Code copied to clipboard' : 'Copy code to clipboard'}
          onClick={handleCopy}
          className={`proxypay-copy-btn${copied ? ' proxypay-copy-btn--copied' : ''}`}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
      )}
    </div>
  );
}
