import React, { useState, useMemo } from 'react';
import type { Parameter, EndpointInfo } from '../hooks/useOpenApiSpec';

interface ParamState {
  value: string;
  touched: boolean;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  example?: string;
  formatted?: string;
}

interface ParameterValidatorProps {
  endpoint: EndpointInfo;
}

function validateParam(param: Parameter, value: string): ValidationResult {
  const result: ValidationResult = { valid: true, errors: [], warnings: [], suggestions: [] };
  const schema = param.schema;
  if (!schema) return result;

  const trimmed = value.trim();

  // Required check
  if (param.required && trimmed === '') {
    result.errors.push(`${param.name} is required`);
    result.valid = false;
    return result;
  }

  if (trimmed === '') return result;

  // Type-specific validation
  switch (schema.type) {
    case 'string': {
      // Min/max length
      if (schema.minLength !== undefined && trimmed.length < schema.minLength) {
        result.errors.push(`Must be at least ${schema.minLength} characters (currently ${trimmed.length})`);
        result.valid = false;
      }
      if (schema.maxLength !== undefined && trimmed.length > schema.maxLength) {
        result.errors.push(`Must be at most ${schema.maxLength} characters (currently ${trimmed.length})`);
        result.valid = false;
      }

      // Pattern (regex)
      if (schema.pattern) {
        try {
          const regex = new RegExp(schema.pattern);
          if (!regex.test(trimmed)) {
            const humanPattern = schema.pattern
              .replace(/^\^/, '').replace(/\$$/, '')
              .replace(/\\d/g, 'digit')
              .replace(/\\w/g, 'word-char')
              .replace(/\[a-zA-Z\]/g, 'letter')
              .replace(/\+/g, ' (one or more)')
              .replace(/\*/g, ' (zero or more)')
              .replace(/\{(\d+),(\d+)\}/g, ' ($1-$2 chars)')
              .replace(/\{(\d+)\}/g, ' ($1 chars)');
            result.errors.push(`Must match pattern: ${humanPattern}`);
            result.valid = false;
          }
        } catch {
          result.warnings.push('Invalid regex pattern in schema');
        }
      }

      // Format hints
      if (schema.format === 'date') {
        result.suggestions.push('Use YYYY-MM-DD format');
        result.example = new Date().toISOString().split('T')[0];
      } else if (schema.format === 'date-time') {
        result.suggestions.push('Use ISO 8601 format');
        result.example = new Date().toISOString();
      } else if (schema.format === 'email') {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
          result.errors.push('Must be a valid email address');
          result.valid = false;
        }
      } else if (schema.format === 'uri' || schema.format === 'url') {
        try {
          new URL(trimmed);
        } catch {
          result.errors.push('Must be a valid URL');
          result.valid = false;
        }
      }

      // Enum suggestions
      if (schema.enum && !schema.enum.includes(trimmed)) {
        const matches = schema.enum.filter((e) =>
          e.toLowerCase().includes(trimmed.toLowerCase())
        );
        if (matches.length > 0) {
          result.suggestions.push(...matches.map((m) => `"${m}"`));
        } else {
          result.suggestions.push(...schema.enum.slice(0, 5).map((e) => `"${e}"`));
        }
        result.errors.push(`"${trimmed}" is not a valid value`);
        result.valid = false;
      }
      break;
    }

    case 'number':
    case 'integer': {
      const num = Number(trimmed);
      if (isNaN(num)) {
        result.errors.push('Must be a number');
        result.valid = false;
      } else {
        if (schema.minimum !== undefined && num < schema.minimum) {
          result.errors.push(`Must be at least ${schema.minimum}`);
          result.valid = false;
        }
        if (schema.maximum !== undefined && num > schema.maximum) {
          result.errors.push(`Must be at most ${schema.maximum}`);
          result.valid = false;
        }
        if (schema.type === 'integer' && !Number.isInteger(num)) {
          result.errors.push('Must be an integer');
          result.valid = false;
        }
      }
      break;
    }

    case 'boolean': {
      const lower = trimmed.toLowerCase();
      if (!['true', 'false', '1', '0', 'yes', 'no'].includes(lower)) {
        result.errors.push('Must be true or false');
        result.valid = false;
      }
      break;
    }
  }

  // Default/example
  if (schema.example !== undefined) {
    result.example = String(schema.example);
  } else if (schema.default !== undefined) {
    result.suggestions.push(`Default: ${schema.default}`);
  }

  return result;
}

export default function ParameterValidator({ endpoint }: ParameterValidatorProps): React.JSX.Element {
  const parameters = endpoint.operation.parameters || [];
  const [paramStates, setParamStates] = useState<Record<string, ParamState>>({});

  const getValue = (name: string): string => paramStates[name]?.value || '';
  const getTouched = (name: string): boolean => paramStates[name]?.touched || false;

  const setValue = (name: string, value: string) => {
    setParamStates((prev) => ({ ...prev, [name]: { value, touched: true } }));
  };

  const allValid = useMemo(() => {
    if (parameters.length === 0) return true;
    return parameters.every((p) => {
      const v = validateParam(p, getValue(p.name));
      return v.valid;
    });
  }, [paramStates, parameters]);

  if (parameters.length === 0) {
    return (
      <div className="pv-empty">
        <p>No parameters to validate for this endpoint.</p>
      </div>
    );
  }

  return (
    <div className="param-validator">
      <h3 className="pv-title">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 11 12 14l7-7" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
        Parameter Validation
        {allValid && parameters.length > 0 && (
          <span className="pv-all-valid">All valid ✓</span>
        )}
      </h3>

      <div className="pv-params">
        {parameters.map((param) => {
          const value = getValue(param.name);
          const touched = getTouched(param.name);
          const validation = validateParam(param, value);
          const showValidation = touched && value.trim() !== '';

          return (
            <div
              key={`${param.in}-${param.name}`}
              className={`pv-param ${showValidation ? (validation.valid ? 'pv-valid' : 'pv-invalid') : ''}`}
            >
              <div className="pv-param-header">
                <label className="pv-label" htmlFor={`pv-${param.name}`}>
                  <span className="pv-param-name">{param.name}</span>
                  <span className={`pv-param-badge pv-in-${param.in}`}>{param.in}</span>
                  {param.required && <span className="pv-required">required</span>}
                </label>
                {param.description && (
                  <p className="pv-description">{param.description}</p>
                )}
              </div>

              <div className="pv-input-wrapper">
                {param.schema?.format === 'date' || param.schema?.format === 'date-time' ? (
                  <input
                    id={`pv-${param.name}`}
                    type={param.schema.format === 'date-time' ? 'datetime-local' : 'date'}
                    className="pv-input pv-date-input"
                    value={value}
                    onChange={(e) => setValue(param.name, e.target.value)}
                    placeholder={param.schema.format === 'date-time' ? 'YYYY-MM-DDTHH:MM' : 'YYYY-MM-DD'}
                  />
                ) : param.schema?.enum ? (
                  <div className="pv-enum-wrapper">
                    <input
                      id={`pv-${param.name}`}
                      type="text"
                      className="pv-input"
                      value={value}
                      onChange={(e) => setValue(param.name, e.target.value)}
                      placeholder={`e.g. ${param.schema.enum.slice(0, 3).join(', ')}`}
                      list={`pv-datalist-${param.name}`}
                    />
                    <datalist id={`pv-datalist-${param.name}`}>
                      {param.schema.enum.map((e) => (
                        <option key={e} value={e} />
                      ))}
                    </datalist>
                  </div>
                ) : (
                  <input
                    id={`pv-${param.name}`}
                    type={param.schema?.type === 'number' || param.schema?.type === 'integer' ? 'number' : 'text'}
                    className="pv-input"
                    value={value}
                    onChange={(e) => setValue(param.name, e.target.value)}
                    placeholder={param.schema?.example ? `e.g. ${param.schema.example}` : param.schema?.default ? `Default: ${param.schema.default}` : param.name}
                  />
                )}

                {showValidation && validation.valid && (
                  <span className="pv-check">✓</span>
                )}
              </div>

              {/* Validation Messages */}
              {showValidation && (
                <div className="pv-messages">
                  {validation.errors.map((err, i) => (
                    <div key={`err-${i}`} className="pv-error-msg">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 8v4M12 16h.01" />
                      </svg>
                      {err}
                    </div>
                  ))}
                  {validation.warnings.map((w, i) => (
                    <div key={`warn-${i}`} className="pv-warning-msg">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                        <path d="M12 9v4M12 17h.01" />
                      </svg>
                      {w}
                    </div>
                  ))}
                  {validation.suggestions.length > 0 && (
                    <div className="pv-suggestions">
                      <span className="pv-suggest-label">Suggestions:</span>
                      {validation.suggestions.map((s, i) => (
                        <button
                          key={`sug-${i}`}
                          className="pv-suggestion-chip"
                          onClick={() => setValue(param.name, s.replace(/"/g, ''))}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {validation.example && (
                    <div className="pv-example-inline">
                      <span className="pv-example-label">Example:</span>
                      <button
                        className="pv-example-value"
                        onClick={() => setValue(param.name, validation.example!)}
                      >
                        {validation.example}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Schema constraints summary */}
              {param.schema && (
                <div className="pv-constraints">
                  {param.schema.type && <span className="pv-constraint">type: {param.schema.type}</span>}
                  {param.schema.format && <span className="pv-constraint">format: {param.schema.format}</span>}
                  {param.schema.minLength !== undefined && (
                    <span className="pv-constraint">min: {param.schema.minLength} chars</span>
                  )}
                  {param.schema.maxLength !== undefined && (
                    <span className="pv-constraint">max: {param.schema.maxLength} chars</span>
                  )}
                  {param.schema.minimum !== undefined && (
                    <span className="pv-constraint">min: {param.schema.minimum}</span>
                  )}
                  {param.schema.maximum !== undefined && (
                    <span className="pv-constraint">max: {param.schema.maximum}</span>
                  )}
                  {param.schema.pattern && (
                    <span className="pv-constraint pv-constraint-pattern" title={param.schema.pattern}>
                      pattern: {param.schema.pattern.length > 25 ? param.schema.pattern.slice(0, 25) + '...' : param.schema.pattern}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
