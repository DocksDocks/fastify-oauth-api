/**
 * Collection Builder Types
 *
 * Type definitions for the collection builder service
 */

export type FieldType =
  | 'text'
  | 'longtext'
  | 'richtext'
  | 'number'
  | 'date'
  | 'datetime'
  | 'boolean'
  | 'enum'
  | 'json'
  | 'relation'
  | 'media';

export interface CollectionField {
  name: string;
  type: FieldType;
  description?: string;
  required?: boolean;
  unique?: boolean;
  defaultValue?: unknown;
  validation?: FieldValidation;
  numberType?: 'integer' | 'decimal';
  decimalPlaces?: number;
  max?: number; // For VARCHAR length (text fields)
  precision?: number; // For NUMERIC type (decimal fields)
  scale?: number; // For NUMERIC type (decimal fields)
  enumValues?: string[];
  relationConfig?: RelationConfig;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  regex?: string;
}

export interface RelationConfig {
  targetCollection: string;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-many';
  cascadeDelete?: boolean;
  foreignKeyName?: string;
}

export interface CollectionIndex {
  name: string;
  fields: string[];
  unique: boolean;
}

export interface CollectionRelationship {
  fieldName: string;
  relatedCollection: string;
  relationType: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

export interface CollectionDefinitionInput {
  name: string;
  apiName: string;
  displayName: string;
  description?: string;
  icon?: string;
  fields: CollectionField[];
  indexes?: CollectionIndex[];
  relationships?: CollectionRelationship[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
