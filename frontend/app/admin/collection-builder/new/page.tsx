'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Trash2, Database, ChevronRight, ChevronLeft, Pencil } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { IconSelector } from '@/components/collection-builder/IconSelector';
import { AddFieldModal } from '@/components/collection-builder/AddFieldModal';
import { EditFieldModal } from '@/components/collection-builder/EditFieldModal';
import { IndexesManager, type CollectionIndex } from '@/components/collection-builder/IndexesManager';
import { CollectionField, FieldType, CollectionDefinition } from '@/types';
import { adminApi, getErrorMessage } from '@/lib/api';
import { collectionSchema, type CollectionFormData } from '@/lib/schemas/collection';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// Helper function to convert display name to snake_case
function toSnakeCase(str: string): string {
  return str
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_+/g, '_') // Remove duplicate underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

export default function NewCollectionPage() {
  // All hooks must be called before any conditional returns
  const t = useTranslations('collectionBuilder');
  const router = useRouter();

  // Step state (1: Basic Info, 2: Fields, 3: Indexes, 4: Review)
  const [currentStep, setCurrentStep] = useState(1);

  // React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: '',
      apiName: '',
      displayName: '',
      description: '',
      icon: 'Database',
      fields: [],
      indexes: [],
    },
  });

  // Watch fields and indexes for dynamic rendering
  const fields = watch('fields');
  const indexes = watch('indexes') || [];
  const displayName = watch('displayName') || '';
  const icon = watch('icon');

  // UI state
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isAddFieldModalOpen, setIsAddFieldModalOpen] = useState(false);
  const [isEditFieldModalOpen, setIsEditFieldModalOpen] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldToRemove, setFieldToRemove] = useState<number | null>(null);
  const [modalKey, setModalKey] = useState(0);

  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="max-w-md text-center">
          <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">{t('devMode.title')}</h1>
          <p className="text-muted-foreground">
            {t('devMode.description')}
          </p>
        </div>
      </div>
    );
  }

  // Handle display name change and auto-generate name/apiName
  const handleDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Update the form field immediately
    setValue('displayName', value, { shouldValidate: false });

    // Auto-generate name and apiName from displayName (Strapi pattern)
    if (value) {
      const snakeCaseName = toSnakeCase(value);
      setValue('name', snakeCaseName, { shouldValidate: false });
      setValue('apiName', snakeCaseName, { shouldValidate: false });
    } else {
      // Clear fields when display name is empty
      setValue('name', '', { shouldValidate: false });
      setValue('apiName', '', { shouldValidate: false });
    }
  };

  // Step navigation
  const canGoToNextStep = () => {
    if (currentStep === 1) {
      // Step 1: Basic Info - require displayName
      return displayName && displayName.trim().length > 0;
    }
    if (currentStep === 2) {
      // Step 2: Fields - require at least 1 field
      return fields.length > 0;
    }
    return true;
  };

  const handleNextStep = () => {
    if (currentStep < 4 && canGoToNextStep()) {
      // Skip step 3 (indexes) if there's only 1 field or less
      if (currentStep === 2 && fields.length <= 1) {
        setCurrentStep(4);
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      // Skip step 3 (indexes) when going back if there's only 1 field or less
      if (currentStep === 4 && fields.length <= 1) {
        setCurrentStep(2);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  // Open modal to add new field
  const openAddFieldModal = () => {
    setEditingFieldIndex(null);
    setModalKey((prev) => prev + 1); // Increment to force remount
    setIsAddFieldModalOpen(true);
  };

  // Open modal to edit existing field
  const openEditFieldModal = (index: number) => {
    setEditingFieldIndex(index);
    setModalKey((prev) => prev + 1); // Increment to force remount
    setIsEditFieldModalOpen(true);
  };

  // Handle add field from modal
  const handleAddField = (field: CollectionField) => {
    setValue('fields', [...fields, field]);
  };

  // Handle update field from modal
  const handleUpdateField = (field: CollectionField) => {
    if (editingFieldIndex !== null) {
      const newFields = [...fields];
      newFields[editingFieldIndex] = field;
      setValue('fields', newFields);
      setEditingFieldIndex(null);
    }
  };

  // Open confirmation dialog for removing field
  const removeField = (index: number) => {
    setFieldToRemove(index);
  };

  // Confirm and remove field
  const confirmRemoveField = () => {
    if (fieldToRemove !== null) {
      setValue('fields', fields.filter((_, i) => i !== fieldToRemove));
      setFieldToRemove(null);
    }
  };

  // Get field type label
  const getFieldTypeLabel = (type: FieldType): string => {
    return t(`fieldTypes.${type}`) || type;
  };

  // Add new index
  const addIndex = () => {
    const collectionName = getValues('name');
    const newIndex = {
      name: `idx_${collectionName || 'collection'}_${indexes.length + 1}`,
      fields: ['', ''], // Initialize with 2 empty field slots
      unique: false,
    };
    setValue('indexes', [...indexes, newIndex]);
  };

  // Update index
  const updateIndex = (
    index: number,
    updates: Partial<{ name: string; fields: string[]; unique: boolean }>
  ) => {
    const newIndexes = [...indexes];
    newIndexes[index] = { ...newIndexes[index], ...updates };
    setValue('indexes', newIndexes);
  };

  // Remove index
  const removeIndex = (index: number) => {
    setValue('indexes', indexes.filter((_, i) => i !== index));
  };

  // Submit form
  const onSubmit = async (data: CollectionFormData) => {
    // Clear previous messages
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const collectionInput: Omit<CollectionDefinition, 'id' | 'isSystem' | 'createdBy' | 'createdAt' | 'updatedAt'> = {
        name: data.name,
        apiName: data.apiName,
        displayName: data.displayName,
        description: data.description || undefined,
        icon: data.icon,
        fields: data.fields,
        indexes: data.indexes && data.indexes.length > 0 ? data.indexes : undefined,
      };

      const response = await adminApi.createCollectionDefinition(collectionInput);
      const { data: result } = response.data;

      setSuccessMessage(t('success.created'));

      // Redirect after delay to allow server restart and migration application
      // Server restarts immediately after creation, typically takes 3-5 seconds
      setTimeout(() => {
        router.push(`/admin/collection-builder/${result.id}`);
      }, 5000);
    } catch (error) {
      console.error('Failed to create collection:', error);
      setErrorMessage(getErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-5xl mx-auto py-6 space-y-6">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/admin" className="hover:text-foreground">
              {t('breadcrumbs.admin')}
            </Link>
            <span>/</span>
            <Link href="/admin/collection-builder" className="hover:text-foreground">
              {t('breadcrumbs.collectionBuilder')}
            </Link>
            <span>/</span>
            <span className="text-foreground">{t('breadcrumbs.newCollection')}</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/admin/collection-builder">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{t('actions.createNew')}</h1>
                <p className="text-muted-foreground text-sm mt-1">
                  {t('steps.stepIndicator', { current: currentStep, total: 4 })}
                </p>
              </div>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                    step === currentStep
                      ? 'border-primary bg-primary text-primary-foreground'
                      : step < currentStep
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                  }`}
                >
                  {step}
                </div>
                {step < 4 && (
                  <div
                    className={`w-16 h-0.5 mx-2 ${
                      step < currentStep ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

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
          {(errors.fields || errors.indexes) && (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="font-semibold mb-2">{t('validation.fixErrors')}</div>
                {errors.fields && <p className="text-sm">{errors.fields.message}</p>}
                {errors.indexes && <p className="text-sm">{errors.indexes.message}</p>}
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('steps.basicInfo.title')}</CardTitle>
                <CardDescription>{t('steps.basicInfo.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="display-name">
                    {t('form.displayName.label')} <span className="text-destructive">{t('form.displayName.required')}</span>
                  </Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={handleDisplayNameChange}
                    placeholder={t('form.displayName.placeholder')}
                    className="text-lg"
                  />
                  {errors.displayName && (
                    <p className="text-xs text-destructive">{errors.displayName.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t('form.displayName.help')}
                  </p>
                </div>

                <Separator />

                <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{t('form.autoGenerated.badge')}</Badge>
                    <span className="text-sm text-muted-foreground">{t('form.autoGenerated.description')}</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('form.collectionName.label')}</Label>
                    <div className="font-mono text-sm bg-background border rounded p-2">
                      {getValues('name') || t('form.collectionName.placeholder')}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">{t('form.apiName.label')}</Label>
                    <div className="font-mono text-sm bg-background border rounded p-2">
                      {t('form.apiName.prefix')}{getValues('apiName') || t('form.collectionName.placeholder')}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="description">{t('form.description.label')}</Label>
                  <Input
                    id="description"
                    {...register('description')}
                    placeholder={t('form.description.placeholder')}
                  />
                  {errors.description && (
                    <p className="text-xs text-destructive">{errors.description.message}</p>
                  )}
                </div>

                <IconSelector
                  value={icon || 'Database'}
                  onChange={(value) => setValue('icon', value)}
                  error={errors.icon?.message}
                />
              </CardContent>
            </Card>
          )}

          {/* Step 2: Fields */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('steps.fields.title')}</CardTitle>
                    <CardDescription>{t('steps.fields.description')}</CardDescription>
                  </div>
                  <Button onClick={openAddFieldModal} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('actions.addField')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                    <Database className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">{t('fieldsTable.emptyState.title')}</p>
                    <p className="text-sm text-muted-foreground mt-1">{t('fieldsTable.emptyState.description')}</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t('fieldsTable.headers.fieldName')}</TableHead>
                          <TableHead>{t('fieldsTable.headers.type')}</TableHead>
                          <TableHead>{t('fieldsTable.headers.label')}</TableHead>
                          <TableHead>{t('fieldsTable.headers.required')}</TableHead>
                          <TableHead className="text-right">{t('fieldsTable.headers.actions')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-mono font-medium">{field.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{getFieldTypeLabel(field.type)}</Badge>
                            </TableCell>
                            <TableCell>{field.label}</TableCell>
                            <TableCell>
                              {field.required && <Badge variant="secondary">{t('fieldsTable.badges.required')}</Badge>}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditFieldModal(index)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeField(index)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
        </Card>
          )}

          {/* Step 3: Indexes (Optional) */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('steps.indexes.title')}</CardTitle>
                    <CardDescription>{t('steps.indexes.description')}</CardDescription>
                  </div>
                  <Button onClick={addIndex} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    {t('actions.addIndex')}
                  </Button>
                </div>
              </CardHeader>
        <CardContent className="space-y-4">
                <IndexesManager
                  indexes={indexes as CollectionIndex[]}
                  fields={fields}
                  onAddIndex={addIndex}
                  onUpdateIndex={updateIndex}
                  onRemoveIndex={removeIndex}
                  showAddButton={false}
                />
          </CardContent>
        </Card>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('steps.review.title')}</CardTitle>
                <CardDescription>{t('steps.review.description')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">{t('review.displayName')}</Label>
                    <div className="font-medium">{displayName || t('review.notSet')}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">{t('review.icon')}</Label>
                    <div className="font-medium">{icon}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">{t('review.collectionName')}</Label>
                    <div className="font-mono text-sm">{getValues('name') || t('review.notSet')}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">{t('review.apiEndpoint')}</Label>
                    <div className="font-mono text-sm">{t('form.apiName.prefix')}{getValues('apiName') || t('review.notSet')}</div>
                  </div>
                </div>

                {getValues('description') && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">{t('review.description')}</Label>
                      <div className="text-sm">{getValues('description')}</div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>{t('review.fields.title')}</Label>
                    <Badge>{fields.length === 1 ? t('review.fields.count', { count: fields.length }) : t('review.fields.count_plural', { count: fields.length })}</Badge>
                  </div>
                  {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t('review.fields.noFields')}</p>
                  ) : (
                    <div className="space-y-2">
                      {fields.map((field, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                          <Badge variant="outline" className="font-mono text-xs">
                            {field.type}
                          </Badge>
                          <span className="font-mono font-medium">{field.name}</span>
                          <span className="text-muted-foreground">-</span>
                          <span>{field.label}</span>
                          {field.required && (
                            <Badge variant="secondary" className="text-xs ml-auto">
                              {t('fieldsTable.badges.required')}
                            </Badge>
                          )}
                          {field.unique && (
                            <Badge variant="secondary" className="text-xs">
                              {t('fieldsTable.badges.unique')}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {indexes.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>{t('review.indexes.title')}</Label>
                        <Badge>{indexes.length === 1 ? t('review.indexes.count', { count: indexes.length }) : t('review.indexes.count_plural', { count: indexes.length })}</Badge>
                      </div>
                      <div className="space-y-2">
                        {indexes.map((index, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                            <Badge variant="outline" className="text-xs">
                              {index.unique ? t('review.indexes.unique') : t('review.indexes.index')}
                            </Badge>
                            <span className="font-mono text-xs">{index.name}</span>
                            <span className="text-muted-foreground text-xs">{t('review.indexes.on')}</span>
                            <span className="font-mono text-xs">{index.fields.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-6 border-t">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={handlePreviousStep}>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  {t('actions.previous')}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link href="/admin/collection-builder">{t('actions.cancel')}</Link>
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={!canGoToNextStep()}
                >
                  {t('actions.next')}
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? t('actions.creating') : t('actions.createCollectionButton')}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Field Modal */}
      <AddFieldModal
        key={`add-${modalKey}`}
        open={isAddFieldModalOpen}
        onOpenChange={setIsAddFieldModalOpen}
        onAdd={handleAddField}
        existingFieldNames={fields.map((f) => f.name)}
      />

      {/* Edit Field Modal */}
      {editingFieldIndex !== null && (
        <EditFieldModal
          key={`edit-${modalKey}`}
          open={isEditFieldModalOpen}
          onOpenChange={(open) => {
            setIsEditFieldModalOpen(open);
            if (!open) {
              setEditingFieldIndex(null);
            }
          }}
          onSave={handleUpdateField}
          field={fields[editingFieldIndex]}
          existingFieldNames={fields
            .filter((_, idx) => idx !== editingFieldIndex)
            .map((f) => f.name)}
        />
      )}

      {/* Remove Field Confirmation Dialog */}
      <AlertDialog open={fieldToRemove !== null} onOpenChange={(open) => !open && setFieldToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('removeField.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('removeField.description', { fieldName: fieldToRemove !== null ? fields[fieldToRemove]?.label || fields[fieldToRemove]?.name : '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('removeField.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveField}>{t('removeField.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
