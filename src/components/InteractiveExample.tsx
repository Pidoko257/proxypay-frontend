import React, { useState, useRef } from 'react';

interface InteractiveExampleProps {
  title: string;
  description: string;
  initialCode: string;
  language?: string;
}

export default function InteractiveExample({
  title,
  description,
  initialCode,
  language = 'javascript',
}: InteractiveExampleProps): React.JSX.Element {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const runCode = () => {
    setIsRunning(true);
    setError('');
    setOutput('');

    try {
      // Capture console.log output
      const logs: string[] = [];
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' '));
      };

      // Execute the code
      const result = eval(code);
      
      // Restore console.log
      console.log = originalLog;

      // Set output
      if (logs.length > 0) {
        setOutput(logs.join('\n'));
      } else if (result !== undefined) {
        setOutput(String(typeof result === 'object' ? JSON.stringify(result, null, 2) : result));
      } else {
        setOutput('Code executed successfully (no output)');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const resetCode = () => {
    setCode(initialCode);
    setOutput('');
    setError('');
  };

  return (
    <div style={{
      border: '1px solid var(--ifm-color-emphasis-300)',
      borderRadius: '8px',
      padding: '20px',
      marginBottom: '24px',
      backgroundColor: 'var(--ifm-background-color)',
    }}>
      <h3 style={{ marginTop: 0, marginBottom: '8px' }}>{title}</h3>
      <p style={{ color: 'var(--ifm-font-color-secondary)', marginBottom: '16px' }}>
        {description}
      </p>
      
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={{
            width: '100%',
            minHeight: '150px',
            padding: '12px',
            fontFamily: 'var(--ifm-font-family-monospace)',
            fontSize: '14px',
            border: '1px solid var(--ifm-color-emphasis-300)',
            borderRadius: '4px',
            backgroundColor: 'var(--ifm-code-background)',
            color: 'var(--ifm-code-color)',
            resize: 'vertical',
            lineHeight: '1.5',
          }}
          spellCheck={false}
        />
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          display: 'flex',
          gap: '8px',
        }}>
          <button
            onClick={runCode}
            disabled={isRunning}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--ifm-color-primary)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            {isRunning ? 'Running...' : '▶ Run'}
          </button>
          <button
            onClick={resetCode}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--ifm-color-emphasis-200)',
              color: 'var(--ifm-font-color-base)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {(output || error) && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          borderRadius: '4px',
          backgroundColor: error ? 'var(--ifm-color-danger-soft-background)' : 'var(--ifm-color-success-soft-background)',
          border: `1px solid ${error ? 'var(--ifm-color-danger)' : 'var(--ifm-color-success)'}`,
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '8px',
            color: error ? 'var(--ifm-color-danger)' : 'var(--ifm-color-success)',
          }}>
            {error ? '❌ Error' : '✓ Output'}
          </div>
          <pre style={{
            margin: 0,
            fontFamily: 'var(--ifm-font-family-monospace)',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            color: 'var(--ifm-font-color-base)',
          }}>
            {error || output}
          </pre>
        </div>
      )}
    </div>
  );
}
