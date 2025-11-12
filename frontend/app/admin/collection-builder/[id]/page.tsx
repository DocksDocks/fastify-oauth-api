'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Database, Edit } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { EditCollectionModal } from '@/components/collection-builder/EditCollectionModal';
import { adminApi, getErrorMessage } from '@/lib/api';
import { CollectionDefinition } from '@/types';
import axios from 'axios';

export default function EditCollectionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Unwrap params using React.use()
  const { id } = use(params);

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

  // Data state
  const [collection, setCollection] = useState<CollectionDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    loadCollection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

      {/* Main Content: Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel: Collection Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Collection Details</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <CardDescription>View and manage collection configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-muted-foreground">Collection Name:</span>
                <span className="font-mono">{collection.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-muted-foreground">API Name:</span>
                <span className="font-mono">{collection.apiName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-muted-foreground">Display Name:</span>
                <span>{collection.displayName}</span>
              </div>
              {collection.description && (
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-muted-foreground">Description:</span>
                  <span>{collection.description}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-muted-foreground">Icon:</span>
                <span className="font-mono">{collection.icon || 'Database'}</span>
              </div>
            </div>

            <Separator />

            {/* Fields */}
            <div className="space-y-2">
              <div className="font-semibold text-sm">Fields ({collection.fields.length})</div>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {collection.fields.map((field, index) => (
                  <div key={index} className="flex justify-between text-sm py-1">
                    <span className="font-mono text-xs">{field.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {field.type}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Indexes */}
            {collection.indexes && collection.indexes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="font-semibold text-sm">Indexes ({collection.indexes.length})</div>
                  <div className="space-y-1">
                    {collection.indexes.map((index, idx) => (
                      <div key={idx} className="text-xs font-mono">
                        {index.name} {index.unique && <Badge variant="outline" className="ml-1 text-xs">UNIQUE</Badge>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Metadata */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div>Created: {new Date(collection.createdAt).toLocaleString()}</div>
              <div>Updated: {new Date(collection.updatedAt).toLocaleString()}</div>
            </div>
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
        </div>
      </div>
    </div>
  );
}
