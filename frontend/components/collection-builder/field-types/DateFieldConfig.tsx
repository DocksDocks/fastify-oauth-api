import { useEffect, useRef } from 'react';
import { CollectionField } from '@/types';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

export function DateFieldConfig({ field, onChange, onRemove, showHeader = true }: FieldConfigProps) {
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

  const isDateTime = field.type === 'datetime';
  const prevTypeRef = useRef(field.type);

  // Clear default value when switching between date and datetime if it's incompatible
  useEffect(() => {
    const prevType = prevTypeRef.current;
    const currentType = field.type;
    const currentDefault = field.defaultValue as string | undefined;

    // If type changed and has a special default value
    if (prevType !== currentType && currentDefault && currentDefault !== 'none') {
      // Date -> DateTime: CURRENT_DATE is not valid for datetime, clear it
      if (prevType === 'date' && currentType === 'datetime' && currentDefault === 'CURRENT_DATE') {
        onChange({ ...field, defaultValue: undefined });
      }
      // DateTime -> Date: NOW is not valid for date, clear it
      if (prevType === 'datetime' && currentType === 'date' && currentDefault === 'NOW') {
        onChange({ ...field, defaultValue: undefined });
      }
    }

    prevTypeRef.current = currentType;
  }, [field, onChange]);

  // Validate field name
  const fieldNameValidation = validateFieldName(field.name || '');

  const content = (
    <Tabs defaultValue="basic" className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="basic" className="flex-1">{t('basicTab')}</TabsTrigger>
        <TabsTrigger value="advanced" className="flex-1">{t('advancedTab')}</TabsTrigger>
      </TabsList>

      <TabsContent value="basic" className="space-y-4 mt-4">
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

        {/* Required Switch */}
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
      </TabsContent>

      <TabsContent value="advanced" className="space-y-4 mt-4">
        {/* Default Value */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-default`}>{t('defaultValue')}</Label>
          <Select
            value={(field.defaultValue as string) || 'none'}
            onValueChange={(value) =>
              updateField({ defaultValue: value === 'none' ? undefined : value })
            }
          >
            <SelectTrigger id={`${field.name}-default`}>
              <SelectValue placeholder={t('noDefaultValue')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noDefaultValue')}</SelectItem>
              {isDateTime ? (
                <SelectItem value="NOW">{t('nowTimestamp')}</SelectItem>
              ) : (
                <SelectItem value="CURRENT_DATE">{t('currentDate')}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('specialValueHelp')}
          </p>
        </div>

        <Separator />

        {/* Info */}
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <p className="mb-2">
            {isDateTime ? t('dateTimeInfo') : t('dateInfo')}
          </p>
          <p className="text-xs">
            {t('specialDefaultHelp')}
          </p>
        </div>
      </TabsContent>
    </Tabs>
  );

  if (!showHeader) {
    return content;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {field.name || (isDateTime ? tFieldTypes('dateTimeFieldFallback') : tFieldTypes('dateFieldFallback'))}
          </CardTitle>
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
