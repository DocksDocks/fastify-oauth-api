import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { adminApi } from '@/lib/api';
import { Users, Key, Database, Activity, AlertCircle } from 'lucide-react';

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
}

export function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const [usersResponse, apiKeysResponse] = await Promise.all([
          adminApi.getUserStats(),
          adminApi.getApiKeyStats(),
        ]);

        setStats({
          users: usersResponse.data,
          apiKeys: apiKeysResponse.data,
        });
      } catch (err: any) {
        setError(err.response?.data?.error?.message || 'Failed to load dashboard stats');
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
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
          <p className="text-[var(--color-text-secondary)]">Overview of your admin panel</p>
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
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
          <p className="text-[var(--color-text-secondary)]">Overview of your admin panel</p>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-destructive-foreground">{error || 'Failed to load stats'}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Dashboard</h1>
        <p className="text-[var(--color-text-secondary)]">Overview of your admin panel</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">Total Users</CardTitle>
            <Users className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.users.total}</div>
            <p className="text-xs text-[var(--color-text-muted)]">All registered users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">Active API Keys</CardTitle>
            <Key className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">{stats.apiKeys.active}</div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {stats.apiKeys.revoked} revoked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">Admins</CardTitle>
            <Activity className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">
              {(stats.users.byRole?.admin || 0) + (stats.users.byRole?.superadmin || 0)}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {stats.users.byRole?.superadmin || 0} superadmins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-[var(--color-text-secondary)]">Collections</CardTitle>
            <Database className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">5</div>
            <p className="text-xs text-[var(--color-text-muted)]">Available tables</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--color-text-primary)]">Users by Role</CardTitle>
            <CardDescription className="text-[var(--color-text-secondary)]">Breakdown of user roles in the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.users?.byRole || {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={role === 'superadmin' ? 'destructive' : 'default'}>
                    {role}
                  </Badge>
                </div>
                <span className="font-semibold text-[var(--color-text-primary)]">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[var(--color-text-primary)]">Users by Provider</CardTitle>
            <CardDescription className="text-[var(--color-text-secondary)]">Authentication provider distribution</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.users?.byProvider || {}).map(([provider, count]) => (
              <div key={provider} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {provider}
                  </Badge>
                </div>
                <span className="font-semibold text-[var(--color-text-primary)]">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
