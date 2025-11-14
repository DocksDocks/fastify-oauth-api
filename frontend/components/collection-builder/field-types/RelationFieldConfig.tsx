import { useState, useEffect } from 'react';
import { CollectionField } from '@/types';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { adminApi } from '@/lib/api';
import { validateFieldName } from '@/lib/field-validation';

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
  const t = useTranslations('collectionBuilder.fieldConfig');
  const tFieldTypes = useTranslations('collectionBuilder.fieldTypes');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateField = (updates: Partial<CollectionField>) => {
    // Keep label in sync with name for backend compatibility
    if (updates.name !== undefined) {
      onChange({ ...field, ...updates, label: updates.name });
    } else {
      onChange({ ...field, ...updates });
    }
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
        setError(t('failedLoadCollections'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCollections();
  }, [t]);

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

        {/* Target Collection */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-target`}>
            {t('targetCollection')} <span className="text-destructive">{t('required')}</span>
          </Label>

          {isLoading ? (
            <div className="flex items-center justify-center py-4 border rounded-md bg-muted/50">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">{t('loadingCollections')}</span>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : collections.length === 0 ? (
            <Alert>
              <AlertDescription>
                {t('noCollectionsAvailable')}
              </AlertDescription>
            </Alert>
          ) : (
            <Select
              value={field.relationConfig?.targetCollection || ''}
              onValueChange={(value) => updateRelationConfig({ targetCollection: value })}
            >
              <SelectTrigger id={`${field.name}-target`}>
                <SelectValue placeholder={t('selectCollection')} />
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
            {t('targetCollectionHelp')}
          </p>
        </div>

        {/* Relation Type */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-relationtype`}>
            {t('relationType')} <span className="text-destructive">{t('required')}</span>
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
              <SelectItem value="one-to-one">{t('oneToOne')}</SelectItem>
              <SelectItem value="one-to-many">{t('oneToMany')}</SelectItem>
              <SelectItem value="many-to-many">{t('manyToMany')}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {t('relationTypeHelp')}
          </p>
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
        {/* Foreign Key Name (optional) */}
        <div className="space-y-2">
          <Label htmlFor={`${field.name}-fkname`}>{t('foreignKeyName')}</Label>
          <Input
            id={`${field.name}-fkname`}
            value={field.relationConfig?.foreignKeyName || ''}
            onChange={(e) =>
              updateRelationConfig({ foreignKeyName: e.target.value || undefined })
            }
            placeholder={t('autoGenerated')}
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            {t('foreignKeyHelp')}
          </p>
        </div>

        <Separator />

        {/* Cascade Delete */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label
              htmlFor={`${field.name}-cascade`}
              className="text-sm font-medium cursor-pointer"
            >
              {t('cascadeDelete')}
            </Label>
            <Switch
              id={`${field.name}-cascade`}
              checked={field.relationConfig?.cascadeDelete || false}
              onCheckedChange={(checked) =>
                updateRelationConfig({ cascadeDelete: checked })
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t('cascadeDeleteHelp')}
          </p>
        </div>

        <Separator />

        {/* Info */}
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          <p>
            {t('relationInfo')}
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
          <CardTitle className="text-base">{field.name || tFieldTypes('relationFieldFallback')}</CardTitle>
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
