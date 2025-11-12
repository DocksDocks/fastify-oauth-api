import { CollectionField } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface FieldConfigProps {
  field: CollectionField;
  onChange: (field: CollectionField) => void;
  onRemove: () => void;
  showHeader?: boolean;
}

export function MediaFieldConfig({ field, onChange, onRemove, showHeader = true }: FieldConfigProps) {
  const updateField = (updates: Partial<CollectionField>) => {
    onChange({ ...field, ...updates });
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
            placeholder="Avatar URL"
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
        </div>

        <Separator />

        {/* Info */}
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <p>
            Stores a URL or file path to media files (images, videos, documents, etc.).
          </p>
          <p className="mt-2">
            <strong>Example:</strong> https://cdn.example.com/avatar.jpg
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
          <CardTitle className="text-base">{field.label || 'Media Field'}</CardTitle>
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
