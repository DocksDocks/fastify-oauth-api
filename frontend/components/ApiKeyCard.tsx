import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Check, LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ApiKeyCardProps {
  title: string;
  description: string;
  apiKey: string;
  icon: LucideIcon;
  keyName: string;
}

export function ApiKeyCard({ title, description, apiKey, icon: Icon }: ApiKeyCardProps) {
  const t = useTranslations('components.apiKeyCard');
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert(t('failedToCopy'));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          {title}
        </CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex gap-2">
          <Input type="text" readOnly value={apiKey} className="font-mono text-sm" />
          <Button variant="default" size="default" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                {t('copied')}
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                {t('copy')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
