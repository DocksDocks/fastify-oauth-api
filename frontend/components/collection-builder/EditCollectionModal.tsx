'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IndexesManager, type CollectionIndex } from '@/components/collection-builder/IndexesManager';
import { CollectionDefinition } from '@/types';
import { adminApi, getErrorMessage } from '@/lib/api';
import { collectionSchema, type CollectionFormData } from '@/lib/schemas/collection';

interface EditCollectionModalProps {
  collection: CollectionDefinition;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCollectionModal({ collection, isOpen, onClose, onSuccess }: EditCollectionModalProps) {
  const t = useTranslations('collectionBuilder.editCollectionModal');

  // Form state
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: collection.name,
      apiName: collection.apiName,
      displayName: collection.displayName,
      description: collection.description || '',
      icon: collection.icon || 'Database',
      fields: collection.fields,
      indexes: collection.indexes || [],
    },
  });

  // Watch indexes for dynamic rendering
  const indexes = watch('indexes') || [];

  // UI state
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<string>('basic');

  // Reset form when collection changes
  useEffect(() => {
    if (collection) {
      reset({
        name: collection.name,
        apiName: collection.apiName,
        displayName: collection.displayName,
        description: collection.description || '',
        icon: collection.icon || 'Database',
        fields: collection.fields,
        indexes: collection.indexes || [],
      });
      setActiveTab('basic');
    }
  }, [collection, reset]);

  // Index management functions
  const addIndex = () => {
    const collectionName = getValues('name');
    const newIndex: CollectionIndex = {
      name: `idx_${collectionName || 'collection'}_${indexes.length + 1}`,
      fields: [],
      unique: false,
    };
    setValue('indexes', [...indexes, newIndex]);
  };

  const updateIndex = (index: number, updates: Partial<CollectionIndex>) => {
    const newIndexes = [...indexes];
    newIndexes[index] = { ...newIndexes[index], ...updates };
    setValue('indexes', newIndexes);
  };

  const removeIndex = (index: number) => {
    setValue('indexes', indexes.filter((_, i) => i !== index));
  };

  // Submit form
  const onSubmit = async (data: CollectionFormData) => {
    // Clear previous messages
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const updatePayload = {
        displayName: data.displayName,
        description: data.description || undefined,
        icon: data.icon,
        indexes: data.indexes && data.indexes.length > 0 ? data.indexes : undefined,
      };

      await adminApi.updateCollectionDefinition(collection.id, updatePayload);

      setSuccessMessage(t('successMessage'));

      // Wait a bit to show success message, then call onSuccess
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Failed to update collection:', error);
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title', { name: collection.displayName })}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Success Message */}
          {successMessage && (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Validation Errors */}
          {errors.indexes && (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="font-semibold mb-2">{t('errorMessage')}</div>
                <p className="text-sm">{errors.indexes.message}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs for Basic and Advanced Settings */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">{t('basicInfo')}</TabsTrigger>
              <TabsTrigger value="advanced">{t('advanced')}</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-6 mt-6">
              {/* Read-Only Info */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('collectionInfoReadOnly')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{t('collectionNameLabel')}</Label>
                      <Input value={collection.name} disabled className="font-mono bg-muted" />
                      <p className="text-xs text-muted-foreground">
                        {t('collectionNameHelp')}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('apiNameLabel')}</Label>
                      <Input value={collection.apiName} disabled className="font-mono bg-muted" />
                      <p className="text-xs text-muted-foreground">
                        {t('apiNameHelp')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Editable Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>{t('metadataEditable')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-display-name">
                      {t('displayNameLabel')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="edit-display-name"
                      {...register('displayName')}
                      placeholder={t('displayNamePlaceholder')}
                    />
                    {errors.displayName && (
                      <p className="text-xs text-destructive">{errors.displayName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">{t('descriptionLabel')}</Label>
                    <Input
                      id="edit-description"
                      {...register('description')}
                      placeholder={t('descriptionPlaceholder')}
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-icon">{t('iconLabel')}</Label>
                    <Input id="edit-icon" {...register('icon')} placeholder={t('iconPlaceholder')} />
                    {errors.icon && <p className="text-xs text-destructive">{errors.icon.message}</p>}
                    <p className="text-xs text-muted-foreground">
                      {t('iconHelp')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Advanced Tab - Indexes */}
            <TabsContent value="advanced" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{t('indexesOptional')}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {t('indexesDescription')}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">{t('indexChangesAlert')}</div>
                      <p className="text-sm">
                        {t('indexChangesDescription')}
                      </p>
                    </AlertDescription>
                  </Alert>

                  <IndexesManager
                    indexes={indexes as CollectionIndex[]}
                    fields={collection.fields}
                    onAddIndex={addIndex}
                    onUpdateIndex={updateIndex}
                    onRemoveIndex={removeIndex}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              {t('cancel')}
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? t('saving') : t('saveChanges')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
