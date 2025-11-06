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
import { adminApi } from '@/lib/api';
import type { Collection, CollectionMeta } from '@/types';
import { Search, ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown, Eye, Loader2 } from 'lucide-react';
import { ViewContentModal } from '@/components/ViewContentModal';

export default function CollectionsPage() {
  const params = useParams();
  const router = useRouter();
  const table = params?.table as string;

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
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
          {selectedCollection && (
            <>
              <Card>
                <CardHeader>
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
                <CardContent>
                  <div className="min-h-[600px] flex items-center justify-center">
                    {loading || isPaginating ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">
                          {loading ? 'Loading collection...' : 'Loading data...'}
                        </p>
                      </div>
                    ) : data.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No records found
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                        <TableHeader>
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

                                return (
                                  <TableCell
                                    key={column.name}
                                    className={`max-w-xs ${colIndex % 2 === 0 ? 'bg-primary/10' : 'bg-primary/5'}`}
                                  >
                                    {isFirstColumn ? (
                                      <div className="flex items-center gap-2">
                                        <span className="block truncate">
                                          {formattedValue}
                                        </span>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 shrink-0"
                                          onClick={() => handleViewContent(row)}
                                        >
                                          <Eye className="h-3 w-3" />
                                        </Button>
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
                                        className={`block truncate ${column.type === 'json' ? 'font-mono text-xs' : ''}`}
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
                    </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
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
      </div>

      {/* Modal for viewing full content */}
      <ViewContentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        content={modalContent}
        title={modalTitle}
        type={modalType}
      />
    </div>
  );
}
