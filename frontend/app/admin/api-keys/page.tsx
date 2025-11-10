'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminApi } from '@/lib/api';
import type { ApiKey } from '@/types';
import { Key, Copy, RefreshCw, Trash2, AlertCircle, Plus } from 'lucide-react';
import { isAxiosError } from 'axios';

export default function ApiKeysPage() {
  const t = useTranslations('apiKeys');
  const tCommon = useTranslations('common');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate dialog state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('');
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  // Regenerate dialog state
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [regenerateKeyId, setRegenerateKeyId] = useState<number | null>(null);
  const [regeneratedKey, setRegeneratedKey] = useState<string | null>(null);

  // Revoke dialog state
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [revokeKeyId, setRevokeKeyId] = useState<number | null>(null);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getApiKeys();
      setApiKeys(response.data.apiKeys);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || t('messages.failedToLoad'));
      } else {
        setError(t('messages.failedToLoad'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedPlatform) return;

    try {
      setGenerating(true);
      const response = await adminApi.generateApiKey(selectedPlatform);
      setGeneratedKey(response.data.apiKey.plainKey);
      setSelectedPlatform('');
      await fetchApiKeys();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || t('messages.failedToGenerate'));
      } else {
        setError(t('messages.failedToGenerate'));
      }
      setShowGenerateDialog(false);
    } finally {
      setGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!regenerateKeyId) return;

    try {
      const response = await adminApi.regenerateApiKey(regenerateKeyId);
      setRegeneratedKey(response.data.apiKey.plainKey);
      await fetchApiKeys();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || t('messages.failedToRegenerate'));
      } else {
        setError(t('messages.failedToRegenerate'));
      }
      setShowRegenerateDialog(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeKeyId) return;

    try {
      await adminApi.revokeApiKey(revokeKeyId);
      await fetchApiKeys();
      setShowRevokeDialog(false);
      setRevokeKeyId(null);
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || t('messages.failedToRevoke'));
      } else {
        setError(t('messages.failedToRevoke'));
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const closeGenerateDialog = () => {
    setShowGenerateDialog(false);
    setGeneratedKey(null);
    setSelectedPlatform('');
  };

  const closeRegenerateDialog = () => {
    setShowRegenerateDialog(false);
    setRegenerateKeyId(null);
    setRegeneratedKey(null);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('actions.generateNew')}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('card.title')}</CardTitle>
          <CardDescription>
            {t('card.description')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(apiKeys?.length || 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('messages.noKeys')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.name')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead>{t('table.created')}</TableHead>
                  <TableHead>{t('table.createdBy')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys?.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-muted-foreground" />
                        {key.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.revokedAt ? 'destructive' : 'default'}>
                        {key.revokedAt ? tCommon('status.revoked') : tCommon('status.active')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{t('table.userPrefix')}{key.createdBy}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {!key.revokedAt && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRegenerateKeyId(key.id);
                                setShowRegenerateDialog(true);
                              }}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRevokeKeyId(key.id);
                                setShowRevokeDialog(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={closeGenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogs.generate.title')}</DialogTitle>
            <DialogDescription>
              {generatedKey
                ? t('dialogs.generate.descriptionAfter')
                : t('dialogs.generate.descriptionBefore')}
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('dialogs.generate.alertTitle')}</AlertTitle>
                <AlertDescription>
                  {t('dialogs.generate.alertDescription')}
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <Input value={generatedKey} readOnly className="font-mono text-sm" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(generatedKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="platform" className="text-sm font-medium">
                  {t('dialogs.generate.platformLabel')}
                </label>
                <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                  <SelectTrigger id="platform">
                    <SelectValue placeholder={t('dialogs.generate.platformPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ios">{t('dialogs.generate.platformIos')}</SelectItem>
                    <SelectItem value="android">{t('dialogs.generate.platformAndroid')}</SelectItem>
                    <SelectItem value="admin_panel">{t('dialogs.generate.platformAdminPanel')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            {generatedKey ? (
              <Button onClick={closeGenerateDialog}>{t('actions.done')}</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeGenerateDialog}>
                  {tCommon('actions.cancel')}
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!selectedPlatform || generating}
                >
                  {generating ? t('dialogs.generate.generating') : tCommon('actions.confirm')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={closeRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogs.regenerate.title')}</DialogTitle>
            <DialogDescription>
              {regeneratedKey
                ? t('dialogs.regenerate.descriptionAfter')
                : t('dialogs.regenerate.descriptionBefore')}
            </DialogDescription>
          </DialogHeader>

          {regeneratedKey ? (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{t('dialogs.regenerate.alertTitle')}</AlertTitle>
                <AlertDescription>
                  {t('dialogs.regenerate.alertDescription')}
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <Input value={regeneratedKey} readOnly className="font-mono text-sm" />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(regeneratedKey)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            {regeneratedKey ? (
              <Button onClick={closeRegenerateDialog}>{t('actions.done')}</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeRegenerateDialog}>
                  {tCommon('actions.cancel')}
                </Button>
                <Button variant="destructive" onClick={handleRegenerate}>
                  {t('dialogs.regenerate.action')}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={() => setShowRevokeDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialogs.revoke.title')}</DialogTitle>
            <DialogDescription>
              {t('dialogs.revoke.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRevoke}>
              {t('dialogs.revoke.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
