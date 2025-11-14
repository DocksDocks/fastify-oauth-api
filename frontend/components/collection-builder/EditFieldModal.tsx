'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Alert, AlertDescription} from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
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
import { validateFieldName, isFieldNameUnique } from '@/lib/field-validation';

interface EditFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (field: CollectionField) => void;
  field: CollectionField;
  existingFieldNames?: string[];
}

export function EditFieldModal({ open, onOpenChange, onSave, field, existingFieldNames = [] }: EditFieldModalProps) {
  const t = useTranslations('collectionBuilder.editFieldModal');
  const tCommon = useTranslations('common');

  const [editedField, setEditedField] = useState<CollectionField>(field);
  const [selectedType, setSelectedType] = useState<FieldType>(field.type);
  const [nameChanged, setNameChanged] = useState(false);

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen);
  };

  const handleFieldChange = (updatedField: CollectionField) => {
    // Track if field name was changed
    if (updatedField.name !== field.name) {
      setNameChanged(true);
    }
    setEditedField(updatedField);
  };

  const handleTypeChange = (type: FieldType) => {
    setSelectedType(type);
    setEditedField({
      ...editedField,
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

  const handleSave = () => {
    // Validate field name
    const nameValidation = validateFieldName(editedField.name || '');
    if (!nameValidation.valid) {
      alert(nameValidation.error || 'Invalid field name');
      return;
    }

    // Check for duplicate field names (excluding current field)
    if (!isFieldNameUnique(editedField.name, existingFieldNames, field.name)) {
      alert(t('validation.duplicateName', { name: editedField.name }));
      return;
    }

    // Warn about field name changes
    if (nameChanged) {
      const confirmed = confirm(
        t('warnings.renameConfirm', {
          oldName: field.name,
          newName: editedField.name
        })
      );
      if (!confirmed) {
        return;
      }
    }

    onSave(editedField);
    handleOpenChange(false);
  };

  const renderFieldConfig = () => {
    const commonProps = {
      field: editedField,
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
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Warning for field name changes */}
          {nameChanged && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {t('warnings.rename')}
              </AlertDescription>
            </Alert>
          )}

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
            {tCommon('actions.cancel')}
          </Button>
          <Button onClick={handleSave}>
            {t('actions.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
