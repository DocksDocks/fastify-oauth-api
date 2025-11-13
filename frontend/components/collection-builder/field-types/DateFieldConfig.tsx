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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FieldConfigProps {
  field: CollectionField;
  onChange: (field: CollectionField) => void;
  onRemove: () => void;
  showHeader?: boolean;
}

export function DateFieldConfig({ field, onChange, onRemove, showHeader = true }: FieldConfigProps) {
  const t = useTranslations('collectionBuilder.fieldConfig');

  const updateField = (updates: Partial<CollectionField>) => {
    onChange({ ...field, ...updates });
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

  const content = (
    <div className="space-y-4">
        {/* Field Label */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-label`}>
            {t('displayLabel')} <span className="text-destructive">{t('required')}</span>
          </Label>
          <Input
            id={`${field.name}-label`}
            value={field.label}
            onChange={(e) => updateField({ label: e.target.value })}
            placeholder={t('placeholder.label')}
          />
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
          <Select
            value={(field.defaultValue as string) || 'none'}
            onValueChange={(value) =>
              updateField({ defaultValue: value === 'none' ? undefined : value })
            }
          >
            <SelectTrigger id={`${field.name}-default`}>
              <SelectValue placeholder="No default value" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No default value</SelectItem>
              {isDateTime ? (
                <SelectItem value="NOW">NOW (Current timestamp)</SelectItem>
              ) : (
                <SelectItem value="CURRENT_DATE">CURRENT_DATE (Today)</SelectItem>
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {isDateTime
              ? 'Special values will be automatically set when creating records'
              : 'Special values will be automatically set when creating records'}
          </p>
        </div>

        <Separator />

        {/* Info */}
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <p className="mb-2">
            {isDateTime
              ? 'Stores date and time with timezone support (e.g., 2024-11-12 14:30:00)'
              : 'Stores date only without time (e.g., 2024-11-12)'}
          </p>
          <p className="text-xs">
            <strong>Special default value:</strong>
            <br />
            • {isDateTime ? 'NOW' : 'CURRENT_DATE'}: Automatically uses current {isDateTime ? 'timestamp' : 'date'}
          </p>
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
          <CardTitle className="text-base">
            {field.label || (isDateTime ? 'Date & Time Field' : 'Date Field')}
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
