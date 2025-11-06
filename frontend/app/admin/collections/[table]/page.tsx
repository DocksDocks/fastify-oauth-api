'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { adminApi } from '@/lib/api';
import type { Collection, CollectionMeta } from '@/types';
import { Search, ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown, Eye, Loader2, Pencil, Trash2 } from 'lucide-react';
import { ViewContentModal } from '@/components/ViewContentModal';
import { EditRecordModal } from '@/components/EditRecordModal';
import { useAuthStore } from '@/store/auth';

export default function CollectionsPage() {
  const params = useParams();
  const router = useRouter();
  const table = params?.table as string;
  const { user } = useAuthStore();

  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<CollectionMeta | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPaginating, setIsPaginating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const limit = 10;

  // Search and sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal state for viewing full content
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [modalTitle, setModalTitle] = useState('');
  const [modalType, setModalType] = useState('text');

  // Edit modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record<string, unknown> | null>(null);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingRecord, setDeletingRecord] = useState<Record<string, unknown> | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Success/error messages
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getCollections();
      setCollections(response.data.data.collections);

      if (!table && response.data.data.collections.length > 0) {
        router.replace(`/admin/collections/${response.data.data.collections[0].table}`);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, [table, router]);

  const fetchCollectionMeta = useCallback(async (tableName: string) => {
    try {
      setLoading(true);
      const response = await adminApi.getCollectionMeta(tableName);
      setSelectedCollection(response.data.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to load collection metadata');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchData = useCallback(async (collection: CollectionMeta, isInitialLoad = false) => {
    try {
      // Use different loading states based on operation type
      if (isInitialLoad) {
        setLoading(true);
      } else {
        setIsPaginating(true);
      }

      const response = await adminApi.getCollectionData(
        collection.table,
        page,
        limit,
        searchTerm,
        sortColumn,
        sortOrder
      );
      setData(response.data.data.rows);
      setTotalPages(response.data.data.pagination.totalPages);
      setTotalRecords(response.data.data.pagination.total);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setIsPaginating(false);
    }
  }, [page, searchTerm, sortColumn, sortOrder]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    if (table && collections && collections.length > 0) {
      const collection = collections.find((c) => c.table === table);
      if (collection) {
        // Reset state when switching collections
        setData([]);
        setPage(1);
        setTotalPages(1);
        setTotalRecords(0);
        setSearchTerm('');
        setSortColumn('');
        setSortOrder('asc');
        setError(null);

        fetchCollectionMeta(collection.table);
      }
    }
  }, [table, collections, fetchCollectionMeta]);

  // Initial load when collection changes
  useEffect(() => {
    if (selectedCollection) {
      fetchData(selectedCollection, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCollection]);

  // Pagination/search/sort changes (not initial load)
  useEffect(() => {
    if (selectedCollection && (page !== 1 || searchTerm || sortColumn)) {
      fetchData(selectedCollection, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, sortColumn, sortOrder]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleViewContent = (row: Record<string, unknown>) => {
    setModalContent(JSON.stringify(row));
    setModalTitle('Record Details');
    setModalType('row');
    setModalOpen(true);
  };

  const handleEdit = (row: Record<string, unknown>) => {
    setEditingRecord(row);
    setEditModalOpen(true);
  };

  const handleDelete = (row: Record<string, unknown>) => {
    setDeletingRecord(row);
    setDeleteConfirmOpen(true);
  };

  const handleSaveEdit = async (updatedData: Record<string, unknown>) => {
    if (!selectedCollection || !editingRecord) return;

    try {
      const id = editingRecord.id as number;
      await adminApi.updateCollectionRecord(selectedCollection.table, id, updatedData);

      // Refresh data
      await fetchData(selectedCollection, false);

      // Show success message
      setSuccessMessage('Record updated successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      setEditModalOpen(false);
      setEditingRecord(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to update record');
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCollection || !deletingRecord) return;

    setIsDeleting(true);
    try {
      const id = deletingRecord.id as number;
      await adminApi.deleteCollectionRecord(selectedCollection.table, id);

      // Refresh data
      await fetchData(selectedCollection, false);

      // Show success message
      setSuccessMessage('Record deleted successfully');
      setTimeout(() => setSuccessMessage(null), 3000);

      setDeleteConfirmOpen(false);
      setDeletingRecord(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatValue = (value: unknown, type: string): string => {
    if (value === null || value === undefined) return '-';

    switch (type) {
      case 'date':
      case 'timestamp': {
        // Format: "20 October 2025, 22:41:21"
        const date = new Date(value as string | number | Date);
        const formatter = new Intl.DateTimeFormat(undefined, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        return formatter.format(date);
      }
      case 'boolean':
        return value ? 'Yes' : 'No';
      case 'json':
        return JSON.stringify(value, null, 2);
      default:
        return String(value);
    }
  };

  if (loading && (!collections || collections.length === 0)) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
          <AlertDescription className="text-green-800 dark:text-green-200">
            {successMessage}
          </AlertDescription>
        </Alert>
      )}

      {selectedCollection && (
        <>
          <Card className="flex flex-col flex-1 min-h-0">
            <CardHeader className="flex-none">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{selectedCollection.name}</CardTitle>
                  <CardDescription>
                    {totalRecords} record{totalRecords !== 1 ? 's' : ''} found
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      className="pl-8 w-64"
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-0">
              <div className="flex-1 overflow-auto">
                {loading || isPaginating ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground text-sm">
                      {loading ? 'Loading collection...' : 'Loading data...'}
                    </p>
                  </div>
                ) : data.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-center py-8 text-muted-foreground">
                    No records found
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-background">
                      <TableRow className="hover:shadow-md transition-shadow">
                        {selectedCollection?.columns?.map((column, colIndex) => (
                          <TableHead
                            key={column.name}
                            className={`${colIndex % 2 === 0 ? 'bg-primary/10' : 'bg-primary/5'}`}
                          >
                            <div className="flex items-center gap-1">
                              <span className="font-semibold">{column.label}</span>
                              {column.sortable && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6"
                                  onClick={() => handleSort(column.name)}
                                >
                                  <ArrowUpDown
                                    className={`h-3 w-3 ${
                                      sortColumn === column.name
                                        ? 'text-primary'
                                        : 'text-muted-foreground'
                                    }`}
                                  />
                                </Button>
                              )}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.map((row, rowIndex) => (
                        <TableRow key={rowIndex} className="hover:shadow-md transition-shadow">
                          {selectedCollection?.columns?.map((column, colIndex) => {
                            const value = row[column.name];
                            const formattedValue = formatValue(value, column.type);
                            const isFirstColumn = colIndex === 0;

                            // RBAC: Check if current user can edit/delete this record
                            const canModifyRecord = () => {
                              // Only apply RBAC to users table
                              if (selectedCollection.table !== 'users') return true;

                              // Get the role of the record being viewed
                              const recordRole = row.role as string;
                              const currentUserRole = user?.role;

                              // Superadmin can modify everything
                              if (currentUserRole === 'superadmin') return true;

                              // Non-superadmin cannot modify superadmin records
                              if (recordRole === 'superadmin') return false;

                              // Admin can modify user and admin records
                              return true;
                            };

                            const canModify = canModifyRecord();

                            return (
                              <TableCell
                                key={column.name}
                                className={`${colIndex % 2 === 0 ? 'bg-primary/10' : 'bg-primary/5'}`}
                              >
                                {isFirstColumn ? (
                                  <div className="flex items-center gap-2">
                                    <span className="block truncate max-w-xs">
                                      {formattedValue}
                                    </span>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => handleViewContent(row)}
                                        title="View details"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </Button>
                                      {canModify && (
                                        <>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => handleEdit(row)}
                                            title="Edit record"
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                                            onClick={() => handleDelete(row)}
                                            title="Delete record"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                ) : column.name === 'role' ? (
                                  <Badge variant="outline" className="capitalize">
                                    {String(value ?? '')}
                                  </Badge>
                                ) : column.type === 'boolean' ? (
                                  <Badge variant={value ? 'default' : 'destructive'}>
                                    {formattedValue}
                                  </Badge>
                                ) : (
                                  <span
                                    className={`block truncate max-w-xs ${column.type === 'json' ? 'font-mono text-xs' : ''}`}
                                    title={formattedValue}
                                  >
                                    {formattedValue}
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex-none flex items-center justify-between py-2">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
                {isPaginating && (
                  <span className="ml-2 text-xs">Loading...</span>
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || isPaginating}
                  className={isPaginating ? 'opacity-60 cursor-wait' : ''}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages || isPaginating}
                  className={isPaginating ? 'opacity-60 cursor-wait' : ''}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal for viewing full content */}
      <ViewContentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        content={modalContent}
        title={modalTitle}
        type={modalType}
        columns={selectedCollection?.columns}
      />

      {/* Edit Record Modal */}
      {editingRecord && selectedCollection && (
        <EditRecordModal
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
          record={editingRecord}
          columns={selectedCollection.columns}
          onSave={handleSaveEdit}
          userRole={user?.role}
          tableName={selectedCollection.table}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deletingRecord && (
            <div className="p-3 bg-muted rounded-md">
              <span className="text-sm font-mono">
                ID: {String(deletingRecord.id ?? 'N/A')}
              </span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
