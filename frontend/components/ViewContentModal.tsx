'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ViewContentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: string;
  title: string;
  type: string;
  columns?: Array<{ name: string; type: string }>;
}

export function ViewContentModal({
  open,
  onOpenChange,
  content,
  title,
  type,
  columns,
}: ViewContentModalProps) {
  const formatValue = (value: unknown, columnType?: string): string => {
    if (value === null || value === undefined) return '-';

    // Format dates and timestamps
    if (columnType === 'date' || columnType === 'timestamp') {
      try {
        const date = new Date(value as string | number | Date);
        const formatter = new Intl.DateTimeFormat(undefined, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        return formatter.format(date);
      } catch {
        return String(value);
      }
    }

    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  const formatContent = () => {
    if (type === 'row') {
      try {
        const rowData = JSON.parse(content) as Record<string, unknown>;
        return (
          <div className="space-y-3">
            {Object.entries(rowData).map(([key, value]) => {
              // Find column type from metadata
              const column = columns?.find((col) => col.name === key);
              const columnType = column?.type;

              return (
                <div key={key} className="flex flex-col gap-1 pb-3 border-b border-border last:border-0">
                  <span className="text-sm font-semibold text-foreground/70 capitalize">
                    {key.replace(/_/g, ' ')}
                  </span>
                  {typeof value === 'boolean' ? (
                    <Badge variant={value ? 'default' : 'destructive'} className="w-fit">
                      {value ? 'Yes' : 'No'}
                    </Badge>
                  ) : key === 'role' ? (
                    <Badge variant="outline" className="capitalize w-fit">
                      {String(value ?? '')}
                    </Badge>
                  ) : (
                    <span className="text-foreground whitespace-pre-wrap wrap-break-word font-mono text-sm">
                      {formatValue(value, columnType)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        );
      } catch {
        return <p className="text-foreground whitespace-pre-wrap wrap-break-wordword">{content}</p>;
      }
    }

    if (type === 'json') {
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className="bg-muted p-4 rounded-md overflow-auto max-h-[60vh] text-sm">
            <code className="text-foreground font-mono">
              {JSON.stringify(parsed, null, 2)}
            </code>
          </pre>
        );
      } catch {
        return <p className="text-foreground whitespace-pre-wrap wrap-break-word">{content}</p>;
      }
    }

    return <p className="text-foreground whitespace-pre-wrap wrap-break-word">{content}</p>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Full content view</DialogDescription>
        </DialogHeader>
        <div className="overflow-auto flex-1">{formatContent()}</div>
      </DialogContent>
    </Dialog>
  );
}
