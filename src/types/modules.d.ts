declare module 'js-yaml' {
  export function load(input: string): unknown;
  export function dump(input: unknown): string;
}

declare module '@readme/openapi-parser' {
  interface ValidationError {
    message: string;
    path?: string;
  }

  interface ValidationResult {
    valid: boolean;
    errors?: ValidationError[];
    warnings?: ValidationError[];
  }

  export function validate(
    spec: Record<string, unknown>
  ): Promise<ValidationResult>;
  export function parse(
    spec: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  export function compileErrors(result: ValidationResult): string;
}
