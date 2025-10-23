import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Search, ChevronLeft, ChevronRight, AlertCircle, ArrowUpDown } from 'lucide-react';

export function Collections() {
  const { table } = useParams();
  const navigate = useNavigate();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<CollectionMeta | null>(null);
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
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

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getCollections();
      setCollections(response.data.data.collections);

      if (!table && response.data.data.collections.length > 0) {
        navigate(`/admin/collections/${response.data.data.collections[0].table}`, { replace: true });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setError(error.response?.data?.error?.message || 'Failed to load collections');
    } finally {
      setLoading(false);
    }
  }, [table, navigate]);

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

  const fetchData = useCallback(async (collection: CollectionMeta) => {
    try {
      setLoading(true);
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

  useEffect(() => {
    if (selectedCollection) {
      fetchData(selectedCollection);
    }
  }, [selectedCollection, fetchData]);

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
          <AlertDescription className="text-destructive-foreground">{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
          {selectedCollection && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-(--color-text-primary)">{selectedCollection.name}</CardTitle>
                      <CardDescription className="text-text-secondary">
                        {totalRecords} record{totalRecords !== 1 ? 's' : ''} found
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-(--color-text-tertiary)" />
                        <Input
                          placeholder="Search..."
                          className="pl-8 w-64 text-(--color-text-primary)"
                          value={searchTerm}
                          onChange={(e) => handleSearch(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="space-y-2">
                      {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : data.length === 0 ? (
                    <div className="text-center py-8 text-(--color-text-muted)">
                      No records found
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {selectedCollection?.columns?.map((column, colIndex) => (
                              <TableHead
                                key={column.name}
                                className={`${colIndex % 2 === 0 ? 'bg-primary/5' : 'bg-primary/3'}`}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="text-text-secondary font-semibold">{column.label}</span>
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
                                            : 'text-(--color-text-tertiary)'
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
                            <TableRow key={rowIndex}>
                              {selectedCollection?.columns?.map((column, colIndex) => (
                                <TableCell
                                  key={column.name}
                                  className={`max-w-xs ${colIndex % 2 === 0 ? 'bg-primary/5' : 'bg-primary/3'}`}
                                >
                                  {column.name === 'role' ? (
                                    <Badge variant="outline" className="capitalize">
                                      {String(row[column.name] ?? '')}
                                    </Badge>
                                  ) : column.type === 'boolean' ? (
                                    <Badge variant={row[column.name] ? 'success' : 'outline'}>
                                      {formatValue(row[column.name], column.type)}
                                    </Badge>
                                  ) : (
                                    <span
                                      className={`block truncate text-(--color-text-primary) ${column.type === 'json' ? 'font-mono text-xs' : ''}`}
                                      title={formatValue(row[column.name], column.type)}
                                    >
                                      {formatValue(row[column.name], column.type)}
                                    </span>
                                  )}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-text-secondary">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
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
    </div>
  );
}
