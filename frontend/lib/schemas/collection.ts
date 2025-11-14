import { z } from 'zod';

// Field validation schema
const fieldValidationSchema = z.object({
  min: z.number().int().min(0).optional(),
  max: z.number().int().min(0).optional(),
  regex: z.string().optional(),
});

// Relation config schema
const relationConfigSchema = z.object({
  targetCollection: z.string().min(1, 'Target collection is required'),
  relationType: z.enum(['one-to-one', 'one-to-many', 'many-to-many']),
  cascadeDelete: z.boolean().optional(),
  foreignKeyName: z.string().optional(),
});

// Field schema
const fieldSchema = z.object({
  name: z.string()
    .min(1, 'Field name is required')
    .regex(/^[a-z_][a-z0-9_]*$/, 'Field name must start with letter/underscore, contain only lowercase letters, numbers, and underscores'),
  type: z.enum([
    'text',
    'longtext',
    'richtext',
    'integer',
    'decimal',
    'date',
    'datetime',
    'boolean',
    'enum',
    'json',
    'relation',
    'media',
  ]),
  label: z.string().min(1, 'Field label is required'),
  description: z.string().optional(),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.unknown().optional(),
  validation: fieldValidationSchema.optional(),

  // For text type - VARCHAR length
  max: z.number().int().min(1).max(65535).optional(),

  // For decimal type
  decimalPlaces: z.number().int().min(1).max(10).optional(),
  precision: z.number().int().min(1).max(65).optional(),
  scale: z.number().int().min(0).max(30).optional(),

  // For enum type
  enumValues: z.array(z.string()).optional(),

  // For relation type
  relationConfig: relationConfigSchema.optional(),
}).superRefine((data, ctx) => {
  // Enum validation: must have values if type is enum
  if (data.type === 'enum') {
    if (!data.enumValues || data.enumValues.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enum fields must have at least one value',
        path: ['enumValues'],
      });
    }
  }

  // Relation validation: must have config if type is relation
  if (data.type === 'relation') {
    if (!data.relationConfig) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Relation fields must have a relation config',
        path: ['relationConfig'],
      });
    } else if (!data.relationConfig.targetCollection) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Relation fields must have a target collection',
        path: ['relationConfig', 'targetCollection'],
      });
    }
  }

  // Validation: min must be less than max
  if (data.validation?.min !== undefined && data.validation?.max !== undefined) {
    if (data.validation.min > data.validation.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Min value must be less than or equal to max value',
        path: ['validation', 'min'],
      });
    }
  }
});

// Index schema
const indexSchema = z.object({
  name: z.string()
    .min(1, 'Index name is required')
    .regex(/^[a-z_][a-z0-9_]*$/, 'Index name must start with letter/underscore, contain only lowercase letters, numbers, and underscores'),
  fields: z.array(z.string()).min(1, 'At least one field is required for an index'),
  unique: z.boolean(),
});

// Collection definition schema
export const collectionSchema = z.object({
  name: z.string()
    .min(1, 'Collection name is required')
    .regex(/^[a-z_]+$/, 'Collection name must be lowercase with underscores only'),
  apiName: z.string()
    .min(1, 'API name is required')
    .regex(/^[a-z_]+$/, 'API name must be lowercase with underscores only'),
  displayName: z.string().min(1, 'Display name is required'),
  description: z.string().optional(),
  icon: z.string().optional(),
  fields: z.array(fieldSchema)
    .min(1, 'At least one field is required')
    .superRefine((fields, ctx) => {
      // Check for duplicate field names
      const fieldNames = new Set<string>();
      fields.forEach((field, index) => {
        if (fieldNames.has(field.name)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate field name "${field.name}"`,
            path: [index, 'name'],
          });
        } else {
          fieldNames.add(field.name);
        }
      });
    }),
  indexes: z.array(indexSchema).optional(),
});

// Export types
export type CollectionFormData = z.infer<typeof collectionSchema>;
export type FieldFormData = z.infer<typeof fieldSchema>;
export type IndexFormData = z.infer<typeof indexSchema>;
