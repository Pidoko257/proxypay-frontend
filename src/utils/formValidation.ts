export function requiredField(value: string, label: string): string {
  return value.trim() ? '' : `${label} is required.`;
}

export function pathField(value: string): string {
  if (!value.trim()) return 'Endpoint path is required.';
    return value.startsWith('/') ? '' : 'Endpoint path must start with /.';
}

export function jsonField(value: string, label: string): string {
  if (!value.trim()) return `${label} is required.`;
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return `${label} must be a JSON object.`;
    }
    return '';
  } catch {
    return `${label} must contain valid JSON.`;
  }
}

export function hexColorField(value: string, label: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? '' : `${label} must be a six-digit hex color.`;
}
