export const MAX_SEARCH_QUERY_LENGTH = 128;

export interface SearchValidationResult {
  value: string;
  error: string | null;
}

export function validateSearchQuery(value: string): SearchValidationResult {
  if (value.length > MAX_SEARCH_QUERY_LENGTH) {
    return { value: '', error: `Search must be ${MAX_SEARCH_QUERY_LENGTH} characters or fewer.` };
  }
  if (/[\u0000-\u001f\u007f]/.test(value)) {
    return { value: '', error: 'Search cannot contain control characters.' };
  }
  return { value: value.trim().replace(/\s+/g, ' '), error: null };
}