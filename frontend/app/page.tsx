'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSetupStatus } from '@/hooks/useSetupStatus';

export default function Home() {
  const router = useRouter();
  const t = useTranslations('common.actions');
  const { setupComplete, loading } = useSetupStatus();

  useEffect(() => {
    if (loading) return;

    if (setupComplete === false) {
      // Setup not complete, redirect to setup wizard
      router.push('/admin/setup');
    } else if (setupComplete === true) {
      // Setup complete, redirect to admin panel
      router.push('/admin');
    }
  }, [setupComplete, loading, router]);

  // Show loading state while checking setup status
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">{t('loading')}</p>
      </div>
    </div>
  );
}
