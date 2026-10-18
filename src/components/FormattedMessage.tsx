import React from 'react';

function renderInline(text: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*|#[^)\s]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    if (match[2] && match[3]) {
      nodes.push(
        <a key={key++} href={match[3]} target={match[3].startsWith('http') ? '_blank' : undefined} rel={match[3].startsWith('http') ? 'noreferrer' : undefined}>
          {match[2]}
        </a>,
      );
    } else if (match[4]) {
      nodes.push(<strong key={key++}>{match[4]}</strong>);
    } else if (match[5]) {
      nodes.push(<code key={key++}>{match[5]}</code>);
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export default function FormattedMessage({ message }: { message: string }): React.JSX.Element {
  return (
    <span>
      {message.split('\n').map((line, index) => (
        <React.Fragment key={`${line}-${index}`}>
          {index > 0 && <br />}
          {renderInline(line)}
        </React.Fragment>
      ))}
    </span>
  );
}
