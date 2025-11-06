'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LinkProviderConfirmation } from '@/components/LinkProviderConfirmation';
import { adminApi } from '@/lib/api';

interface LinkingData {
  linkingToken: string;
  existingUser: {
    id: number;
    email: string;
    name: string | null;
    providers: string[];
  };
  newProvider: {
    provider: string;
    providerId: string;
    email: string;
    name: string | null;
    avatar: string | null;
  };
}

export default function OAuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [linkingData, setLinkingData] = useState<LinkingData | null>(null);
  const [showLinkingModal, setShowLinkingModal] = useState(false);

  // Handle account linking confirmation
  const handleLinkConfirm = async (linkingToken: string) => {
    try {
      const response = await adminApi.post('/api/auth/link-provider', {
        linkingToken,
        confirm: true,
      });

      const { user, tokens } = response.data.data;
      const { accessToken, refreshToken } = tokens;

      // Check if user is admin or superadmin
      if (user.role !== 'admin' && user.role !== 'superadmin') {
        setError('Access denied. Only administrators can access this panel.');
        return;
      }

      setAuth(user, accessToken, refreshToken);
      setShowLinkingModal(false);
      router.replace('/admin');
    } catch (err: unknown) {
      const error = err as Error;
      throw new Error(error.message || 'Failed to link accounts');
    }
  };

  const handleLinkCancel = () => {
    setShowLinkingModal(false);
    setLinkingData(null);
    router.push('/admin/login');
  };

  useEffect(() => {
    const handleCallback = () => {
      // Check for error in query params
      const errorParam = searchParams?.get('error');
      if (errorParam) {
        setError(`Authentication failed: ${errorParam.replace(/_/g, ' ')}`);
        return;
      }

      // Get data from URL hash
      const hash = window.location.hash.substring(1); // Remove the '#'
      const params = new URLSearchParams(hash);
      const dataParam = params.get('data');
      const linkingParam = params.get('linking');

      // Handle account linking flow
      if (linkingParam) {
        try {
          const data = JSON.parse(decodeURIComponent(linkingParam)) as LinkingData;
          setLinkingData(data);
          setShowLinkingModal(true);
        } catch (err: unknown) {
          console.error('Failed to parse linking data:', err);
          setError('Failed to process account linking request');
        }
        return;
      }

      // Handle normal authentication flow
      if (!dataParam) {
        setError('No authentication data received');
        return;
      }

      try {
        const data = JSON.parse(decodeURIComponent(dataParam));
        const { user, tokens } = data;
        const { accessToken, refreshToken } = tokens;

        // Check if user is admin or superadmin
        if (user.role !== 'admin' && user.role !== 'superadmin') {
          setError('Access denied. Only administrators can access this panel.');
          return;
        }

        setAuth(user, accessToken, refreshToken);
        router.replace('/admin');
      } catch (err: unknown) {
        console.error('Failed to parse auth data:', err);
        setError('Failed to process authentication data');
      }
    };

    handleCallback();
  }, [searchParams, router, setAuth]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => router.push('/admin/login')} className="w-full">
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="w-full max-w-md space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Completing authentication...
          </p>
        </div>
      </div>

      {/* Account Linking Modal */}
      {linkingData && (
        <LinkProviderConfirmation
          open={showLinkingModal}
          onOpenChange={setShowLinkingModal}
          linkingData={linkingData}
          onConfirm={handleLinkConfirm}
          onCancel={handleLinkCancel}
        />
      )}
    </>
  );
}
