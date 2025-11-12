'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { CollectionField, FieldType } from '@/types';

// Helper function to convert display label to snake_case
function toSnakeCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

interface AddFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: CollectionField) => void;
  editField?: CollectionField;
  existingFieldNames?: string[];
}

export function AddFieldModal({ open, onOpenChange, onAdd, editField, existingFieldNames = [] }: AddFieldModalProps) {
  const [field, setField] = useState<CollectionField>(
    editField || {
      name: '',
      label: '',
      type: 'text' as FieldType,
      required: false,
    }
  );

  const [selectedType, setSelectedType] = useState<FieldType>(editField?.type || 'text');

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleFieldChange = (updatedField: CollectionField) => {
    // Auto-generate field name from label
    if (updatedField.label !== field.label) {
      const generatedName = toSnakeCase(updatedField.label || '');
      updatedField = { ...updatedField, name: generatedName };
    }
    setField(updatedField);
  };

  const handleTypeChange = (type: FieldType) => {
    setSelectedType(type);
    setField({
      ...field,
      type,
      // Clear type-specific configs when changing type
      numberType: undefined,
      decimalPlaces: undefined,
      enumValues: undefined,
      relationConfig: undefined,
      validation: undefined,
      defaultValue: undefined,
    });
  };

  const handleAdd = () => {
    // Validate required fields
    if (!field.name || !field.label) {
      alert('Field name and label are required');
      return;
    }

    // Check for duplicate field names (only for new fields, not edits)
    if (!editField && existingFieldNames.includes(field.name)) {
      alert(`Field name "${field.name}" already exists. Please use a unique name.`);
      return;
    }

    onAdd(field);
    handleOpenChange(false);
  };

  const renderFieldConfig = () => {
    const commonProps = {
      field,
      onChange: handleFieldChange,
      onRemove: () => {}, // Not used in modal
      showHeader: false, // Hide header in modal
    };

    switch (selectedType) {
      case 'text':
      case 'longtext':
      case 'richtext':
        return <TextFieldConfig key={selectedType} {...commonProps} />;
      case 'number':
        return <NumberFieldConfig key={selectedType} {...commonProps} />;
      case 'enum':
        return <EnumFieldConfig key={selectedType} {...commonProps} />;
      case 'boolean':
        return <BooleanFieldConfig key={selectedType} {...commonProps} />;
      case 'date':
      case 'datetime':
        return <DateFieldConfig key={selectedType} {...commonProps} />;
      case 'json':
        return <JsonFieldConfig key={selectedType} {...commonProps} />;
      case 'relation':
        return <RelationFieldConfig key={selectedType} {...commonProps} />;
      case 'media':
        return <MediaFieldConfig key={selectedType} {...commonProps} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editField ? 'Edit Field' : 'Add New Field'}</DialogTitle>
          <DialogDescription>
            {editField ? 'Update the field configuration below.' : 'Configure your new field below.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Field Type Selector */}
          <div>
            <FieldTypeSelector
              value={selectedType}
              onChange={handleTypeChange}
            />
          </div>

          {/* Field Configuration */}
          <div>{renderFieldConfig()}</div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>
            {editField ? 'Update Field' : 'Add Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
