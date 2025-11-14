import { useState } from 'react';
import { CollectionField } from '@/types';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { validateFieldName } from '@/lib/field-validation';

interface FieldConfigProps {
  field: CollectionField;
  onChange: (field: CollectionField) => void;
  onRemove: () => void;
  showHeader?: boolean;
}

export function EnumFieldConfig({ field, onChange, onRemove, showHeader = true }: FieldConfigProps) {
  const t = useTranslations('collectionBuilder.fieldConfig');
  const tFieldTypes = useTranslations('collectionBuilder.fieldTypes');
  const [newEnumValue, setNewEnumValue] = useState('');

  const updateField = (updates: Partial<CollectionField>) => {
    // Keep label in sync with name for backend compatibility
    if (updates.name !== undefined) {
      onChange({ ...field, ...updates, label: updates.name });
    } else {
      onChange({ ...field, ...updates });
    }
  };

  const addEnumValue = () => {
    if (!newEnumValue.trim()) return;

    const currentValues = field.enumValues || [];
    if (currentValues.includes(newEnumValue.trim())) {
      alert(t('enumValueExists'));
      return;
    }

    updateField({ enumValues: [...currentValues, newEnumValue.trim()] });
    setNewEnumValue('');
  };

  const removeEnumValue = (value: string) => {
    const currentValues = field.enumValues || [];
    updateField({ enumValues: currentValues.filter((v) => v !== value) });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEnumValue();
    }
  };

  // Validate field name
  const fieldNameValidation = validateFieldName(field.name || '');

  const content = (
    <div className="space-y-4">
        {/* Field Name */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-name`}>
            {t('fieldName')} <span className="text-destructive">{t('required')}</span>
          </Label>
          <Input
            id={`${field.name}-name`}
            value={field.name}
            onChange={(e) => updateField({ name: e.target.value })}
            placeholder={t('placeholder.fieldName')}
            className={!fieldNameValidation.valid ? 'border-destructive' : ''}
          />
          {!fieldNameValidation.valid && fieldNameValidation.error && (
            <p className="text-sm text-destructive">{fieldNameValidation.error}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-description`}>{t('description')}</Label>
          <Input
            id={`${field.name}-description`}
            value={field.description || ''}
            onChange={(e) => updateField({ description: e.target.value })}
            placeholder={t('placeholder.description')}
          />
        </div>

        <Separator />

        {/* Enum Values */}
        <div className="space-y-3">
          <Label>
            {t('enumValues')} <span className="text-destructive">{t('required')}</span>
          </Label>

          {/* Current Values */}
          {field.enumValues && field.enumValues.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {field.enumValues.map((value) => (
                <Badge key={value} variant="secondary" className="pr-1">
                  {value}
                  <button
                    onClick={() => removeEnumValue(value)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('noEnumValues')}</p>
          )}

          {/* Add New Value */}
          <div className="flex gap-2">
            <Input
              value={newEnumValue}
              onChange={(e) => setNewEnumValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('placeholder.enumValue')}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addEnumValue}
              disabled={!newEnumValue.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('addEnumHint')}
          </p>
        </div>

        <Separator />

        {/* Switches */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label
              htmlFor={`${field.name}-required`}
              className="text-sm font-medium cursor-pointer"
            >
              {t('requiredField')}
            </Label>
            <Switch
              id={`${field.name}-required`}
              checked={field.required || false}
              onCheckedChange={(checked) =>
                updateField({ required: checked })
              }
            />
          </div>
        </div>

        <Separator />

        {/* Default Value */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-default`}>{t('defaultValue')}</Label>
          {field.enumValues && field.enumValues.length > 0 ? (
            <select
              id={`${field.name}-default`}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={(field.defaultValue as string) || ''}
              onChange={(e) =>
                updateField({ defaultValue: e.target.value || undefined })
              }
            >
              <option value="">{t('noDefault')}</option>
              {field.enumValues.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t('addEnumFirst')}
            </p>
          )}
        </div>
    </div>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{field.name || tFieldTypes('enumFieldFallback')}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {content}
      </CardContent>
    </Card>
  );
}
