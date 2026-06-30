import React, { useState, useCallback, useRef } from 'react';
import webhookEvents, { type WebhookEvent, type WebhookField } from '../data/webhook-events';

function formatPath(path: string): string {
  return path;
}

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return Promise.resolve();
}

function JsonValue({
  value,
  path,
  depth,
  hoveredPath,
  onHover,
  onLeave,
}: {
  value: unknown;
  path: string;
  depth: number;
  hoveredPath: string | null;
  onHover: (path: string) => void;
  onLeave: () => void;
}): React.JSX.Element {
  const indent = depth * 2;

  if (value === null) {
    return (
      <span
        className="wh-json-value wh-json-null"
        onMouseEnter={() => onHover(path)}
        onMouseLeave={onLeave}
      >
        null
      </span>
    );
  }

  if (typeof value === 'boolean') {
    return (
      <span
        className="wh-json-value wh-json-boolean"
        onMouseEnter={() => onHover(path)}
        onMouseLeave={onLeave}
      >
        {String(value)}
      </span>
    );
  }

  if (typeof value === 'number') {
    return (
      <span
        className="wh-json-value wh-json-number"
        onMouseEnter={() => onHover(path)}
        onMouseLeave={onLeave}
      >
        {String(value)}
      </span>
    );
  }

  if (typeof value === 'string') {
    return (
      <span
        className="wh-json-value wh-json-string"
        onMouseEnter={() => onHover(path)}
        onMouseLeave={onLeave}
      >
        &quot;{value}&quot;
      </span>
    );
  }

  if (Array.isArray(value)) {
    return (
      <span className="wh-json-array">
        <span className="wh-json-bracket">[</span>
        <span className="wh-json-nested">
          {value.map((item, index) => (
            <span key={index} className="wh-json-row" style={{ paddingLeft: `${indent + 4}px` }}>
              <JsonValue
                value={item}
                path={`${path}[${index}]`}
                depth={depth + 1}
                hoveredPath={hoveredPath}
                onHover={onHover}
                onLeave={onLeave}
              />
              {index < value.length - 1 && <span className="wh-json-comma">,</span>}
            </span>
          ))}
        </span>
        <span className="wh-json-bracket" style={{ paddingLeft: `${indent}px` }}>]</span>
      </span>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    const isHovered = hoveredPath === path && path !== '';

    return (
      <span className={`wh-json-object ${isHovered ? 'wh-json-object-hovered' : ''}`}>
        <span className="wh-json-brace">{'{'}</span>
        <span className="wh-json-nested">
          {entries.map(([key, val], index) => {
            const childPath = path ? `${path}.${key}` : key;
            const isThisHovered = hoveredPath === childPath;

            return (
              <span
                key={key}
                className={`wh-json-entry ${isThisHovered ? 'wh-json-entry-hovered' : ''}`}
                onMouseEnter={() => onHover(childPath)}
                onMouseLeave={onLeave}
              >
                <span className="wh-json-key" style={{ paddingLeft: `${indent + 4}px` }}>
                  &quot;{key}&quot;
                </span>
                <span className="wh-json-colon">: </span>
                <JsonValue
                  value={val}
                  path={childPath}
                  depth={depth + 1}
                  hoveredPath={hoveredPath}
                  onHover={onHover}
                  onLeave={onLeave}
                />
                {index < entries.length - 1 && <span className="wh-json-comma">,</span>}
              </span>
            );
          })}
        </span>
        <span className="wh-json-brace" style={{ paddingLeft: `${indent}px` }}>{'}'}</span>
      </span>
    );
  }

  return <span>{String(value)}</span>;
}

function FieldsPanel({
  fields,
  hoveredPath,
  onMouseEnter,
  onMouseLeave,
}: {
  fields: WebhookField[];
  hoveredPath: string | null;
  onMouseEnter: (path: string) => void;
  onMouseLeave: () => void;
}): React.JSX.Element {
  if (fields.length === 0) {
    return <div className="wh-fields-empty">No field descriptions available.</div>;
  }

  return (
    <div className="wh-fields-list">
      {fields.map((field) => {
        const isActive = hoveredPath === field.path;
        return (
          <div
            key={field.path}
            className={`wh-field ${isActive ? 'wh-field-active' : ''}`}
            onMouseEnter={() => onMouseEnter(field.path)}
            onMouseLeave={onMouseLeave}
          >
            <div className="wh-field-header">
              <code className="wh-field-path">{formatPath(field.path)}</code>
              <span className={`wh-field-type ${isActive ? 'wh-field-type-active' : ''}`}>
                {field.type}
              </span>
            </div>
            <p className="wh-field-desc">{field.description}</p>
          </div>
        );
      })}
    </div>
  );
}

export default function WebhookPayloadInspector(): React.JSX.Element {
  const [selectedEvent, setSelectedEvent] = useState<WebhookEvent>(webhookEvents[0]);
  const [hoveredPath, setHoveredPath] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEventChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const event = webhookEvents.find((ev) => ev.event === e.target.value);
    if (event) {
      setSelectedEvent(event);
      setHoveredPath(null);
      setCopied(false);
    }
  }, []);

  const handleCopy = useCallback(() => {
    const json = JSON.stringify(selectedEvent.payload, null, 2);
    copyToClipboard(json).then(() => {
      setCopied(true);
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }, [selectedEvent]);

  const handleHover = useCallback((path: string) => {
    setHoveredPath(path);
  }, []);

  const handleLeave = useCallback(() => {
    setHoveredPath(null);
  }, []);

  return (
    <div className="wh-inspector">
      <div className="wh-controls">
        <div className="wh-selector">
          <label htmlFor="wh-event-select" className="wh-selector-label">
            Event Type
          </label>
          <select
            id="wh-event-select"
            className="wh-select"
            value={selectedEvent.event}
            onChange={handleEventChange}
          >
            {webhookEvents.map((ev) => (
              <option key={ev.event} value={ev.event}>
                {ev.event}
              </option>
            ))}
          </select>
        </div>
        <button
          className={`wh-copy-btn ${copied ? 'wh-copy-btn-copied' : ''}`}
          onClick={handleCopy}
          type="button"
        >
          {copied ? 'Copied!' : 'Copy Payload'}
        </button>
      </div>

      <div className="wh-summary">{selectedEvent.summary}</div>

      <div className="wh-main">
        <div className="wh-payload-panel">
          <div className="wh-panel-header">Payload</div>
          <pre className="wh-json-viewer">
            <code>
              <JsonValue
                value={selectedEvent.payload}
                path=""
                depth={0}
                hoveredPath={hoveredPath}
                onHover={handleHover}
                onLeave={handleLeave}
              />
            </code>
          </pre>
        </div>
        <div className="wh-fields-panel">
          <div className="wh-panel-header">
            Field Descriptions
            {hoveredPath && (
              <span className="wh-fields-hint">Showing details for: <code>{hoveredPath}</code></span>
            )}
          </div>
          <FieldsPanel
            fields={selectedEvent.fields}
            hoveredPath={hoveredPath}
            onMouseEnter={handleHover}
            onMouseLeave={handleLeave}
          />
        </div>
      </div>
    </div>
  );
}
