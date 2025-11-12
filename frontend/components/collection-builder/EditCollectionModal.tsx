'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FieldTypeSelector,
  TextFieldConfig,
  NumberFieldConfig,
  EnumFieldConfig,
  BooleanFieldConfig,
  DateFieldConfig,
  JsonFieldConfig,
  RelationFieldConfig,
  MediaFieldConfig,
} from '@/components/collection-builder/field-types';
import { CollectionField, FieldType, CollectionDefinition } from '@/types';
import { adminApi, getErrorMessage } from '@/lib/api';
import { collectionSchema, type CollectionFormData } from '@/lib/schemas/collection';

interface EditCollectionModalProps {
  collection: CollectionDefinition;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCollectionModal({ collection, isOpen, onClose, onSuccess }: EditCollectionModalProps) {
  // Form state
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: collection.name,
      apiName: collection.apiName,
      displayName: collection.displayName,
      description: collection.description || '',
      icon: collection.icon || 'Database',
      fields: collection.fields,
      indexes: collection.indexes || [],
    },
  });

  // Watch fields and indexes for dynamic rendering
  const fields = watch('fields');
  const indexes = watch('indexes') || [];

  // UI state
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Reset form when collection changes
  useEffect(() => {
    if (collection) {
      reset({
        name: collection.name,
        apiName: collection.apiName,
        displayName: collection.displayName,
        description: collection.description || '',
        icon: collection.icon || 'Database',
        fields: collection.fields,
        indexes: collection.indexes || [],
      });
    }
  }, [collection, reset]);

  // Add new field
  const addField = () => {
    const newField: CollectionField = {
      name: `field_${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      type: 'text' as FieldType,
      required: false,
    };
    setValue('fields', [...fields, newField]);
  };

  // Update field
  const updateField = (index: number, updatedField: CollectionField) => {
    const newFields = [...fields];
    newFields[index] = updatedField;
    setValue('fields', newFields);
  };

  // Remove field
  const removeField = (index: number) => {
    setValue('fields', fields.filter((_, i) => i !== index));
  };

  // Add new index
  const addIndex = () => {
    const collectionName = getValues('name');
    const newIndex = {
      name: `idx_${collectionName || 'collection'}_${indexes.length + 1}`,
      fields: [],
      unique: false,
    };
    setValue('indexes', [...indexes, newIndex]);
  };

  // Update index
  const updateIndex = (
    index: number,
    updates: Partial<{ name: string; fields: string[]; unique: boolean }>
  ) => {
    const newIndexes = [...indexes];
    newIndexes[index] = { ...newIndexes[index], ...updates };
    setValue('indexes', newIndexes);
  };

  // Remove index
  const removeIndex = (index: number) => {
    setValue('indexes', indexes.filter((_, i) => i !== index));
  };

  // Submit form
  const onSubmit = async (data: CollectionFormData) => {
    // Clear previous messages
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const updatePayload = {
        displayName: data.displayName,
        description: data.description || undefined,
        icon: data.icon,
        fields: data.fields,
        indexes: data.indexes && data.indexes.length > 0 ? data.indexes : undefined,
      };

      await adminApi.updateCollectionDefinition(collection.id, updatePayload);

      setSuccessMessage('Collection updated successfully! Please preview and apply migration.');

      // Wait a bit to show success message, then call onSuccess
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to update collection:', error);
      setErrorMessage(getErrorMessage(error));
    }
  };

  // Render field config based on type
  const renderFieldConfig = (field: CollectionField, index: number) => {
    const commonProps = {
      field,
      onChange: (updatedField: CollectionField) => updateField(index, updatedField),
      onRemove: () => removeField(index),
    };

    switch (field.type) {
      case 'text':
      case 'longtext':
      case 'richtext':
        return <TextFieldConfig key={index} {...commonProps} />;
      case 'number':
        return <NumberFieldConfig key={index} {...commonProps} />;
      case 'enum':
        return <EnumFieldConfig key={index} {...commonProps} />;
      case 'boolean':
        return <BooleanFieldConfig key={index} {...commonProps} />;
      case 'date':
      case 'datetime':
        return <DateFieldConfig key={index} {...commonProps} />;
      case 'json':
        return <JsonFieldConfig key={index} {...commonProps} />;
      case 'relation':
        return <RelationFieldConfig key={index} {...commonProps} />;
      case 'media':
        return <MediaFieldConfig key={index} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Collection: {collection.displayName}</DialogTitle>
          <DialogDescription>
            Modify collection fields, indexes, and metadata. Changes require migration application.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning for applied collections */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1">Schema Modification Warning</div>
              <p className="text-sm">
                Changes to this collection will require a new migration. After saving, preview the
                migration SQL and apply it carefully to avoid data loss.
              </p>
            </AlertDescription>
          </Alert>

          {/* Success Message */}
          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Validation Errors */}
          {(errors.fields || errors.indexes) && (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="font-semibold mb-2">Please fix validation errors</div>
                {errors.fields && <p className="text-sm">{errors.fields.message}</p>}
                {errors.indexes && <p className="text-sm">{errors.indexes.message}</p>}
              </AlertDescription>
            </Alert>
          )}

          {/* Basic Info - Read Only */}
          <Card>
            <CardHeader>
              <CardTitle>Collection Info (Read-Only)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Collection Name (Table Name)</Label>
                  <Input value={collection.name} disabled className="font-mono bg-muted" />
                  <p className="text-xs text-muted-foreground">Cannot be changed (database table name)</p>
                </div>

                <div className="space-y-2">
                  <Label>API Name (Endpoint)</Label>
                  <Input value={collection.apiName} disabled className="font-mono bg-muted" />
                  <p className="text-xs text-muted-foreground">Cannot be changed (API endpoint name)</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Editable Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata (Editable)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-display-name">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="edit-display-name"
                  {...register('displayName')}
                  placeholder="My Collection"
                />
                {errors.displayName && (
                  <p className="text-xs text-destructive">{errors.displayName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  {...register('description')}
                  placeholder="Optional description"
                />
                {errors.description && (
                  <p className="text-xs text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-icon">Icon</Label>
                <Input id="edit-icon" {...register('icon')} placeholder="Database" />
                {errors.icon && <p className="text-xs text-destructive">{errors.icon.message}</p>}
                <p className="text-xs text-muted-foreground">
                  Lucide icon name (e.g., Database, User, FileText)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Fields */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fields</CardTitle>
                <Button onClick={addField} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No fields added. Click &quot;Add Field&quot; to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={index} className="space-y-3">
                      <div className="flex items-center gap-4">
                        <div className="flex-1">
                          <FieldTypeSelector
                            value={field.type}
                            onChange={(type) => updateField(index, { ...field, type })}
                          />
                        </div>
                      </div>
                      {renderFieldConfig(field, index)}
                      {index < fields.length - 1 && <Separator className="my-6" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Indexes */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Indexes (Optional)</CardTitle>
                <Button onClick={addIndex} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Index
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {indexes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No indexes added.
                </div>
              ) : (
                <div className="space-y-4">
                  {indexes.map((index, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6 space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-4">
                            <div className="space-y-2">
                              <Label>Index Name</Label>
                              <Input
                                value={index.name}
                                onChange={(e) => updateIndex(idx, { name: e.target.value })}
                                placeholder="idx_collection_field"
                                className="font-mono"
                              />
                            </div>

                            <div className="space-y-2">
                              <Label>Fields to Index</Label>
                              <Input
                                value={index.fields.join(', ')}
                                onChange={(e) =>
                                  updateIndex(idx, {
                                    fields: e.target.value.split(',').map((f) => f.trim()),
                                  })
                                }
                                placeholder="field_1, field_2"
                                className="font-mono"
                              />
                            </div>

                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`edit-unique-${idx}`}
                                checked={index.unique}
                                onChange={(e) => updateIndex(idx, { unique: e.target.checked })}
                                className="rounded border-input"
                              />
                              <Label htmlFor={`edit-unique-${idx}`} className="font-normal cursor-pointer">
                                Unique constraint
                              </Label>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIndex(idx)}
                            className="ml-4"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
