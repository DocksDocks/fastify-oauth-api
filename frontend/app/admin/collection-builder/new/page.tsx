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
  // Only allow access in development mode
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="max-w-md text-center">
          <Database className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Development Only Feature</h1>
          <p className="text-muted-foreground">
            The Collection Builder is only available in development mode. This feature is not accessible in production environments.
          </p>
        </div>
      </div>
    );
  }

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
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldToRemove, setFieldToRemove] = useState<number | null>(null);
  const [modalKey, setModalKey] = useState(0);

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
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
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
    setIsAddFieldModalOpen(true);
  };

  // Handle add/update field from modal
  const handleFieldModalSubmit = (field: CollectionField) => {
    if (editingFieldIndex !== null) {
      // Update existing field
      const newFields = [...fields];
      newFields[editingFieldIndex] = field;
      setValue('fields', newFields);
    } else {
      // Add new field
      setValue('fields', [...fields, field]);
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
    const typeLabels: Record<FieldType, string> = {
      text: 'Text',
      longtext: 'Long Text',
      richtext: 'Rich Text',
      number: 'Number',
      date: 'Date',
      datetime: 'Date & Time',
      boolean: 'Boolean',
      enum: 'Enum',
      json: 'JSON',
      relation: 'Relation',
      media: 'Media',
    };
    return typeLabels[type] || type;
  };

  // Add new index
  const addIndex = () => {
    const collectionName = getValues('name');
    const newIndex = {
      name: `idx_${collectionName || 'collection'}_${indexes.length + 1}`,
      fields: [],
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
      const result = response.data;

      setSuccessMessage('Collection created successfully! Server is restarting to apply migrations...');

      // Redirect after a short delay to show success message
      setTimeout(() => {
        router.push(`/admin/collection-builder/${result.id}`);
      }, 1500);
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
                  Step {currentStep} of 4
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
                <div className="font-semibold mb-2">Please fix validation errors</div>
                {errors.fields && <p className="text-sm">{errors.fields.message}</p>}
                {errors.indexes && <p className="text-sm">{errors.indexes.message}</p>}
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Define your collection name and metadata</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="display-name">
                    Display Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    onChange={handleDisplayNameChange}
                    placeholder="Blog Posts"
                    className="text-lg"
                  />
                  {errors.displayName && (
                    <p className="text-xs text-destructive">{errors.displayName.message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Human-readable name (e.g., Blog Posts, User Profiles)
                  </p>
                </div>

                <Separator />

                <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Auto-generated</Badge>
                    <span className="text-sm text-muted-foreground">The following are generated automatically:</span>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Collection Name (Database Table)</Label>
                    <div className="font-mono text-sm bg-background border rounded p-2">
                      {getValues('name') || 'blog_posts'}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-muted-foreground">API Name (Endpoint)</Label>
                    <div className="font-mono text-sm bg-background border rounded p-2">
                      /api/collections/{getValues('apiName') || 'blog_posts'}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    {...register('description')}
                    placeholder="Describe what this collection is for"
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
                    <CardTitle>Fields</CardTitle>
                    <CardDescription>Define the fields for your collection</CardDescription>
                  </div>
                  <Button onClick={openAddFieldModal} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fields.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                    <Database className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No fields added yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Click &quot;Add Field&quot; to get started</p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Field Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Label</TableHead>
                          <TableHead>Required</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
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
                              {field.required && <Badge variant="secondary">Required</Badge>}
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
                    <CardTitle>Indexes (Optional)</CardTitle>
                    <CardDescription>Add database indexes for better query performance</CardDescription>
                  </div>
                  <Button onClick={addIndex} size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Index
                  </Button>
                </div>
              </CardHeader>
        <CardContent className="space-y-4">
          {indexes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No indexes added. Indexes can improve query performance.
            </div>
          ) : (
            <div className="space-y-4">
              {indexes.map((index, idx) => (
                <Card key={idx}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <Label>Index Name</Label>
                          <Input
                            value={index.name}
                            onChange={(e) => updateIndex(idx, { name: e.target.value })}
                            placeholder="idx_collection_field"
                            className="font-mono"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Fields to Index</Label>
                          <p className="text-xs text-muted-foreground mb-2">
                            Select fields from the list above (comma-separated)
                          </p>
                          <Input
                            value={index.fields.join(', ')}
                            onChange={(e) =>
                              updateIndex(idx, {
                                fields: e.target.value.split(',').map((f) => f.trim()),
                              })
                            }
                            placeholder="field_1, field_2"
                            className="font-mono"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`unique-${idx}`}
                            checked={index.unique}
                            onChange={(e) => updateIndex(idx, { unique: e.target.checked })}
                            className="rounded border-input"
                          />
                          <Label htmlFor={`unique-${idx}`} className="font-normal cursor-pointer">
                            Unique constraint
                          </Label>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeIndex(idx)}
                        className="ml-4"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              </div>
            )}
          </CardContent>
        </Card>
          )}

          {/* Step 4: Review & Create */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Review & Create</CardTitle>
                <CardDescription>Review your collection before creating</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Display Name</Label>
                    <div className="font-medium">{displayName || '(not set)'}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Icon</Label>
                    <div className="font-medium">{icon}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Collection Name</Label>
                    <div className="font-mono text-sm">{getValues('name') || '(not set)'}</div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">API Endpoint</Label>
                    <div className="font-mono text-sm">/api/collections/{getValues('apiName') || '(not set)'}</div>
                  </div>
                </div>

                {getValues('description') && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Description</Label>
                      <div className="text-sm">{getValues('description')}</div>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Fields</Label>
                    <Badge>{fields.length} field{fields.length !== 1 ? 's' : ''}</Badge>
                  </div>
                  {fields.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No fields added</p>
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
                              Required
                            </Badge>
                          )}
                          {field.unique && (
                            <Badge variant="secondary" className="text-xs">
                              Unique
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
                        <Label>Indexes</Label>
                        <Badge>{indexes.length} index{indexes.length !== 1 ? 'es' : ''}</Badge>
                      </div>
                      <div className="space-y-2">
                        {indexes.map((index, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-sm p-2 rounded-md bg-muted/50">
                            <Badge variant="outline" className="text-xs">
                              {index.unique ? 'Unique' : 'Index'}
                            </Badge>
                            <span className="font-mono text-xs">{index.name}</span>
                            <span className="text-muted-foreground text-xs">on</span>
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
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild>
                <Link href="/admin/collection-builder">Cancel</Link>
              </Button>

              {currentStep < 4 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={!canGoToNextStep()}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  size="lg"
                >
                  {isSubmitting ? 'Creating...' : 'Create Collection'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Field Modal */}
      <AddFieldModal
        key={modalKey}
        open={isAddFieldModalOpen}
        onOpenChange={setIsAddFieldModalOpen}
        onAdd={handleFieldModalSubmit}
        editField={editingFieldIndex !== null ? fields[editingFieldIndex] : undefined}
        existingFieldNames={fields.map((f) => f.name)}
      />

      {/* Remove Field Confirmation Dialog */}
      <AlertDialog open={fieldToRemove !== null} onOpenChange={(open) => !open && setFieldToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove the field &quot;{fieldToRemove !== null ? fields[fieldToRemove]?.label || fields[fieldToRemove]?.name : ''}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveField}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
