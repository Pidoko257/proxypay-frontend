import { jsonField, pathField, requiredField } from '../formValidation';

describe('form validation helpers', () => {
  it('reports clear required and path errors', () => {
    expect(requiredField(' ', 'Name')).toBe('Name is required.');
    expect(pathField('users')).toContain('must start with');
    expect(pathField('/users')).toBe('');
  });

  it('accepts JSON objects and rejects invalid JSON', () => {
    expect(jsonField('{"ok":true}', 'Body')).toBe('');
    expect(jsonField('{oops}', 'Body')).toBe('Body must contain valid JSON.');
    expect(jsonField('[]', 'Body')).toBe('Body must be a JSON object.');
  });
});
