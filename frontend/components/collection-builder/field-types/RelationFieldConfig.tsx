import { useState, useEffect } from 'react';
import { CollectionField } from '@/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { adminApi } from '@/lib/api';

interface FieldConfigProps {
  field: CollectionField;
  onChange: (field: CollectionField) => void;
  onRemove: () => void;
  showHeader?: boolean;
}

interface Collection {
  name: string;
  table: string;
  description?: string;
}

// Collections that are not allowed as relation targets
const DISALLOWED_RELATIONS = new Set([
  'authorized_admins',
  'provider_accounts',
  'collection_preferences',
  'user_preferences',
  'refresh_tokens',
  'api_keys',
  'seed_status',
  'setup_status',
  'collection_definitions',
  'collection_migrations',
]);

export function RelationFieldConfig({ field, onChange, onRemove, showHeader = true }: FieldConfigProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateField = (updates: Partial<CollectionField>) => {
    onChange({ ...field, ...updates });
  };

  const updateRelationConfig = (updates: Partial<typeof field.relationConfig>) => {
    onChange({
      ...field,
      relationConfig: {
        targetCollection: field.relationConfig?.targetCollection || '',
        relationType: field.relationConfig?.relationType || 'one-to-many',
        ...field.relationConfig,
        ...updates,
      },
    });
  };

  // Fetch available collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await adminApi.getCollections();
        const allCollections = response.data.collections || [];

        // Filter out disallowed collections
        const allowedCollections = allCollections.filter(
          (col: Collection) => !DISALLOWED_RELATIONS.has(col.table)
        );

        setCollections(allowedCollections);
      } catch (err) {
        console.error('Failed to fetch collections:', err);
        setError('Failed to load collections');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, []);

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
            placeholder="User"
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

        {/* Target Collection */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-target`}>
            Target Collection <span className="text-destructive">*</span>
          </Label>

          {isLoading ? (
            <div className="flex items-center justify-center py-4 border rounded-md bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">Loading collections...</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : collections.length === 0 ? (
            <Alert>
              <AlertDescription>
                No collections available. Create a collection first or only system &quot;Users&quot; table is available for relations.
              </AlertDescription>
            </Alert>
          ) : (
            <Select
              value={field.relationConfig?.targetCollection || ''}
              onValueChange={(value) => updateRelationConfig({ targetCollection: value })}
            >
              <SelectTrigger id={`${field.name}-target`}>
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((collection) => (
                  <SelectItem key={collection.table} value={collection.table}>
                    <div className="flex flex-col">
                      <span className="font-medium">{collection.name}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        {collection.table}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <p className="text-xs text-muted-foreground">
            The collection this field references (only allowed collections are shown)
          </p>
        </div>

        {/* Relation Type */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-relationtype`}>
            Relation Type <span className="text-destructive">*</span>
          </Label>
          <Select
            value={field.relationConfig?.relationType || 'one-to-many'}
            onValueChange={(value) =>
              updateRelationConfig({
                relationType: value as 'one-to-one' | 'one-to-many' | 'many-to-many',
              })
            }
          >
            <SelectTrigger id={`${field.name}-relationtype`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="one-to-one">One to One</SelectItem>
              <SelectItem value="one-to-many">One to Many</SelectItem>
              <SelectItem value="many-to-many">Many to Many</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Relationship type between collections
          </p>
        </div>

        {/* Foreign Key Name (optional) */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-fkname`}>Foreign Key Name</Label>
          <Input
            id={`${field.name}-fkname`}
            value={field.relationConfig?.foreignKeyName || ''}
            onChange={(e) =>
              updateRelationConfig({ foreignKeyName: e.target.value || undefined })
            }
            placeholder="auto-generated"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            Custom foreign key constraint name (optional, auto-generated if empty)
          </p>
        </div>

        {/* Cascade Delete */}
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`${field.name}-cascade`}
              checked={field.relationConfig?.cascadeDelete || false}
              onCheckedChange={(checked) =>
                updateRelationConfig({ cascadeDelete: checked as boolean })
              }
            />
            <Label
              htmlFor={`${field.name}-cascade`}
              className="text-sm font-normal cursor-pointer"
            >
              Cascade delete
            </Label>
          </div>
          <p className="text-xs text-muted-foreground">
            Delete related records when the parent record is deleted
          </p>
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
            Creates a foreign key relationship to another collection. This field will store the ID
            of the related record.
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
          <CardTitle className="text-base">{field.label || 'Relation Field'}</CardTitle>
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
