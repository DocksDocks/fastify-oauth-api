'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LinkProviderConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkingData: {
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
  };
  onConfirm: (linkingToken: string) => Promise<void>;
  onCancel: () => void;
}

export function LinkProviderConfirmation({
  open,
  onOpenChange,
  linkingData,
  onConfirm,
  onCancel,
}: LinkProviderConfirmationProps) {
  const t = useTranslations('linkProvider');
  const [isLinking, setIsLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsLinking(true);
    setError(null);

    try {
      await onConfirm(linkingData.linkingToken);
      onOpenChange(false);
    } catch (err) {
      const error = err as Error;
      setError(error.message || t('errors.failedToLink'));
    } finally {
      setIsLinking(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onCancel();
    onOpenChange(false);
  };

  const { existingUser, newProvider } = linkingData;
  const providerName = newProvider.provider.charAt(0).toUpperCase() + newProvider.provider.slice(1);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-text-primary">
            <AlertCircle className="size-5 text-orange-500" />
            {t('title', { provider: providerName })}
          </DialogTitle>
          <DialogDescription className="text-text-secondary">
            {t('subtitle')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Existing Account Info */}
          <div className="rounded-md border border-border bg-muted/20 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="size-4 text-green-500" />
              <span className="text-sm font-medium text-text-primary">{t('existingAccount.title')}</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="text-text-secondary">
                <span className="text-text-tertiary">{t('existingAccount.email')}</span> {existingUser.email}
              </div>
              {existingUser.name && (
                <div className="text-text-secondary">
                  <span className="text-text-tertiary">{t('existingAccount.name')}</span> {existingUser.name}
                </div>
              )}
              <div className="text-text-secondary">
                <span className="text-text-tertiary">{t('existingAccount.linkedProviders')}</span>{' '}
                {existingUser.providers
                  .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
                  .join(', ')}
              </div>
            </div>
          </div>

          {/* New Provider Info */}
          <div className="rounded-md border border-border bg-primary/5 p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="size-4 text-blue-500" />
              <span className="text-sm font-medium text-text-primary">{t('newProvider.title')}</span>
            </div>
            <div className="text-sm space-y-1">
              <div className="text-text-secondary">
                <span className="text-text-tertiary">{t('newProvider.provider')}</span> {providerName}
              </div>
              <div className="text-text-secondary">
                <span className="text-text-tertiary">{t('newProvider.email')}</span> {newProvider.email}
              </div>
              {newProvider.name && (
                <div className="text-text-secondary">
                  <span className="text-text-tertiary">{t('newProvider.name')}</span> {newProvider.name}
                </div>
              )}
            </div>
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertDescription className="text-sm text-text-secondary">
              {t('infoAlert', { provider: providerName })}
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel} disabled={isLinking}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={isLinking}>
            {isLinking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('actions.linking')}
              </>
            ) : (
              t('actions.linkAccounts')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
