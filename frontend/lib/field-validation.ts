/**
 * Field name validation utilities for collection builder
 */

// PostgreSQL reserved keywords (subset of most common ones)
const RESERVED_KEYWORDS = new Set([
  'all',
  'analyse',
  'analyze',
  'and',
  'any',
  'array',
  'as',
  'asc',
  'asymmetric',
  'authorization',
  'between',
  'binary',
  'both',
  'case',
  'cast',
  'check',
  'collate',
  'column',
  'constraint',
  'create',
  'cross',
  'current_date',
  'current_role',
  'current_time',
  'current_timestamp',
  'current_user',
  'default',
  'deferrable',
  'desc',
  'distinct',
  'do',
  'else',
  'end',
  'except',
  'false',
  'fetch',
  'for',
  'foreign',
  'from',
  'grant',
  'group',
  'having',
  'in',
  'initially',
  'inner',
  'intersect',
  'into',
  'join',
  'leading',
  'left',
  'like',
  'limit',
  'localtime',
  'localtimestamp',
  'natural',
  'not',
  'null',
  'offset',
  'on',
  'only',
  'or',
  'order',
  'outer',
  'placing',
  'primary',
  'references',
  'returning',
  'right',
  'select',
  'session_user',
  'some',
  'symmetric',
  'table',
  'then',
  'to',
  'trailing',
  'true',
  'union',
  'unique',
  'user',
  'using',
  'variadic',
  'when',
  'where',
  'window',
  'with',
]);

export interface FieldNameValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a field name according to PostgreSQL naming rules
 *
 * Rules:
 * - Must start with a lowercase letter (a-z)
 * - Can only contain lowercase letters, numbers, and underscores
 * - Must be between 1 and 63 characters (PostgreSQL limit)
 * - Cannot be a reserved SQL keyword
 * - Cannot start or end with underscore
 *
 * @param name - The field name to validate
 * @returns Validation result with error message if invalid
 */
export function validateFieldName(name: string): FieldNameValidationResult {
  // Check if empty
  if (!name || name.trim() === '') {
    return {
      valid: false,
      error: 'Field name is required',
    };
  }

  // Check length (PostgreSQL identifier limit is 63 characters)
  if (name.length > 63) {
    return {
      valid: false,
      error: 'Field name must be 63 characters or less',
    };
  }

  // Check if it starts with a letter
  if (!/^[a-z]/.test(name)) {
    return {
      valid: false,
      error: 'Field name must start with a lowercase letter (a-z)',
    };
  }

  // Check if it ends with an underscore
  if (/_$/.test(name)) {
    return {
      valid: false,
      error: 'Field name cannot end with an underscore',
    };
  }

  // Check if it contains only valid characters (lowercase letters, numbers, underscores)
  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return {
      valid: false,
      error: 'Field name can only contain lowercase letters, numbers, and underscores',
    };
  }

  // Check if it's a reserved keyword
  if (RESERVED_KEYWORDS.has(name.toLowerCase())) {
    return {
      valid: false,
      error: `"${name}" is a reserved SQL keyword and cannot be used as a field name`,
    };
  }

  // Check for consecutive underscores
  if (/__/.test(name)) {
    return {
      valid: false,
      error: 'Field name cannot contain consecutive underscores',
    };
  }

  return { valid: true };
}

/**
 * Check if a field name is unique within a list of existing names
 *
 * @param name - The field name to check
 * @param existingNames - Array of existing field names
 * @param currentName - Optional current name (for edit mode, to exclude self)
 * @returns True if unique, false if duplicate
 */
export function isFieldNameUnique(
  name: string,
  existingNames: string[],
  currentName?: string,
): boolean {
  // In edit mode, allow the current name
  if (currentName && name === currentName) {
    return true;
  }

  return !existingNames.includes(name);
}

/**
 * Suggests a field name based on user input by converting to snake_case
 * This is a helper for user convenience, but validation still applies
 *
 * @param input - User input string
 * @returns Suggested field name in snake_case
 */
export function suggestFieldName(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/__+/g, '_')
    .replace(/^[0-9]+/, '') // Remove leading numbers
    .substring(0, 63); // Limit to PostgreSQL max length
}
