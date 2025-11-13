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
          <Button variant="ghost" size="sm" onClick={onEdit} title="Edit field">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onDelete} title="Delete field">
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

  // UI state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddFieldModal, setShowAddFieldModal] = useState(false);
  const [editingFieldIndex, setEditingFieldIndex] = useState<number | null>(null);
  const [fieldToDelete, setFieldToDelete] = useState<number | null>(null);

  // Filter/search state
  const [searchQuery, setSearchQuery] = useState('');

  // Bulk selection state
  const [selectedFields, setSelectedFields] = useState<Set<number>>(new Set());

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

  const loadCollection = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getCollectionDefinition(Number(id));
      setCollection(response.data.data || response.data);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load collection:', err);
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || 'Failed to load collection');
      } else {
        setError('Failed to load collection');
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
    setShowAddFieldModal(true);
  };

  const handleAddOrUpdateField = async (field: CollectionField) => {
    if (!collection) return;

    try {
      const updatedFields = [...collection.fields];

      if (editingFieldIndex !== null) {
        // Update existing field
        updatedFields[editingFieldIndex] = field;
      } else {
        // Add new field
        updatedFields.push(field);
      }

      // Update collection via API
      await adminApi.updateCollectionDefinition(Number(id), {
        ...collection,
        fields: updatedFields,
      });

      // Reload collection to get fresh data
      await loadCollection();
      setShowAddFieldModal(false);
      setEditingFieldIndex(null);
    } catch (err: unknown) {
      console.error('Failed to update field:', err);
      alert(getErrorMessage(err));
    }
  };

  const handleDeleteField = async (index: number) => {
    if (!collection) return;

    try {
      const updatedFields = collection.fields.filter((_, i) => i !== index);

      // Update collection via API
      await adminApi.updateCollectionDefinition(Number(id), {
        ...collection,
        fields: updatedFields,
      });

      // Reload collection to get fresh data
      await loadCollection();
      setFieldToDelete(null);
    } catch (err: unknown) {
      console.error('Failed to delete field:', err);
      alert(getErrorMessage(err));
    }
  };

  const handleBulkDelete = async () => {
    if (!collection || selectedFields.size === 0) return;

    try {
      const updatedFields = collection.fields.filter((_, i) => !selectedFields.has(i));

      // Update collection via API
      await adminApi.updateCollectionDefinition(Number(id), {
        ...collection,
        fields: updatedFields,
      });

      // Reload collection and clear selection
      await loadCollection();
      setSelectedFields(new Set());
    } catch (err: unknown) {
      console.error('Failed to delete fields:', err);
      alert(getErrorMessage(err));
    }
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
    if (!collection) return;

    const filteredIndices = getFilteredFields().map((field) =>
      collection.fields.findIndex(f => f === field)
    );

    if (selectedFields.size === filteredIndices.length) {
      setSelectedFields(new Set());
    } else {
      setSelectedFields(new Set(filteredIndices));
    }
  };

  const getFilteredFields = () => {
    if (!collection) return [];

    if (!searchQuery.trim()) {
      return collection.fields;
    }

    const query = searchQuery.toLowerCase();
    return collection.fields.filter(
      (field) =>
        field.name.toLowerCase().includes(query) ||
        field.label.toLowerCase().includes(query) ||
        field.type.toLowerCase().includes(query)
    );
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !collection) return;

    if (active.id !== over.id) {
      const oldIndex = parseInt(active.id.toString().replace('field-', ''));
      const newIndex = parseInt(over.id.toString().replace('field-', ''));

      const reorderedFields = arrayMove(collection.fields, oldIndex, newIndex);

      try {
        // Update collection via API
        await adminApi.updateCollectionDefinition(Number(id), {
          ...collection,
          fields: reorderedFields,
        });

        // Reload collection to get fresh data
        await loadCollection();
      } catch (err: unknown) {
        console.error('Failed to reorder fields:', err);
        alert(getErrorMessage(err));
      }
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
          <Badge variant="outline">System Collection</Badge>
        )}
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Collection Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Collection Details</CardTitle>
                <CardDescription>View and manage collection configuration</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Collection
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Collection Name</span>
                <div className="font-mono text-sm">{collection.name}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">API Name</span>
                <div className="font-mono text-sm">{collection.apiName}</div>
              </div>
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Display Name</span>
                <div className="text-sm">{collection.displayName}</div>
              </div>
              {collection.description && (
                <div className="space-y-1 md:col-span-2">
                  <span className="text-xs font-semibold text-muted-foreground">Description</span>
                  <div className="text-sm">{collection.description}</div>
                </div>
              )}
              <div className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground">Icon</span>
                <div className="font-mono text-sm">{collection.icon || 'Database'}</div>
              </div>
            </div>

            {/* Indexes */}
            {collection.indexes && collection.indexes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Indexes ({collection.indexes.length})</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {collection.indexes.map((index) => (
                      <div key={index.name} className="text-sm font-mono flex items-center gap-2">
                        <span>{index.name}</span>
                        {index.unique && <Badge variant="outline" className="text-xs">UNIQUE</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div>Created: {new Date(collection.createdAt).toLocaleString()}</div>
              <div>Updated: {new Date(collection.updatedAt).toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>

        {/* Fields Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Fields ({collection.fields.length})</CardTitle>
                <CardDescription>Manage collection fields and their configuration</CardDescription>
              </div>
              <Button onClick={openAddFieldModal} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
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
                  <Badge variant="secondary">{selectedFields.size} selected</Badge>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      if (confirm(`Delete ${selectedFields.size} field(s)?`)) {
                        handleBulkDelete();
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                </div>
              )}
            </div>

            {/* Fields Table */}
            {getFilteredFields().length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Database className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No fields match your search' : t('fieldsTable.emptyState.title')}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Try a different search term' : t('fieldsTable.emptyState.description')}
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
                      items={collection.fields.map((_, idx) => `field-${idx}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      <TableBody>
                        {getFilteredFields().map((field) => {
                          const actualIndex = collection.fields.indexOf(field);
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

      {/* Add/Edit Field Modal */}
      {collection && (
        <AddFieldModal
          open={showAddFieldModal}
          onOpenChange={(open) => {
            setShowAddFieldModal(open);
            if (!open) {
              setEditingFieldIndex(null);
            }
          }}
          onAdd={handleAddOrUpdateField}
          editField={editingFieldIndex !== null ? collection.fields[editingFieldIndex] : undefined}
          existingFieldNames={
            editingFieldIndex !== null
              ? collection.fields
                  .filter((_, idx) => idx !== editingFieldIndex)
                  .map((f) => f.name)
              : collection.fields.map((f) => f.name)
          }
        />
      )}

      {/* Delete Field Confirmation */}
      <AlertDialog open={fieldToDelete !== null} onOpenChange={() => setFieldToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Field</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the field{' '}
              <span className="font-mono font-semibold">
                {fieldToDelete !== null && collection ? collection.fields[fieldToDelete]?.name : ''}
              </span>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (fieldToDelete !== null) {
                  handleDeleteField(fieldToDelete);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </div>
    </div>
  );
}
