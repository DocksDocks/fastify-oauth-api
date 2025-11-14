import { CollectionField } from '@/types';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { validateFieldName } from '@/lib/field-validation';

interface FieldConfigProps {
  field: CollectionField;
  onChange: (field: CollectionField) => void;
  onRemove: () => void;
  showHeader?: boolean;
}

export function NumberFieldConfig({ field, onChange, onRemove, showHeader = true }: FieldConfigProps) {
  const t = useTranslations('collectionBuilder.fieldConfig');
  const tFieldTypes = useTranslations('collectionBuilder.fieldTypes');

  const updateField = (updates: Partial<CollectionField>) => {
    // Keep label in sync with name for backend compatibility
    if (updates.name !== undefined) {
      onChange({ ...field, ...updates, label: updates.name });
    } else {
      onChange({ ...field, ...updates });
    }
  };

  const updateValidation = (updates: Record<string, unknown>) => {
    onChange({
      ...field,
      validation: { ...field.validation, ...updates },
    });
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

        {/* Number Type */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-numbertype`}>{t('numberType')}</Label>
          <Select
            value={field.numberType || 'integer'}
            onValueChange={(value) =>
              updateField({ numberType: value as 'integer' | 'decimal' })
            }
          >
            <SelectTrigger id={`${field.name}-numbertype`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="integer">{t('numberTypeInteger')}</SelectItem>
              <SelectItem value="decimal">{t('numberTypeDecimal')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Decimal Places (only for decimal type) */}
        {field.numberType === 'decimal' && (
          <div className="space-y-2">
            <Label htmlFor={`${field.name}-decimals`}>{t('decimalPlaces')}</Label>
            <Input
              id={`${field.name}-decimals`}
              type="number"
              min="1"
              max="10"
              value={field.decimalPlaces || 2}
              onChange={(e) =>
                updateField({ decimalPlaces: parseInt(e.target.value) || 2 })
              }
              placeholder={t('placeholder.decimalPlaces')}
            />
            <p className="text-xs text-muted-foreground">
              {t('decimalPlacesHelp')}
            </p>
          </div>
        )}

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

          <div className="flex items-center justify-between">
            <Label
              htmlFor={`${field.name}-unique`}
              className="text-sm font-medium cursor-pointer"
            >
              {t('uniqueConstraint')}
            </Label>
            <Switch
              id={`${field.name}-unique`}
              checked={field.unique || false}
              onCheckedChange={(checked) =>
                updateField({ unique: checked })
              }
            />
          </div>
        </div>

        <Separator />

        {/* Default Value */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-default`}>{t('defaultValue')}</Label>
          <Input
            id={`${field.name}-default`}
            type="number"
            step={field.numberType === 'decimal' ? '0.01' : '1'}
            value={(field.defaultValue as number) || ''}
            onChange={(e) =>
              updateField({
                defaultValue: e.target.value
                  ? field.numberType === 'decimal'
                    ? parseFloat(e.target.value)
                    : parseInt(e.target.value)
                  : undefined,
              })
            }
            placeholder={t('placeholder.defaultValue')}
          />
        </div>

        {/* Validation: Min/Max Value */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${field.name}-min`}>{t('minValue')}</Label>
            <Input
              id={`${field.name}-min`}
              type="number"
              step={field.numberType === 'decimal' ? '0.01' : '1'}
              value={field.validation?.min || ''}
              onChange={(e) =>
                updateValidation({
                  min: e.target.value
                    ? field.numberType === 'decimal'
                      ? parseFloat(e.target.value)
                      : parseInt(e.target.value)
                    : undefined,
                })
              }
              placeholder={t('placeholder.minValue')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${field.name}-max`}>{t('maxValue')}</Label>
            <Input
              id={`${field.name}-max`}
              type="number"
              step={field.numberType === 'decimal' ? '0.01' : '1'}
              value={field.validation?.max || ''}
              onChange={(e) =>
                updateValidation({
                  max: e.target.value
                    ? field.numberType === 'decimal'
                      ? parseFloat(e.target.value)
                      : parseInt(e.target.value)
                    : undefined,
                })
              }
              placeholder={t('placeholder.maxValue')}
            />
          </div>
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
          <CardTitle className="text-base">{field.name || tFieldTypes('numberFieldFallback')}</CardTitle>
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
