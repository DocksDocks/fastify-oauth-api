'use client';

/**
 * Setup API Keys Modal
 *
 * Displays generated API keys after first-time setup
 * Shows keys only once and requires user confirmation
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, AlertTriangle, Smartphone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { ApiKeyCard } from '@/components/ApiKeyCard';

interface ApiKeys {
  ios: string;
  android: string;
  web: string;
}

interface SetupApiKeysModalProps {
  apiKeys: ApiKeys;
  onComplete: () => void;
}

export function SetupApiKeysModal({ apiKeys, onComplete }: SetupApiKeysModalProps) {
  const t = useTranslations('setupApiKeys');
  const [keySaved, setKeySaved] = useState(false);

  return (
    <Dialog open={true} modal>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <DialogTitle className="text-2xl">{t('title')}</DialogTitle>
              <DialogDescription>{t('subtitle')}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning Alert */}
          <Alert variant="default" className="border-yellow-500 bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle className="text-yellow-600 dark:text-yellow-500">
              {t('warning.title')}
            </AlertTitle>
            <AlertDescription className="text-yellow-600/90 dark:text-yellow-500/90">
              {t('warning.description')}
            </AlertDescription>
          </Alert>

          <ApiKeyCard
            title={t('keys.web.title')}
            description={t('keys.web.description')}
            apiKey={apiKeys.web}
            icon={Globe}
            keyName="web"
          />

          <ApiKeyCard
            title={t('keys.ios.title')}
            description={t('keys.ios.description')}
            apiKey={apiKeys.ios}
            icon={Smartphone}
            keyName="ios"
          />

          <ApiKeyCard
            title={t('keys.android.title')}
            description={t('keys.android.description')}
            apiKey={apiKeys.android}
            icon={Smartphone}
            keyName="android"
          />

          {/* Confirmation */}
          <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg border">
            <Switch id="keys-saved" checked={keySaved} onCheckedChange={setKeySaved} />
            <Label htmlFor="keys-saved" className="text-sm cursor-pointer leading-relaxed">
              {t('confirmation')}
            </Label>
          </div>

          {/* Complete Button */}
          <Button onClick={onComplete} disabled={!keySaved} className="w-full" size="lg">
            {t('completeSetup')}
          </Button>

          {/* Next Steps */}
          <Card className="bg-muted/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">{t('nextSteps.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• {t('nextSteps.loginOAuth')}</li>
                <li>• {t('nextSteps.addAdmins')}</li>
                <li>• {t('nextSteps.configureWeb')}</li>
                <li>• {t('nextSteps.configureMobile')}</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
