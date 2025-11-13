'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings } from 'lucide-react';
import type { CollectionColumn } from '@/types';

interface ColumnSelectorProps {
  columns: CollectionColumn[];
  visibleColumns: string[];
  onSave: (selectedColumns: string[]) => Promise<void>;
}

export function ColumnSelector({ columns, visibleColumns, onSave }: ColumnSelectorProps) {
  const t = useTranslations('components.columnSelector');
  const [open, setOpen] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(visibleColumns);
  const [isSaving, setIsSaving] = useState(false);

  const toggleColumn = (columnName: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(columnName)) {
        return prev.filter((c) => c !== columnName);
      } else {
        return [...prev, columnName];
      }
    });
  };

  const handleSave = async () => {
    if (selectedColumns.length === 0) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(selectedColumns);
      setOpen(false);
    } catch (error) {
      console.error('Failed to save column preferences:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpen = () => {
    setSelectedColumns(visibleColumns);
    setOpen(true);
  };

  // Filter out timestamp columns
  const selectableColumns = columns.filter(
    (col) => col.type !== 'timestamp' && col.type !== 'date'
  );

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        <Settings className="h-4 w-4 mr-2" />
        {t('buttonLabel')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('title')}</DialogTitle>
            <DialogDescription>
              {t('description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[400px] overflow-y-auto py-4">
            {selectableColumns.map((column) => {
              const isSelected = selectedColumns.includes(column.name);
              const isId = column.name === 'id';

              return (
                <div
                  key={column.name}
                  className="flex items-center space-x-3 p-2 rounded-md hover:bg-muted/50"
                >
                  <Checkbox
                    id={`column-${column.name}`}
                    checked={isSelected}
                    onCheckedChange={() => toggleColumn(column.name)}
                    disabled={isId} // ID column is always required
                  />
                  <label
                    htmlFor={`column-${column.name}`}
                    className="flex-1 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {column.label}
                    {isId && (
                      <span className="ml-2 text-xs text-muted-foreground">{t('required')}</span>
                    )}
                  </label>
                  <span className="text-xs text-muted-foreground capitalize">
                    {column.type}
                  </span>
                </div>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isSaving}>
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSave}
              disabled={selectedColumns.length === 0 || isSaving}
            >
              {isSaving ? t('saving') : t('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
