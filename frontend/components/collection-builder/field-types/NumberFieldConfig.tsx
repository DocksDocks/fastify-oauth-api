import { CollectionField } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
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

export function NumberFieldConfig({ field, onChange, onRemove, showHeader = true }: FieldConfigProps) {
  const updateField = (updates: Partial<CollectionField>) => {
    onChange({ ...field, ...updates });
  };

  const updateValidation = (updates: Record<string, unknown>) => {
    onChange({
      ...field,
      validation: { ...field.validation, ...updates },
    });
  };

  const content = (
    <div className="space-y-4">
        {/* Field Label */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-label`}>
            Display Label <span className="text-destructive">*</span>
          </Label>
          <Input
            id={`${field.name}-label`}
            value={field.label}
            onChange={(e) => updateField({ label: e.target.value })}
            placeholder="Price"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-description`}>Description</Label>
          <Input
            id={`${field.name}-description`}
            value={field.description || ''}
            onChange={(e) => updateField({ description: e.target.value })}
            placeholder="Optional description"
          />
        </div>

        <Separator />

        {/* Number Type */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-numbertype`}>Number Type</Label>
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
              <SelectItem value="integer">Integer (whole numbers)</SelectItem>
              <SelectItem value="decimal">Decimal (floating point)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Decimal Places (only for decimal type) */}
        {field.numberType === 'decimal' && (
          <div className="space-y-2">
            <Label htmlFor={`${field.name}-decimals`}>Decimal Places</Label>
            <Input
              id={`${field.name}-decimals`}
              type="number"
              min="1"
              max="10"
              value={field.decimalPlaces || 2}
              onChange={(e) =>
                updateField({ decimalPlaces: parseInt(e.target.value) || 2 })
              }
              placeholder="2"
            />
            <p className="text-xs text-muted-foreground">
              Number of digits after decimal point (default: 2)
            </p>
          </div>
        )}

        <Separator />

        {/* Checkboxes */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`${field.name}-required`}
              checked={field.required || false}
              onCheckedChange={(checked) =>
                updateField({ required: checked as boolean })
              }
            />
            <Label
              htmlFor={`${field.name}-required`}
              className="text-sm font-normal cursor-pointer"
            >
              Required field
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id={`${field.name}-unique`}
              checked={field.unique || false}
              onCheckedChange={(checked) =>
                updateField({ unique: checked as boolean })
              }
            />
            <Label
              htmlFor={`${field.name}-unique`}
              className="text-sm font-normal cursor-pointer"
            >
              Unique constraint
            </Label>
          </div>
        </div>

        <Separator />

        {/* Default Value */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-default`}>Default Value</Label>
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
            placeholder="Optional default value"
          />
        </div>

        {/* Validation: Min/Max Value */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${field.name}-min`}>Min Value</Label>
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
              placeholder="No minimum"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${field.name}-max`}>Max Value</Label>
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
              placeholder="No maximum"
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
          <CardTitle className="text-base">{field.label || 'Number Field'}</CardTitle>
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
