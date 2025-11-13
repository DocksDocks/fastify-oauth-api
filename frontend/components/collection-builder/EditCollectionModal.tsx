'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

      setSuccessMessage('Collection updated successfully!');

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
          <DialogTitle>Edit Collection: {collection.displayName}</DialogTitle>
          <DialogDescription>
            Update collection metadata and manage indexes.
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
                <div className="font-semibold mb-2">Please fix validation errors</div>
                <p className="text-sm">{errors.indexes.message}</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Tabs for Basic and Advanced Settings */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="advanced">Advanced (Indexes)</TabsTrigger>
            </TabsList>

            {/* Basic Tab */}
            <TabsContent value="basic" className="space-y-6 mt-6">
              {/* Read-Only Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Collection Info (Read-Only)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Collection Name (Table Name)</Label>
                      <Input value={collection.name} disabled className="font-mono bg-muted" />
                      <p className="text-xs text-muted-foreground">
                        Cannot be changed (database table name)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>API Name (Endpoint)</Label>
                      <Input value={collection.apiName} disabled className="font-mono bg-muted" />
                      <p className="text-xs text-muted-foreground">
                        Cannot be changed (API endpoint name)
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Editable Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle>Metadata (Editable)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-display-name">
                      Display Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="edit-display-name"
                      {...register('displayName')}
                      placeholder="My Collection"
                    />
                    {errors.displayName && (
                      <p className="text-xs text-destructive">{errors.displayName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Input
                      id="edit-description"
                      {...register('description')}
                      placeholder="Optional description"
                    />
                    {errors.description && (
                      <p className="text-xs text-destructive">{errors.description.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-icon">Icon</Label>
                    <Input id="edit-icon" {...register('icon')} placeholder="Database" />
                    {errors.icon && <p className="text-xs text-destructive">{errors.icon.message}</p>}
                    <p className="text-xs text-muted-foreground">
                      Lucide icon name (e.g., Database, User, FileText)
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
                      <CardTitle>Indexes (Optional)</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create composite indexes to improve query performance
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Alert className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="font-semibold mb-1">Index Changes Require Migration</div>
                      <p className="text-sm">
                        Adding or modifying indexes will generate a new migration. Review and apply
                        carefully.
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
              Cancel
            </Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
