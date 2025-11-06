'use client';

/**
 * RestrictedAccess Component
 *
 * Reusable component to display role-based access restrictions
 * Shows a clear message when user doesn't have required permissions
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';

interface RestrictedAccessProps {
  requiredRole: string;
  currentRole: string;
  featureName?: string;
}

export function RestrictedAccess({
  requiredRole,
  currentRole,
  featureName = 'this content',
}: RestrictedAccessProps) {
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <Alert className="max-w-2xl border-border bg-card">
        <ShieldAlert className="h-5 w-5 text-foreground" />
        <AlertTitle className="text-lg font-semibold mb-2">
          Access Restricted
        </AlertTitle>
        <AlertDescription className="space-y-4">
          <p className="text-foreground/80">
            Only <Badge variant={getRoleBadgeVariant(requiredRole)} className="capitalize mx-1">
              {requiredRole}
            </Badge> users can access {featureName}.
          </p>
          <div className="pt-2 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Your current role:{' '}
              <Badge variant={getRoleBadgeVariant(currentRole)} className="capitalize">
                {currentRole}
              </Badge>
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            If you need access to this feature, please contact your system administrator.
          </p>
        </AlertDescription>
      </Alert>
    </div>
  );
}
