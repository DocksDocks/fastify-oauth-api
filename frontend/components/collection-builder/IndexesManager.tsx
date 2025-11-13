'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CollectionField } from '@/types';

export interface CollectionIndex {
  name: string;
  fields: string[];
  unique: boolean;
}

interface IndexesManagerProps {
  indexes: CollectionIndex[];
  fields: CollectionField[];
  onAddIndex: () => void;
  onUpdateIndex: (index: number, updates: Partial<CollectionIndex>) => void;
  onRemoveIndex: (index: number) => void;
  showAddButton?: boolean;
}

export function IndexesManager({
  indexes,
  fields,
  onAddIndex,
  onUpdateIndex,
  onRemoveIndex,
  showAddButton = true,
}: IndexesManagerProps) {
  const t = useTranslations('collectionBuilder');

  const updateIndexField = (indexIdx: number, fieldPosition: number, value: string) => {
    const newFields = [...indexes[indexIdx].fields];
    newFields[fieldPosition] = value;
    onUpdateIndex(indexIdx, { fields: newFields });
  };

  if (indexes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8 text-muted-foreground text-sm">
          {t('indexes.emptyState')}
        </div>
        {showAddButton && (
          <div className="flex justify-center">
            <Button onClick={onAddIndex} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              {t('actions.addIndex')}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {indexes.map((index, idx) => (
        <Card key={idx}>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label>{t('indexes.indexName.label')}</Label>
                  <Input
                    value={index.name}
                    onChange={(e) => onUpdateIndex(idx, { name: e.target.value })}
                    placeholder={t('indexes.indexName.placeholder')}
                    className="font-mono"
                  />
                </div>

                <div className="space-y-4">
                  <Label>{t('indexes.fieldsToIndex.label')}</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    {t('indexes.fieldsToIndex.help')}
                  </p>

                  {/* First Field Select */}
                  <div className="space-y-2">
                    <Label className="text-sm">{t('indexes.fieldsToIndex.firstField')}</Label>
                    <Select
                      value={index.fields[0] || ''}
                      onValueChange={(value) => updateIndexField(idx, 0, value)}
                    >
                      <SelectTrigger className="font-mono">
                        {index.fields[0] ? (
                          <span>
                            {index.fields[0]}{' '}
                            <span className="text-muted-foreground">
                              ({fields.find((f) => f.name === index.fields[0])?.type})
                            </span>
                          </span>
                        ) : (
                          <SelectValue placeholder={t('indexes.fieldsToIndex.selectPlaceholder')} />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {fields
                          .filter((field) => field.name !== index.fields[1])
                          .map((field) => (
                            <SelectItem key={field.name} value={field.name} className="font-mono">
                              {field.name}{' '}
                              <span className="text-muted-foreground">({field.type})</span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Second Field Select */}
                  <div className="space-y-2">
                    <Label className="text-sm">{t('indexes.fieldsToIndex.secondField')}</Label>
                    <Select
                      value={index.fields[1] || ''}
                      onValueChange={(value) => updateIndexField(idx, 1, value)}
                    >
                      <SelectTrigger className="font-mono">
                        {index.fields[1] ? (
                          <span>
                            {index.fields[1]}{' '}
                            <span className="text-muted-foreground">
                              ({fields.find((f) => f.name === index.fields[1])?.type})
                            </span>
                          </span>
                        ) : (
                          <SelectValue placeholder={t('indexes.fieldsToIndex.selectPlaceholder')} />
                        )}
                      </SelectTrigger>
                      <SelectContent>
                        {fields
                          .filter((field) => field.name !== index.fields[0])
                          .map((field) => (
                            <SelectItem key={field.name} value={field.name} className="font-mono">
                              {field.name}{' '}
                              <span className="text-muted-foreground">({field.type})</span>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`unique-${idx}`}
                    checked={index.unique}
                    onChange={(e) => onUpdateIndex(idx, { unique: e.target.checked })}
                    className="rounded border-input"
                  />
                  <Label htmlFor={`unique-${idx}`} className="font-normal cursor-pointer">
                    {t('indexes.uniqueConstraint')}
                  </Label>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemoveIndex(idx)}
                className="ml-4"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {showAddButton && (
        <div className="flex justify-center pt-2">
          <Button onClick={onAddIndex} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {t('actions.addIndex')}
          </Button>
        </div>
      )}
    </div>
  );
}
