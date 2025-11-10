'use client';

/**
 * Authorized Admins Page
 *
 * Manage pre-authorized admin emails (superadmin only)
 * Regular admins see a "RestrictedAccess" message
 */

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { RestrictedAccess } from '@/components/RestrictedAccess';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { adminApi } from '@/lib/api';
import { UserPlus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { isAxiosError } from 'axios';
import type { AuthorizedAdmin } from '@/types';
import { ViewContentModal } from '@/components/ViewContentModal';

export default function AuthorizedAdminsPage() {
  const t = useTranslations('authorizedAdmins');
  const tCommon = useTranslations('common');
  const { user } = useAuthStore();
  const [authorizedAdmins, setAuthorizedAdmins] = useState<AuthorizedAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // User details modal state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalContent, setUserModalContent] = useState('');
  const [userModalTitle, setUserModalTitle] = useState('');
  const [loadingUser, setLoadingUser] = useState(false);

  const hasFetched = useRef(false);

  // Check if user is superadmin
  const isSuperadmin = user?.role === 'superadmin';

  useEffect(() => {
    // Only fetch if user is superadmin
    if (!isSuperadmin) {
      setLoading(false);
      return;
    }

    // Prevent double fetch in React StrictMode (dev only)
    if (hasFetched.current) return;
    hasFetched.current = true;

    fetchAuthorizedAdmins();
  }, [isSuperadmin]);

  const fetchAuthorizedAdmins = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminApi.getAuthorizedAdmins();
      setAuthorizedAdmins(response.data.authorizedAdmins);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || t('messages.failedToLoad'));
      } else {
        setError(t('messages.failedToLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      setAddError(t('messages.emailRequired'));
      return;
    }

    try {
      setIsAdding(true);
      setAddError(null);
      setAddSuccess(null);

      await adminApi.addAuthorizedAdmin(newEmail.trim());

      setAddSuccess(t('messages.emailAdded'));
      setNewEmail('');

      // Refresh list
      await fetchAuthorizedAdmins();

      // Close dialog after 1.5 seconds
      setTimeout(() => {
        setIsDialogOpen(false);
        setAddSuccess(null);
      }, 1500);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setAddError(err.response.data.error.message || t('messages.failedToAdd'));
      } else {
        setAddError(t('messages.failedToAdd'));
      }
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteEmail = async (id: number) => {
    try {
      setIsDeleting(true);
      await adminApi.removeAuthorizedAdmin(id);

      // Refresh list
      await fetchAuthorizedAdmins();

      setDeleteId(null);
    } catch (err: unknown) {
      console.error('Failed to delete authorized admin:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewUser = async (userId: number) => {
    try {
      setLoadingUser(true);
      const response = await adminApi.getUser(userId);
      console.log('Full response:', response);
      console.log('response.data:', response.data);
      console.log('response.data.user:', response.data.user);

      const userData = response.data.user;

      if (!userData) {
        console.error('User data is undefined!');
        return;
      }

      setUserModalContent(JSON.stringify(userData));
      setUserModalTitle(`User Details: ${userData.name || userData.email}`);
      setUserModalOpen(true);
    } catch (err: unknown) {
      console.error('Failed to load user details:', err);
    } finally {
      setLoadingUser(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // If not superadmin, show restricted access message
  if (!isSuperadmin) {
    return (
      <RestrictedAccess
        requiredRole="superadmin"
        currentRole={user?.role || 'user'}
        featureName="Authorized Admins management"
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchAuthorizedAdmins} variant="outline">
          {tCommon('actions.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              {t('actions.addEmail')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('dialogs.addEmail.title')}</DialogTitle>
              <DialogDescription>
                {t('dialogs.addEmail.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('form.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('form.emailPlaceholder')}
                  value={newEmail}
                  onChange={(e) => {
                    setNewEmail(e.target.value);
                    setAddError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isAdding) {
                      handleAddEmail();
                    }
                  }}
                />
              </div>
              {addError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{addError}</AlertDescription>
                </Alert>
              )}
              {addSuccess && (
                <Alert className="border-green-500 bg-green-50 text-green-900">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>{addSuccess}</AlertDescription>
                </Alert>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  setNewEmail('');
                  setAddError(null);
                  setAddSuccess(null);
                }}
                disabled={isAdding}
              >
                {tCommon('actions.cancel')}
              </Button>
              <Button onClick={handleAddEmail} disabled={isAdding}>
                {isAdding ? t('actions.adding') : t('actions.addEmail')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Alert */}
      <Alert className="border-border bg-primary/5">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>{t('info.howItWorks')}</strong> {t('info.description')}
        </AlertDescription>
      </Alert>

      {/* Authorized Admins List */}
      <Card>
        <CardHeader>
          <CardTitle>{t('table.email')} ({authorizedAdmins.length})</CardTitle>
          <CardDescription>
            {t('subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authorizedAdmins.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <UserPlus className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>{t('messages.noEmails')}</p>
              <p className="text-sm mt-2">{t('actions.addEmail')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {authorizedAdmins.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-primary/5 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{admin.email}</p>
                      <Badge variant="outline" className="text-xs">
                        {t('badges.autoPromoted')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {t('badges.addedBy')}{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleViewUser(admin.createdBy);
                        }}
                        className="text-primary hover:underline font-medium cursor-pointer inline"
                        disabled={loadingUser}
                      >
                        {admin.createdByName || admin.createdByEmail}
                      </button>
                      {' '}{t('table.on')} {formatDate(admin.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(admin.id)}
                    className="hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.removeConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.removeConfirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{tCommon('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteEmail(deleteId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? t('actions.remove') + '...' : t('actions.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View User Details Modal */}
      <ViewContentModal
        open={userModalOpen}
        onOpenChange={setUserModalOpen}
        title={userModalTitle}
        content={userModalContent}
        type="row"
      />
    </div>
  );
}
