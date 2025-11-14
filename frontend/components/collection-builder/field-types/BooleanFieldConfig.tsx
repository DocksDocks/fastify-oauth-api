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

export function BooleanFieldConfig({ field, onChange, onRemove, showHeader = true }: FieldConfigProps) {
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
            value={
              field.defaultValue === undefined
                ? 'none'
                : field.defaultValue
                ? 'true'
                : 'false'
            }
            onValueChange={(value) =>
              updateField({
                defaultValue:
                  value === 'none' ? undefined : value === 'true',
              })
            }
          >
            <SelectTrigger id={`${field.name}-default`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('noDefault')}</SelectItem>
              <SelectItem value="true">{t('booleanTrue')}</SelectItem>
              <SelectItem value="false">{t('booleanFalse')}</SelectItem>
            </SelectContent>
          </Select>
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
          <CardTitle className="text-base">{field.name || tFieldTypes('booleanFieldFallback')}</CardTitle>
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
