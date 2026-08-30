import { validateCode, type ValidationResult, type ValidationStatus } from '../codeValidator';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function expectStatus(result: ValidationResult, status: ValidationStatus) {
  expect(result.status).toBe(status);
}

// ─── validateCode: JSON ───────────────────────────────────────────────────────

describe('validateCode — JSON', () => {
  it('returns "valid" for well-formed JSON object', () => {
    expectStatus(validateCode('{"key":"value","num":42}', 'json'), 'valid');
  });

  it('returns "valid" for JSON array', () => {
    expectStatus(validateCode('[1, 2, 3]', 'json'), 'valid');
  });

  it('returns "valid" for JSON null', () => {
    expectStatus(validateCode('null', 'json'), 'valid');
  });

  it('returns "valid" for JSON string primitive', () => {
    expectStatus(validateCode('"hello"', 'json'), 'valid');
  });

  it('returns "warning" for trailing comma (invalid JSON)', () => {
    expectStatus(validateCode('{"a":1,}', 'json'), 'warning');
  });

  it('returns "warning" for missing closing brace', () => {
    expectStatus(validateCode('{"a":1', 'json'), 'warning');
  });

  it('returns "warning" for empty input on json lang', () => {
    // JSON.parse('') throws
    expectStatus(validateCode('', 'json'), 'warning');
  });

  it('returns "warning" for completely invalid JSON', () => {
    expectStatus(validateCode('this is not json', 'json'), 'warning');
  });

  it('includes the parse error message in the result', () => {
    const result = validateCode('{bad}', 'json');
    expect(result.message).toBeTruthy();
    expect(result.status).toBe('warning');
  });

  it('treats "json5" as JSON (same validator)', () => {
    expectStatus(validateCode('{"valid":"json5"}', 'json5'), 'valid');
  });
});

// ─── validateCode: delimiter-balanced languages ───────────────────────────────

describe('validateCode — delimiter balance (TypeScript / JavaScript / Python / etc.)', () => {
  it('returns "valid" for balanced TypeScript braces', () => {
    const code = 'function foo() { return { bar: "baz" }; }';
    expectStatus(validateCode(code, 'typescript'), 'valid');
  });

  it('returns "warning" for unbalanced TypeScript braces', () => {
    const code = 'function foo() { return { bar: "baz"; }';
    expectStatus(validateCode(code, 'typescript'), 'warning');
  });

  it('returns "warning" for extra closing bracket', () => {
    const code = 'const x = [1, 2, 3]];';
    expectStatus(validateCode(code, 'javascript'), 'warning');
  });

  it('returns "valid" for balanced Python brackets', () => {
    const code = 'result = [x for x in range(10) if x > 0]';
    expectStatus(validateCode(code, 'python'), 'valid');
  });

  it('returns "warning" for unterminated string', () => {
    const code = 'const x = "unterminated';
    expectStatus(validateCode(code, 'javascript'), 'warning');
  });

  it('does not flag brackets inside strings as unbalanced', () => {
    // The { inside the string should not affect depth counting
    const code = 'const msg = "Use { to open";';
    expectStatus(validateCode(code, 'javascript'), 'valid');
  });

  it('handles backtick template literals', () => {
    const code = 'const s = `Hello ${name}`;';
    expectStatus(validateCode(code, 'javascript'), 'valid');
  });

  it('returns "warning" for unclosed parenthesis', () => {
    const code = 'doSomething(arg1, arg2;';
    expectStatus(validateCode(code, 'typescript'), 'warning');
  });
});

// ─── validateCode: unsupported / no language ──────────────────────────────────

describe('validateCode — no language / unsupported', () => {
  it('returns "unsupported" when lang is null', () => {
    expectStatus(validateCode('some code', null), 'unsupported');
  });

  it('returns a message explaining no language was detected', () => {
    const result = validateCode('any text', null);
    expect(result.message).toBeTruthy();
  });
});

// ─── validateCode: bash / yaml (no brackets) ─────────────────────────────────

describe('validateCode — languages without bracketed content', () => {
  it('returns "valid" for plain bash without brackets', () => {
    const code = 'echo hello world\nls -la';
    expectStatus(validateCode(code, 'bash'), 'valid');
  });

  it('returns "valid" for simple YAML without brackets', () => {
    const code = 'name: test\nversion: 1.0';
    expectStatus(validateCode(code, 'yaml'), 'valid');
  });
});

// ─── ValidationResult shape ───────────────────────────────────────────────────

describe('ValidationResult shape', () => {
  it('always returns an object with status and message fields', () => {
    const result = validateCode('{"ok":true}', 'json');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('message');
    expect(typeof result.status).toBe('string');
    expect(typeof result.message).toBe('string');
  });

  it('status is one of the three valid values', () => {
    const valid: ValidationStatus[] = ['valid', 'warning', 'unsupported'];
    const r1 = validateCode('{}', 'json');
    const r2 = validateCode('{bad}', 'json');
    const r3 = validateCode('x', null);
    expect(valid).toContain(r1.status);
    expect(valid).toContain(r2.status);
    expect(valid).toContain(r3.status);
  });
});
