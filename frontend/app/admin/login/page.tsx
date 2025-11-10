'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authApi } from '@/lib/api';
import { AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import { useSetupStatus } from '@/hooks/useSetupStatus';

export default function LoginPage() {
  const t = useTranslations('login');
  const router = useRouter();
  const { setupComplete, loading: setupLoading } = useSetupStatus();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to setup if not complete
  useEffect(() => {
    if (setupComplete === false) {
      router.push('/admin/setup');
    }
  }, [setupComplete, router]);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.adminGoogle();
      const authUrl = response.data?.authUrl;

      if (!authUrl) {
        setError('No authorization URL received from server');
        setLoading(false);
        return;
      }

      window.location.href = authUrl;
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || 'Failed to initiate Google login');
      } else {
        setError('Failed to initiate Google login');
      }
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.adminApple();
      const authUrl = response.data?.authUrl;

      if (!authUrl) {
        setError('No authorization URL received from server');
        setLoading(false);
        return;
      }

      window.location.href = authUrl;
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || 'Failed to initiate Apple login');
      } else {
        setError('Failed to initiate Apple login');
      }
      setLoading(false);
    }
  };

  // Show loading while checking setup status
  if (setupLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking setup status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">{t('title')}</CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {loading ? (
              <span>{t('redirecting')}</span>
            ) : (
              <>
                <FcGoogle className="mr-2 h-5 w-5" />
                {t('googleButton')}
              </>
            )}
          </Button>

          <Button
            onClick={handleAppleLogin}
            disabled={loading}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {loading ? (
              <span>{t('redirecting')}</span>
            ) : (
              <>
                <FaApple className="mr-2 h-5 w-5" />
                {t('appleButton')}
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {t('adminOnly')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
