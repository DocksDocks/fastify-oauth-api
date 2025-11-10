'use client';

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminApi } from '@/lib/api';
import { Users, Key, Database, Activity, AlertCircle } from 'lucide-react';
import { isAxiosError } from 'axios';

interface Stats {
  users: {
    total: number;
    byRole: Record<string, number>;
    byProvider: Record<string, number>;
  };
  apiKeys: {
    total: number;
    active: number;
    revoked: number;
  };
  collections: {
    total: number;
  };
}

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    // Prevent double fetch in React StrictMode (dev only)
    if (hasFetched.current) return;
    hasFetched.current = true;

    const fetchStats = async () => {
      try {
        setLoading(true);
        const [usersResponse, apiKeysResponse, collectionsResponse] = await Promise.all([
          adminApi.getUserStats(),
          adminApi.getApiKeyStats(),
          adminApi.getCollections(),
        ]);

        setStats({
          users: usersResponse.data.stats,
          apiKeys: apiKeysResponse.data.stats,
          collections: { total: collectionsResponse.data.total },
        });
      } catch (err: unknown) {
        if (isAxiosError(err) && err.response?.data?.error) {
          setError(err.response.data.error.message || t('errors.failedToLoad'));
        } else {
          setError(t('errors.failedToLoad'));
        }
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || t('errors.failedToLoad')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('cards.totalUsers.title')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users.total}</div>
            <p className="text-xs text-muted-foreground">{t('cards.totalUsers.description')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('cards.activeApiKeys.title')}</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.apiKeys.active}</div>
            <p className="text-xs text-muted-foreground">
              {t('cards.activeApiKeys.description', { count: stats.apiKeys.revoked })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('cards.admins.title')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.users.byRole?.admin || 0) + (stats.users.byRole?.superadmin || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('cards.admins.description', { count: stats.users.byRole?.superadmin || 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('cards.collections.title')}</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.collections.total}</div>
            <p className="text-xs text-muted-foreground">{t('cards.collections.description')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('sections.usersByRole.title')}</CardTitle>
            <CardDescription>{t('sections.usersByRole.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.users?.byRole || {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={role === 'superadmin' ? 'destructive' : 'default'}>
                    {tCommon(`roles.${role}` as 'roles.user' | 'roles.admin' | 'roles.superadmin')}
                  </Badge>
                </div>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('sections.usersByProvider.title')}</CardTitle>
            <CardDescription>{t('sections.usersByProvider.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.users?.byProvider || {}).map(([provider, count]) => (
              <div key={provider} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {tCommon(`providers.${provider}` as 'providers.google' | 'providers.apple' | 'providers.system')}
                  </Badge>
                </div>
                <span className="font-semibold">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
