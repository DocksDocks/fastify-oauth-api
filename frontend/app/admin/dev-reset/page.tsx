'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, AlertTriangle, Trash2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export default function DevResetPage() {
  const t = useTranslations('devReset');
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
          <AlertTitle>{t('alerts.accessDenied.title')}</AlertTitle>
          <AlertDescription>{t('alerts.accessDenied.description')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleReset = async () => {
    setIsResetting(true);
    setError(null);

    try {
      const accessToken = localStorage.getItem('access_token');

      if (!accessToken) {
        throw new Error(t('messages.noToken'));
      }

      // Call reset endpoint
      const response = await axios.post(
        `${API_URL}/api/setup/reset`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
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
        throw new Error(response.data.error || t('messages.resetFailed'));
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } }; message?: string };
      setError(error.response?.data?.error || error.message || t('messages.failedToReset'));
      setIsResetting(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('subtitle')}
          </p>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('warning.title')}</AlertTitle>
          <AlertDescription>
            {t('warning.description')}
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>{t('warning.items.users')}</li>
              <li>{t('warning.items.providers')}</li>
              <li>{t('warning.items.apiKeys')}</li>
              <li>{t('warning.items.admins')}</li>
              <li>{t('warning.items.setup')}</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              {t('card.title')}
            </CardTitle>
            <CardDescription>
              {t('card.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('alerts.error')}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {isResetting && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('alerts.resetting.title')}</AlertTitle>
                <AlertDescription>
                  {t('alerts.resetting.description')}
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
                {t('actions.resetDatabase')}
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium">
                  {t('messages.confirmAction')}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={handleReset}
                    disabled={isResetting}
                    className="flex-1"
                  >
                    {isResetting ? t('actions.resetting') : t('actions.confirm')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowConfirm(false)}
                    disabled={isResetting}
                    className="flex-1"
                  >
                    {t('actions.cancel')}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('alerts.devOnly.title')}</AlertTitle>
          <AlertDescription>
            {t('alerts.devOnly.description')}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}
