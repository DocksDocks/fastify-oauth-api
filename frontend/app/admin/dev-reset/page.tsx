'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export default function DevResetPage() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>This page is only available in development mode.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleReset = async () => {
    setIsResetting(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('access_token');
      const apiKey = process.env.NEXT_PUBLIC_ADMIN_PANEL_API_KEY;

      if (!accessToken) {
        throw new Error('No access token found. Please login first.');
      }

      // Call reset endpoint
      const response = await axios.post(
        `${API_URL}/api/setup/reset`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
            'X-API-Key': apiKey || '',
          },
        }
      );

      if (response.data.success) {
        // Clear auth state
        clearAuth();

        // Redirect to login after short delay
        setTimeout(() => {
          router.push('/admin/login');
        }, 2000);
      } else {
        throw new Error(response.data.error || 'Reset failed');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || 'Failed to reset database');
      setIsResetting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Development Reset</h1>
          <p className="text-muted-foreground mt-2">
            Reset the database to start fresh with the setup wizard
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Warning: Destructive Action</AlertTitle>
          <AlertDescription>
            This will permanently delete all data from the database including:
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>All users and authentication data</li>
              <li>All provider accounts</li>
              <li>All API keys</li>
              <li>All authorized admins</li>
              <li>Setup status</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Reset Database
            </CardTitle>
            <CardDescription>
              This action will clear all data and reset the setup wizard. You will need to go
              through the initial setup process again.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isResetting && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Resetting...</AlertTitle>
                <AlertDescription>
                  Database is being reset. You will be logged out and redirected to the login page.
                </AlertDescription>
              </Alert>
            )}

            {!showConfirm ? (
              <Button
                variant="destructive"
                onClick={() => setShowConfirm(true)}
                disabled={isResetting}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Reset Database
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  Are you absolutely sure? This action cannot be undone.
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleReset}
                    disabled={isResetting}
                    className="flex-1"
                  >
                    {isResetting ? 'Resetting...' : 'Yes, Reset Everything'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    disabled={isResetting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Development Only</AlertTitle>
          <AlertDescription>
            This page is only available when NODE_ENV=development. It will not be accessible in
            production.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
