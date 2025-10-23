import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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

export function ApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Generate dialog state
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
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
        setError(err.response.data.error.message || 'Failed to load API keys');
      } else {
        setError('Failed to load API keys');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!newKeyName.trim()) return;

    try {
      setGenerating(true);
      const response = await adminApi.generateApiKey(newKeyName.trim());
      setGeneratedKey(response.data.apiKey);
      setNewKeyName('');
      await fetchApiKeys();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || 'Failed to generate API key');
      } else {
        setError('Failed to generate API key');
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
      setRegeneratedKey(response.data.apiKey);
      await fetchApiKeys();
    } catch (err: unknown) {
      if (isAxiosError(err) && err.response?.data?.error) {
        setError(err.response.data.error.message || 'Failed to regenerate API key');
      } else {
        setError('Failed to regenerate API key');
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
        setError(err.response.data.error.message || 'Failed to revoke API key');
      } else {
        setError('Failed to revoke API key');
      }
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  const closeGenerateDialog = () => {
    setShowGenerateDialog(false);
    setGeneratedKey(null);
    setNewKeyName('');
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
          <h1 className="text-3xl font-bold text-(--color-text-primary)">API Keys</h1>
          <p className="text-text-secondary">Manage API keys for authentication</p>
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
          <h1 className="text-3xl font-bold text-(--color-text-primary)">API Keys</h1>
          <p className="text-text-secondary">Manage API keys for authentication</p>
        </div>
        <Button onClick={() => setShowGenerateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate New Key
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-destructive-foreground">{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-(--color-text-primary)">API Keys</CardTitle>
          <CardDescription className="text-text-secondary">
            These keys are used to authenticate API requests. Keep them secure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(apiKeys?.length || 0) === 0 ? (
            <div className="text-center py-8 text-(--color-text-muted)">
              No API keys found. Generate one to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-text-secondary">Name</TableHead>
                  <TableHead className="text-text-secondary">Status</TableHead>
                  <TableHead className="text-text-secondary">Created</TableHead>
                  <TableHead className="text-text-secondary">Created By</TableHead>
                  <TableHead className="text-right text-text-secondary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys?.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell className="font-medium text-(--color-text-primary)">
                      <div className="flex items-center gap-2">
                        <Key className="h-4 w-4 text-(--color-text-tertiary)" />
                        {key.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={key.revokedAt ? 'destructive' : 'success'}>
                        {key.revokedAt ? 'Revoked' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {new Date(key.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-text-secondary">User #{key.createdBy}</TableCell>
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
            <DialogTitle className="text-(--color-text-primary)">Generate New API Key</DialogTitle>
            <DialogDescription className="text-text-secondary">
              {generatedKey
                ? 'Your API key has been generated. Copy it now - you won\'t be able to see it again!'
                : 'Create a new API key for authenticating requests.'}
            </DialogDescription>
          </DialogHeader>

          {generatedKey ? (
            <div className="space-y-4">
              <Alert variant="success">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-(--color-text-primary)">API Key Generated</AlertTitle>
                <AlertDescription className="text-text-secondary">
                  Make sure to copy your API key now. You won't be able to see it again!
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <Input value={generatedKey} readOnly className="font-mono text-sm text-(--color-text-primary)" />
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
              <div>
                <label htmlFor="keyName" className="text-sm font-medium text-text-secondary">
                  Key Name
                </label>
                <Input
                  id="keyName"
                  placeholder="e.g., ios_api_key"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newKeyName.trim()) {
                      handleGenerate();
                    }
                  }}
                  className="text-(--color-text-primary)"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {generatedKey ? (
              <Button onClick={closeGenerateDialog}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeGenerateDialog}>
                  Cancel
                </Button>
                <Button
                  onClick={handleGenerate}
                  disabled={!newKeyName.trim() || generating}
                >
                  {generating ? 'Generating...' : 'Generate'}
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
            <DialogTitle className="text-(--color-text-primary)">Regenerate API Key</DialogTitle>
            <DialogDescription className="text-text-secondary">
              {regeneratedKey
                ? 'Your API key has been regenerated. Copy it now - you won\'t be able to see it again!'
                : 'This will generate a new key and invalidate the old one. This action cannot be undone.'}
            </DialogDescription>
          </DialogHeader>

          {regeneratedKey ? (
            <div className="space-y-4">
              <Alert variant="warning">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle className="text-(--color-text-primary)">API Key Regenerated</AlertTitle>
                <AlertDescription className="text-text-secondary">
                  The old key has been invalidated. Make sure to update all services using this key.
                </AlertDescription>
              </Alert>
              <div className="flex items-center gap-2">
                <Input value={regeneratedKey} readOnly className="font-mono text-sm text-(--color-text-primary)" />
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
              <Button onClick={closeRegenerateDialog}>Done</Button>
            ) : (
              <>
                <Button variant="outline" onClick={closeRegenerateDialog}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleRegenerate}>
                  Regenerate
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
            <DialogTitle className="text-(--color-text-primary)">Revoke API Key</DialogTitle>
            <DialogDescription className="text-text-secondary">
              This will permanently revoke this API key. All requests using this key will fail. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke}>
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
