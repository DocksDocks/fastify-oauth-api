/**
 * Authorized Admins Page
 *
 * Manage pre-authorized admin emails (superadmin only)
 * Regular admins see a "RestrictedAccess" message
 */

import { useEffect, useState, useRef } from 'react';
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

export function AuthorizedAdmins() {
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
      setAuthorizedAdmins(response.data.data.authorizedAdmins);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || 'Failed to load authorized admins');
      } else {
        setError('Failed to load authorized admins');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmail = async () => {
    if (!newEmail.trim()) {
      setAddError('Email is required');
      return;
    }

    try {
      setIsAdding(true);
      setAddError(null);
      setAddSuccess(null);

      await adminApi.addAuthorizedAdmin(newEmail.trim());

      setAddSuccess('Email added successfully!');
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
        setAddError(err.response.data.error.message || 'Failed to add email');
      } else {
        setAddError('Failed to add email');
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
          <h1 className="text-3xl font-bold text-text-primary">Authorized Admins</h1>
          <p className="text-text-secondary">Manage pre-authorized admin emails</p>
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
          <h1 className="text-3xl font-bold text-text-primary">Authorized Admins</h1>
          <p className="text-text-secondary">Manage pre-authorized admin emails</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={fetchAuthorizedAdmins} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Authorized Admins</h1>
          <p className="text-text-secondary">
            Pre-authorize emails for automatic admin promotion on sign-in
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Email
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-text-primary">Add Authorized Admin Email</DialogTitle>
              <DialogDescription className="text-text-secondary">
                Users with this email will be automatically promoted to admin when they sign in via OAuth.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-text-primary">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@example.com"
                  className="text-text-primary"
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
                Cancel
              </Button>
              <Button onClick={handleAddEmail} disabled={isAdding}>
                {isAdding ? 'Adding...' : 'Add Email'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Info Alert */}
      <Alert className="border-border bg-primary/5">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-text-secondary">
          <strong className="text-text-primary">How it works:</strong> When a user
          signs in via Google OAuth with an email listed here, they will automatically be promoted
          to the admin role. This works for both new users and existing users.
        </AlertDescription>
      </Alert>

      {/* Authorized Admins List */}
      <Card>
        <CardHeader>
          <CardTitle>Authorized Admin Emails ({authorizedAdmins.length})</CardTitle>
          <CardDescription>
            These emails will be auto-promoted to admin role on sign-in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authorizedAdmins.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <UserPlus className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No authorized admin emails yet</p>
              <p className="text-sm mt-2">Click "Add Email" to get started</p>
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
                      <p className="font-medium text-text-primary">{admin.email}</p>
                      <Badge variant="outline" className="text-xs">
                        Auto-promoted
                      </Badge>
                    </div>
                    <p className="text-sm text-text-muted mt-1">
                      Added by {admin.createdByName || admin.createdByEmail} on{' '}
                      {formatDate(admin.createdAt)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteId(admin.id)}
                    className="text-text-secondary hover:text-red-600"
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
            <AlertDialogTitle className="text-text-primary">Remove Authorized Email?</AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              This email will no longer be automatically promoted to admin when signing in.
              Existing users with this email will keep their current role.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && handleDeleteEmail(deleteId)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
