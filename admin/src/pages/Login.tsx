import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authApi } from '@/lib/api';
import { AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.adminGoogle();
      const authUrl = response.data?.data?.authUrl;

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
      const authUrl = response.data?.data?.authUrl;

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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-(--color-text-primary)">Admin Panel</CardTitle>
          <CardDescription className="text-text-secondary">Sign in with your Google or Apple account to continue</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-destructive-foreground">{error}</AlertDescription>
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
            disabled={loading}
            className="w-full"
            size="lg"
            variant="outline"
          >
            {loading ? (
              <span>Redirecting...</span>
            ) : (
              <>
                <FaApple className="mr-2 h-5 w-5" />
                Continue with Apple
              </>
            )}
          </Button>

          <p className="text-center text-sm text-(--color-text-muted)">
            Only authorized administrators can access this panel
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
