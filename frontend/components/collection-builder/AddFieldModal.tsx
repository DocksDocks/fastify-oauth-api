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
import {
  FIELD_TYPE_ICONS,
  TextFieldConfig,
  IntegerFieldConfig,
  DecimalFieldConfig,
  EnumFieldConfig,
  BooleanFieldConfig,
  DateFieldConfig,
  JsonFieldConfig,
  RelationFieldConfig,
  MediaFieldConfig,
} from '@/components/collection-builder/field-types';
import { CollectionField, FieldType } from '@/types';
import { validateFieldName, isFieldNameUnique } from '@/lib/field-validation';

interface AddFieldModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (field: CollectionField) => void;
  editField?: CollectionField;
  existingFieldNames?: string[];
}

export function AddFieldModal({ open, onOpenChange, onAdd, editField, existingFieldNames = [] }: AddFieldModalProps) {
  const t = useTranslations('collectionBuilder.addFieldModal');

  const [field, setField] = useState<CollectionField>(
    editField || {
      name: '',
      label: '',
      type: 'text' as FieldType,
      required: false,
    }
  );

  const [selectedType, setSelectedType] = useState<FieldType>(editField?.type || 'text');
  const [currentStep, setCurrentStep] = useState<1 | 2>(editField ? 2 : 1);

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset to step 1 when closing
      setCurrentStep(editField ? 2 : 1);
    }
    onOpenChange(newOpen);
  };

  const handleFieldChange = (updatedField: CollectionField) => {
    setField(updatedField);
  };

  const handleTypeChange = (type: FieldType) => {
    setSelectedType(type);
    setField({
      ...field,
      type,
      // Clear type-specific configs when changing type
      decimalPlaces: undefined,
      enumValues: undefined,
      relationConfig: undefined,
      validation: undefined,
      defaultValue: undefined,
    });
  };

  const handleAdd = () => {
    // Validate field name
    const nameValidation = validateFieldName(field.name || '');
    if (!nameValidation.valid) {
      alert(nameValidation.error || 'Invalid field name');
      return;
    }

    // Check for duplicate field names (only for new fields, not edits)
    const currentName = editField?.name;
    if (!isFieldNameUnique(field.name, existingFieldNames, currentName)) {
      alert(t('validation.duplicateName', { name: field.name }));
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
      case 'integer':
        return <IntegerFieldConfig key={selectedType} {...commonProps} />;
      case 'decimal':
        return <DecimalFieldConfig key={selectedType} {...commonProps} />;
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
      <DialogContent key={editField ? `edit-${editField.name}` : 'new'} className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editField ? t('title.edit') : t('title.add')}</DialogTitle>
          <DialogDescription>
            {editField ? t('description.edit') : t('description.add')}
          </DialogDescription>
          {!editField && (
            <div className="text-sm text-muted-foreground mt-2">
              Step {currentStep} of 2: {currentStep === 1 ? 'Choose Field Type' : 'Configure Field'}
            </div>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="text-sm font-medium">{t('fieldTypeSelector.label')}</div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { value: 'text' as FieldType, label: t('fieldTypes.text'), icon: FIELD_TYPE_ICONS.text },
                  { value: 'longtext' as FieldType, label: t('fieldTypes.longtext'), icon: FIELD_TYPE_ICONS.longtext },
                  { value: 'richtext' as FieldType, label: t('fieldTypes.richtext'), icon: FIELD_TYPE_ICONS.richtext },
                  { value: 'integer' as FieldType, label: t('fieldTypes.integer'), icon: FIELD_TYPE_ICONS.integer },
                  { value: 'decimal' as FieldType, label: t('fieldTypes.decimal'), icon: FIELD_TYPE_ICONS.decimal },
                  { value: 'date' as FieldType, label: t('fieldTypes.date'), icon: FIELD_TYPE_ICONS.date },
                  { value: 'datetime' as FieldType, label: t('fieldTypes.datetime'), icon: FIELD_TYPE_ICONS.datetime },
                  { value: 'boolean' as FieldType, label: t('fieldTypes.boolean'), icon: FIELD_TYPE_ICONS.boolean },
                  { value: 'enum' as FieldType, label: t('fieldTypes.enum'), icon: FIELD_TYPE_ICONS.enum },
                  { value: 'json' as FieldType, label: t('fieldTypes.json'), icon: FIELD_TYPE_ICONS.json },
                  { value: 'relation' as FieldType, label: t('fieldTypes.relation'), icon: FIELD_TYPE_ICONS.relation },
                  { value: 'media' as FieldType, label: t('fieldTypes.media'), icon: FIELD_TYPE_ICONS.media },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleTypeChange(option.value)}
                    className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all hover:border-primary hover:bg-accent cursor-pointer ${
                      selectedType === option.value
                        ? 'border-primary bg-accent'
                        : 'border-border'
                    }`}
                  >
                    <div className="text-foreground [&>svg]:h-6 [&>svg]:w-6">{option.icon}</div>
                    <span className="text-xs text-center font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div>{renderFieldConfig()}</div>
          )}
        </div>

        <DialogFooter>
          {currentStep === 1 ? (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button onClick={() => setCurrentStep(2)} disabled={!selectedType}>
                Next
              </Button>
            </>
          ) : (
            <>
              {!editField && (
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  Back
                </Button>
              )}
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                {t('actions.cancel')}
              </Button>
              <Button onClick={handleAdd}>
                {editField ? t('actions.update') : t('actions.add')}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
