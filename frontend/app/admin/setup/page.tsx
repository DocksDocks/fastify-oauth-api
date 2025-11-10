'use client';

/**
 * First-Time Setup Wizard Page
 *
 * Shown when no users exist in the system
 * Allows first user to login via OAuth and become superadmin
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import { Info } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1337';

export default function SetupPage() {
  const router = useRouter();
  const { setupComplete, loading } = useSetupStatus();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect to admin if setup is already complete
  useEffect(() => {
    if (setupComplete === true) {
      router.push('/admin');
    }
  }, [setupComplete, router]);

  const handleGoogleLogin = async () => {
    try {
      setIsRedirecting(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/auth/admin/google`);
      const data = await response.json();

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError('Failed to generate Google OAuth URL');
        setIsRedirecting(false);
      }
    } catch (err) {
      console.error('Google login failed:', err);
      setError('Failed to initiate Google login');
      setIsRedirecting(false);
    }
  };

  const handleAppleLogin = async () => {
    try {
      setIsRedirecting(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/auth/admin/apple`);
      const data = await response.json();

      if (data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        setError('Failed to generate Apple OAuth URL');
        setIsRedirecting(false);
      }
    } catch (err) {
      console.error('Apple login failed:', err);
      setError('Failed to initiate Apple login');
      setIsRedirecting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Checking setup status...</p>
        </div>
      </div>
    );
  }

  if (setupComplete === true) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Redirecting to admin panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">Welcome to Fastify OAuth API</CardTitle>
          <CardDescription>Let&apos;s set up your admin account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>First-Time Setup</AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              <ul className="list-disc list-inside space-y-1">
                <li>Login with your Google or Apple account</li>
                <li>You&apos;ll become the first superadmin</li>
                <li>API keys will be generated automatically</li>
                <li>Admin panel will restart with new configuration</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OAuth Buttons */}
          <Button
            onClick={handleGoogleLogin}
            disabled={isRedirecting}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {isRedirecting ? (
              <span>Redirecting...</span>
            ) : (
              <>
                <FcGoogle className="mr-2 h-5 w-5" />
                Continue with Google
              </>
            )}
          </Button>

          <Button
            onClick={handleAppleLogin}
            disabled={isRedirecting}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {isRedirecting ? (
              <span>Redirecting...</span>
            ) : (
              <>
                <FaApple className="mr-2 h-5 w-5" />
                Continue with Apple
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            By continuing, you agree to become the system administrator
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
