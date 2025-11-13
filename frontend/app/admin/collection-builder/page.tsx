'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Trash2, Edit, Database, Search, Filter } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminApi, getErrorMessage } from '@/lib/api';
import { CollectionDefinition } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { useAuthStore } from '@/store/auth';
import axios from 'axios';

export default function CollectionBuilderPage() {
  const t = useTranslations('collectionBuilder');
  const tCommon = useTranslations('common');
  const { user } = useAuthStore();

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
  const [collections, setCollections] = useState<CollectionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'system' | 'custom'>('all');

  // Check if user is superadmin
  const isSuperadmin = user?.role === 'superadmin';

  // Fetch collections
  useEffect(() => {
    if (isSuperadmin) {
      loadCollections();
    }
  }, [isSuperadmin]);

  // Filtered collections
  const filteredCollections = useMemo(() => {
    return collections.filter((collection) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        collection.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        collection.apiName.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType =
        filterType === 'all' ||
        (filterType === 'system' && collection.isSystem) ||
        (filterType === 'custom' && !collection.isSystem);

      return matchesSearch && matchesType;
    });
  }, [collections, searchQuery, filterType]);

  const loadCollections = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getCollectionDefinitions();
      setCollections(response.data.data || []);
      setError(null);
    } catch (err: unknown) {
      console.error('Failed to load collections:', err);
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || 'Failed to load collections');
      } else {
        setError('Failed to load collections');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setIsDeleting(true);
      await adminApi.deleteCollectionDefinition(deleteId);
      await loadCollections();
      setDeleteId(null);
    } catch (err: unknown) {
      console.error('Failed to delete collection:', err);
      if (axios.isAxiosError(err) && err.response?.data?.error) {
        alert(err.response.data.error.message || 'Failed to delete collection');
      } else {
        alert('Failed to delete collection');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Restrict access to superadmin only
  if (!isSuperadmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t('messages.accessRestricted')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('messages.superadminOnly')}
        </p>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">{t('messages.loadingCollections')}</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Database className="h-16 w-16 text-destructive mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t('messages.errorLoading')}</h2>
        <p className="text-muted-foreground mb-6">{error}</p>
        <Button onClick={loadCollections}>{tCommon('actions.tryAgain')}</Button>
      </div>
    );
  }

  // Empty state
  if (!loading && collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Database className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-semibold mb-2">{t('emptyState.title')}</h2>
        <p className="text-muted-foreground mb-6">
          {t('emptyState.description')}
        </p>
        <Button asChild>
          <Link href="/admin/collection-builder/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('actions.createCollection')}
          </Link>
        </Button>
      </div>
    );
  }

  // Table view
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto py-6 space-y-6 pb-12">
          {/* Header */}
          <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/collection-builder/new">
            <Plus className="mr-2 h-4 w-4" />
            {t('actions.createCollection')}
          </Link>
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('filters.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterType} onValueChange={(value) => setFilterType(value as 'all' | 'system' | 'custom')}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allCollections')}</SelectItem>
              <SelectItem value="system">{t('filters.systemOnly')}</SelectItem>
              <SelectItem value="custom">{t('filters.customOnly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.name')}</TableHead>
              <TableHead>{t('table.apiName')}</TableHead>
              <TableHead>{t('table.fields')}</TableHead>
              <TableHead>{t('table.created')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCollections.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchQuery || filterType !== 'all'
                    ? t('filters.noMatch')
                    : t('filters.noCollections')}
                </TableCell>
              </TableRow>
            ) : (
              filteredCollections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/admin/collection-builder/${collection.id}`}
                      className="hover:underline"
                    >
                      {collection.displayName}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs text-muted-foreground">
                      {collection.apiName}
                    </code>
                  </TableCell>
                  <TableCell>{t('table.fieldsCount', { count: collection.fields.length })}</TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(collection.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={collection.isSystem ? 'secondary' : 'default'}>
                      {collection.isSystem ? t('status.system') : t('status.custom')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/collection-builder/${collection.id}`}>
                        <Edit className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(collection.id)}
                      disabled={collection.isSystem}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.delete.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.delete.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t('dialogs.delete.deleting') : tCommon('actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </div>
      </div>
    </div>
  );
}
