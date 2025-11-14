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

/**
 * Schema comparison and migration types
 */

export interface FieldChange {
  oldField: CollectionField;
  newField: CollectionField;
  changes: Array<'type' | 'required' | 'unique' | 'defaultValue' | 'validation' | 'max' | 'precision' | 'scale' | 'enumValues'>;
}

export interface IndexChange {
  oldIndex: CollectionIndex;
  newIndex: CollectionIndex;
}

export interface FieldRename {
  oldName: string;
  newName: string;
  field: CollectionField; // The field with the new name
}

export interface MigrationWarning {
  type: 'data_loss' | 'breaking_change' | 'performance' | 'info';
  message: string;
  fieldName?: string;
  severity: 'high' | 'medium' | 'low';
}

export interface SchemaChanges {
  hasChanges: boolean;
  addedFields: CollectionField[];
  removedFields: CollectionField[];
  renamedFields: FieldRename[];
  modifiedFields: FieldChange[];
  addedIndexes: CollectionIndex[];
  removedIndexes: CollectionIndex[];
  modifiedIndexes: IndexChange[];
  warnings: MigrationWarning[];
}
