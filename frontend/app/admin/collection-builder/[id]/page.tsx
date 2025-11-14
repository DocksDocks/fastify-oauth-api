'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Edit, Plus, Pencil, Trash2, Search, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { EditCollectionModal } from '@/components/collection-builder/EditCollectionModal';
import { AddFieldModal } from '@/components/collection-builder/AddFieldModal';
import { EditFieldModal } from '@/components/collection-builder/EditFieldModal';
import { adminApi, getErrorMessage } from '@/lib/api';
import { CollectionDefinition, CollectionField, FieldType } from '@/types';
import axios from 'axios';

// Sortable Table Row Component
function SortableRow({
  field,
  actualIndex,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  getFieldTypeLabel,
  t,
}: {
  field: CollectionField;
  actualIndex: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  getFieldTypeLabel: (type: FieldType) => string;
  t: (key: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `field-${actualIndex}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <button
            className="cursor-grab active:cursor-grabbing hover:text-muted-foreground focus:outline-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <span className="font-mono font-medium">{field.name}</span>
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{getFieldTypeLabel(field.type)}</Badge>
      </TableCell>
      <TableCell>{field.label}</TableCell>
      <TableCell>
        {field.required && <Badge variant="secondary">{t('fieldsTable.badges.required')}</Badge>}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onEdit} title={t('collectionDetail.editFieldTitle')}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title={t('collectionDetail.deleteFieldTitle')}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap params using React.use()
  const { id } = use(params);

  // All hooks must be called before any conditional returns
  const t = useTranslations('collectionBuilder');

  // Data state
  const [collection, setCollection] = useState<CollectionDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pending changes state - tracks local modifications before saving
  const [pendingFields, setPendingFields] = useState<CollectionField[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // UI state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [showEditFieldModal, setShowEditFieldModal] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<number | null>(null);

  // Filter/search state
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection state
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());

  // Check if there are unsaved changes
  const hasUnsavedChanges =
    collection &&
    JSON.stringify(pendingFields) !== JSON.stringify(collection.fields);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Sync pendingFields when collection loads
  useEffect(() => {
    if (collection) {
      setPendingFields(collection.fields);
    }
  }, [collection]);

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

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

  const loadCollection = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getCollectionDefinition(Number(id));
      setCollection(response.data.data || response.data);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load collection:', err);
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || t('messages.failedToLoadCollection'));
      } else {
        setError(t('messages.failedToLoadCollection'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getFieldTypeLabel = (type: FieldType): string => {
    return t(`fieldTypes.${type}`) || type;
  };

  const openAddFieldModal = () => {
    setEditingFieldIndex(null);
    setShowAddFieldModal(true);
  };

  const openEditFieldModal = (index: number) => {
    setEditingFieldIndex(index);
    setShowEditFieldModal(true);
  };

  const handleAddField = (field: CollectionField) => {
    const updatedFields = [...pendingFields, field];
    setPendingFields(updatedFields);
    setShowAddFieldModal(false);
  };

  const handleUpdateField = (field: CollectionField) => {
    if (editingFieldIndex === null) return;

    const updatedFields = [...pendingFields];
    updatedFields[editingFieldIndex] = field;
    setPendingFields(updatedFields);
    setShowEditFieldModal(false);
    setEditingFieldIndex(null);
  };

  const handleDeleteField = (index: number) => {
    const updatedFields = pendingFields.filter((_, i) => i !== index);
    setPendingFields(updatedFields);
    setFieldToDelete(null);
  };

  const handleBulkDelete = () => {
    if (selectedFields.size === 0) return;

    const updatedFields = pendingFields.filter((_, i) => !selectedFields.has(i));
    setPendingFields(updatedFields);
    setSelectedFields(new Set());
  };

  const toggleFieldSelection = (index: number) => {
    const newSelection = new Set(selectedFields);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedFields(newSelection);
  };

  const toggleSelectAll = () => {
    const filteredIndices = getFilteredFields().map((field) =>
      pendingFields.findIndex(f => f === field)
    );

    if (selectedFields.size === filteredIndices.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(filteredIndices));
    }
  };

  const getFilteredFields = () => {
    if (!searchQuery.trim()) {
      return pendingFields;
    }

    const query = searchQuery.toLowerCase();
    return pendingFields.filter(
      (field) =>
        field.name.toLowerCase().includes(query) ||
        field.label.toLowerCase().includes(query) ||
        field.type.toLowerCase().includes(query)
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) return;

    if (active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('field-', ''));
      const newIndex = parseInt(over.id.toString().replace('field-', ''));

      const reorderedFields = arrayMove(pendingFields, oldIndex, newIndex);
      setPendingFields(reorderedFields);
    }
  };

  // Save all pending changes
  const handleSaveChanges = async () => {
    if (!collection || !hasUnsavedChanges) return;

    try {
      setIsSaving(true);

      // Send update to backend with pending fields
      await adminApi.updateCollectionDefinition(Number(id), {
        fields: pendingFields,
      });

      // Reload collection to get fresh data and reset pending state
      await loadCollection();
      setSelectedFields(new Set());
    } catch (err: unknown) {
      console.error('Failed to save changes:', err);
      alert(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Discard pending changes
  const handleDiscardChanges = () => {
    if (!collection) return;

    if (confirm(t('saveChanges.discardConfirm'))) {
      setPendingFields(collection.fields);
      setSelectedFields(new Set());
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">{t('messages.loadingCollection')}</p>
      </div>
    );
  }

  // Error state
  if (error || !collection) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/admin" className="hover:text-foreground">
            {t('breadcrumbs.admin')}
          </Link>
          <span>/</span>
          <Link href="/admin/collection-builder" className="hover:text-foreground">
            {t('breadcrumbs.collectionBuilder')}
          </Link>
          <span>/</span>
          <span className="text-foreground">{t('messages.collectionNotFound')}</span>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/collection-builder">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{t('messages.collectionNotFound')}</h1>
        </div>

        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <Database className="h-16 w-16 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('messages.collectionNotFound')}</h2>
          <p className="text-muted-foreground mb-6">
            {error || t('messages.collectionNotFoundDescription')}
          </p>
          <Button asChild>
            <Link href="/admin/collection-builder">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('messages.backToCollections')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto py-6 space-y-6 pb-12">
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
        <span className="text-foreground">{collection.displayName}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/collection-builder">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">{collection.displayName}</h1>
        {collection.isSystem && (
          <Badge variant="outline">{t('collectionDetail.systemCollection')}</Badge>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Collection Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{t('collectionDetail.collectionDetails')}</CardTitle>
                <CardDescription>{t('collectionDetail.collectionDetailsDescription')}</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}>
                <Edit className="h-4 w-4 mr-2" />
                {t('collectionDetail.editCollection')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{t('collectionDetail.collectionName')}</span>
                <div className="font-mono text-sm">{collection.name}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{t('collectionDetail.apiName')}</span>
                <div className="font-mono text-sm">{collection.apiName}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{t('collectionDetail.displayName')}</span>
                <div className="text-sm">{collection.displayName}</div>
              </div>
              {collection.description && (
                <div className="space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">{t('collectionDetail.description')}</span>
                  <div className="text-sm">{collection.description}</div>
                </div>
              )}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">{t('collectionDetail.icon')}</span>
                <div className="font-mono text-sm">{collection.icon || t('collectionDetail.defaultIcon')}</div>
              </div>
            </div>

            {/* Indexes */}
            {collection.indexes && collection.indexes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-semibold">{t('collectionDetail.indexes')} ({collection.indexes.length})</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {collection.indexes.map((index) => (
                      <div key={index.name} className="text-sm font-mono flex items-center gap-2">
                        <span>{index.name}</span>
                        {index.unique && <Badge variant="outline" className="text-xs">{t('collectionDetail.unique')}</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div>{t('collectionDetail.created')} {new Date(collection.createdAt).toLocaleString()}</div>
              <div>{t('collectionDetail.updated')} {new Date(collection.updatedAt).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Fields Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>
                  {t('collectionDetail.fields')} ({pendingFields.length})
                  {hasUnsavedChanges && (
                    <Badge variant="secondary" className="ml-2">
                      {t('saveChanges.unsavedChanges')}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>{t('collectionDetail.fieldsDescription')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {hasUnsavedChanges && (
                  <>
                    <Button onClick={handleDiscardChanges} size="sm" variant="outline" disabled={isSaving}>
                      {t('saveChanges.discard')}
                    </Button>
                    <Button onClick={handleSaveChanges} size="sm" disabled={isSaving}>
                      {isSaving ? t('saveChanges.saving') : t('saveChanges.save')}
                    </Button>
                  </>
                )}
                <Button onClick={openAddFieldModal} size="sm" variant={hasUnsavedChanges ? 'outline' : 'default'}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('collectionDetail.addField')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Bulk Actions */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('fieldsTable.search') || 'Search fields by name, label, or type...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Bulk Actions */}
              {selectedFields.size > 0 && (
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selectedFields.size} {t('collectionDetail.selected')}</Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(t('collectionDetail.deleteSelectedConfirm', { count: selectedFields.size }))) {
                        handleBulkDelete();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('collectionDetail.deleteSelected')}
                  </Button>
                </div>
              )}
            </div>

            {/* Fields Table */}
            {getFilteredFields().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? t('collectionDetail.noFieldsMatch') : t('fieldsTable.emptyState.title')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? t('collectionDetail.tryDifferentSearch') : t('fieldsTable.emptyState.description')}
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={
                              selectedFields.size === getFilteredFields().length &&
                              getFilteredFields().length > 0
                            }
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>{t('fieldsTable.headers.fieldName')}</TableHead>
                        <TableHead>{t('fieldsTable.headers.type')}</TableHead>
                        <TableHead>{t('fieldsTable.headers.label')}</TableHead>
                        <TableHead>{t('fieldsTable.headers.required')}</TableHead>
                        <TableHead className="text-right">{t('fieldsTable.headers.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <SortableContext
                      items={pendingFields.map((_, idx) => `field-${idx}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <TableBody>
                        {getFilteredFields().map((field) => {
                          const actualIndex = pendingFields.indexOf(field);
                          return (
                            <SortableRow
                              key={actualIndex}
                              field={field}
                              actualIndex={actualIndex}
                              isSelected={selectedFields.has(actualIndex)}
                              onToggleSelect={() => toggleFieldSelection(actualIndex)}
                              onEdit={() => openEditFieldModal(actualIndex)}
                              onDelete={() => setFieldToDelete(actualIndex)}
                              getFieldTypeLabel={getFieldTypeLabel}
                              t={t}
                            />
                          );
                        })}
                      </TableBody>
                    </SortableContext>
                  </Table>
                </div>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Edit Collection Modal */}
      {collection && (
        <EditCollectionModal
          collection={collection}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            loadCollection();
          }}
        />
      )}

      {/* Add Field Modal */}
      <AddFieldModal
        open={showAddFieldModal}
        onOpenChange={setShowAddFieldModal}
        onAdd={handleAddField}
        existingFieldNames={pendingFields.map((f) => f.name)}
      />

      {/* Edit Field Modal */}
      {editingFieldIndex !== null && (
        <EditFieldModal
          key={`edit-field-${editingFieldIndex}`}
          open={showEditFieldModal}
          onOpenChange={(open) => {
            setShowEditFieldModal(open);
            if (!open) {
              setEditingFieldIndex(null);
            }
          }}
          onSave={handleUpdateField}
          field={pendingFields[editingFieldIndex]}
          existingFieldNames={pendingFields
            .filter((_, idx) => idx !== editingFieldIndex)
            .map((f) => f.name)}
        />
      )}

      {/* Delete Field Confirmation */}
      <AlertDialog open={fieldToDelete !== null} onOpenChange={() => setFieldToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteFieldDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteFieldDialog.description', {
                fieldName: fieldToDelete !== null ? pendingFields[fieldToDelete]?.name : ''
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteFieldDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (fieldToDelete !== null) {
                  handleDeleteField(fieldToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('deleteFieldDialog.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </div>
    </div>
  );
}
