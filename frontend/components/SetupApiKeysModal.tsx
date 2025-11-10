'use client';

/**
 * Setup API Keys Modal
 *
 * Displays generated API keys after first-time setup
 * Shows keys only once and requires user confirmation
 */

import { useState } from 'react';
import { CheckCircle2, AlertTriangle, Monitor, Smartphone, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';

interface ApiKeys {
  ios: string;
  android: string;
  adminPanel: string;
}

interface SetupApiKeysModalProps {
  apiKeys: ApiKeys;
  onComplete: () => void;
}

export function SetupApiKeysModal({ apiKeys, onComplete }: SetupApiKeysModalProps) {
  const [keySaved, setKeySaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (text: string, keyName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(keyName);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <Dialog open={true} modal>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Setup Complete!</DialogTitle>
              <DialogDescription>Your API keys have been generated</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Alert */}
          <Alert variant="default" className="border-yellow-500 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-600 dark:text-yellow-500">
              Important: Save These Keys Now
            </AlertTitle>
            <AlertDescription className="text-yellow-600/90 dark:text-yellow-500/90">
              These keys are shown only once. Copy and save them before closing this window.
            </AlertDescription>
          </Alert>

          {/* Admin Panel Key */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-primary" />
                  Admin Panel API Key
                </CardTitle>
                <Badge variant="outline" className="text-green-600 border-green-600">
                  Saved to .env
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Already added to .env file. Admin panel will restart automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  readOnly
                  value={apiKeys.adminPanel}
                  className="font-mono text-sm"
                />
                <Button
                  variant="default"
                  size="default"
                  onClick={() => copyToClipboard(apiKeys.adminPanel, 'adminPanel')}
                >
                  {copiedKey === 'adminPanel' ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* iOS Key */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                iOS API Key
              </CardTitle>
              <CardDescription className="text-xs">
                Store this key in your iOS mobile app configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  readOnly
                  value={apiKeys.ios}
                  className="font-mono text-sm"
                />
                <Button
                  variant="default"
                  size="default"
                  onClick={() => copyToClipboard(apiKeys.ios, 'ios')}
                >
                  {copiedKey === 'ios' ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Android Key */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary" />
                Android API Key
              </CardTitle>
              <CardDescription className="text-xs">
                Store this key in your Android mobile app configuration.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex gap-2">
                <Input
                  type="text"
                  readOnly
                  value={apiKeys.android}
                  className="font-mono text-sm"
                />
                <Button
                  variant="default"
                  size="default"
                  onClick={() => copyToClipboard(apiKeys.android, 'android')}
                >
                  {copiedKey === 'android' ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Confirmation */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
            <Switch id="keys-saved" checked={keySaved} onCheckedChange={setKeySaved} />
            <Label htmlFor="keys-saved" className="text-sm cursor-pointer leading-relaxed">
              I have saved the iOS and Android API keys. I understand these keys won&apos;t be
              shown again.
            </Label>
          </div>

          {/* Complete Button */}
          <Button onClick={handleComplete} disabled={!keySaved} className="w-full" size="lg">
            Complete Setup
          </Button>

          {/* Next Steps */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Next steps:</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Admin panel will reload automatically</li>
                <li>• Login with your OAuth account to access the dashboard</li>
                <li>• Add more authorized admins from the admin panel</li>
                <li>• Configure your mobile apps with the iOS/Android keys</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
