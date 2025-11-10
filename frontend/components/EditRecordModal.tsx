'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface EditRecordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: Record<string, unknown>;
  columns: Array<{ name: string; type: string; label: string; enumValues?: string[]; readonly?: boolean }>;
  onSave: (updatedData: Record<string, unknown>) => Promise<void>;
  userRole?: 'user' | 'admin' | 'superadmin';
  tableName?: string;
}

export function EditRecordModal({
  open,
  onOpenChange,
  record,
  columns,
  onSave,
  userRole,
  tableName,
}: EditRecordModalProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize form data when record changes
  useEffect(() => {
    if (record) {
      setFormData({ ...record });
    }
  }, [record]);

  // Filter out readonly fields
  const editableColumns = columns.filter((col) => {
    const readonlyFields = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'];
    return !readonlyFields.includes(col.name);
  });

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const handleSaveClick = () => {
    setShowConfirmation(true);
  };

  const handleConfirmSave = async () => {
    setIsSaving(true);
    try {
      // Filter out readonly fields before saving
      const readonlyFields = ['id', 'createdAt', 'updatedAt', 'created_at', 'updated_at'];
      const editableData = Object.fromEntries(
        Object.entries(formData).filter(([key]) => !readonlyFields.includes(key) && !columns.find(col => col.name === key)?.readonly)
      );

      await onSave(editableData);
      setShowConfirmation(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderField = (column: { name: string; type: string; label: string; enumValues?: string[]; readonly?: boolean }) => {
    const value = formData[column.name];

    // Render readonly fields as plain text
    if (column.readonly) {
      let displayValue: string;

      switch (column.type) {
        case 'boolean':
          displayValue = value ? 'Yes' : 'No';
          break;
        case 'date':
        case 'timestamp':
          try {
            const date = value ? new Date(value as string | number | Date) : null;
            displayValue = date
              ? column.type === 'timestamp'
                ? `${format(date, 'PPP')} (${format(date, 'p')})`
                : format(date, 'PPP')
              : 'Not set';
          } catch {
            displayValue = String(value ?? 'Not set');
          }
          break;
        case 'json':
          displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '');
          break;
        default:
          displayValue = String(value ?? '');
      }

      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-text-secondary">
            {column.label} <span className="text-text-tertiary text-xs">(readonly)</span>
          </Label>
          <div className="w-full rounded-md border border-border bg-input-readonly px-3 py-2 text-sm text-text-secondary">
            {displayValue || <span className="text-text-muted italic">Empty</span>}
          </div>
        </div>
      );
    }

    switch (column.type) {
      case 'enum': {
        // Filter enum values based on RBAC for users table role field
        let availableEnumValues = column.enumValues || [];

        if (tableName === 'users' && column.name === 'role' && userRole !== 'superadmin') {
          // Non-superadmin users cannot assign superadmin role
          availableEnumValues = availableEnumValues.filter((v) => v !== 'superadmin');
        }

        return (
          <div className="space-y-2">
            <Label htmlFor={column.name} className="text-sm font-medium">
              {column.label}
            </Label>
            <Select
              value={String(value ?? '')}
              onValueChange={(newValue) => handleFieldChange(column.name, newValue)}
            >
              <SelectTrigger id={column.name}>
                <SelectValue placeholder="Select a value" />
              </SelectTrigger>
              <SelectContent>
                {availableEnumValues.map((enumValue) => (
                  <SelectItem key={enumValue} value={enumValue}>
                    {enumValue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      }

      case 'boolean':
        return (
          <div className="flex items-center justify-between gap-4">
            <Label htmlFor={column.name} className="text-sm font-medium">
              {column.label}
            </Label>
            <Switch
              id={column.name}
              checked={Boolean(value)}
              onCheckedChange={(checked) => handleFieldChange(column.name, checked)}
            />
          </div>
        );

      case 'number':
        return (
          <div className="space-y-2">
            <Label htmlFor={column.name} className="text-sm font-medium">
              {column.label}
            </Label>
            <Input
              id={column.name}
              type="number"
              value={value as number | undefined}
              onChange={(e) => handleFieldChange(column.name, Number(e.target.value))}
            />
          </div>
        );

      case 'json':
        return (
          <div className="space-y-2">
            <Label htmlFor={column.name} className="text-sm font-medium">
              {column.label}
            </Label>
            <textarea
              id={column.name}
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value ?? '')}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  handleFieldChange(column.name, parsed);
                } catch {
                  handleFieldChange(column.name, e.target.value);
                }
              }}
            />
          </div>
        );

      case 'date':
      case 'timestamp': {
        // Parse current value as Date
        let currentDate: Date | undefined;
        try {
          currentDate = value ? new Date(value as string | number | Date) : undefined;
        } catch {
          currentDate = undefined;
        }

        // Extract time components
        const hours = currentDate ? currentDate.getHours().toString().padStart(2, '0') : '00';
        const minutes = currentDate ? currentDate.getMinutes().toString().padStart(2, '0') : '00';
        const seconds = currentDate ? currentDate.getSeconds().toString().padStart(2, '0') : '00';

        const handleDateSelect = (selectedDate: Date | undefined) => {
          if (!selectedDate) {
            handleFieldChange(column.name, null);
            return;
          }

          // Preserve time from current value or use 00:00:00
          const newDate = new Date(selectedDate);
          if (currentDate) {
            newDate.setHours(currentDate.getHours());
            newDate.setMinutes(currentDate.getMinutes());
            newDate.setSeconds(currentDate.getSeconds());
          } else {
            newDate.setHours(0, 0, 0, 0);
          }

          handleFieldChange(column.name, newDate.toISOString());
        };

        const handleTimeChange = (type: 'hours' | 'minutes' | 'seconds', newValue: string) => {
          const date = currentDate || new Date();
          const numValue = parseInt(newValue, 10);

          if (isNaN(numValue)) return;

          if (type === 'hours' && numValue >= 0 && numValue <= 23) {
            date.setHours(numValue);
          } else if (type === 'minutes' && numValue >= 0 && numValue <= 59) {
            date.setMinutes(numValue);
          } else if (type === 'seconds' && numValue >= 0 && numValue <= 59) {
            date.setSeconds(numValue);
          } else {
            return; // Invalid value
          }

          handleFieldChange(column.name, date.toISOString());
        };

        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium">{column.label}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {currentDate ? (
                    column.type === 'timestamp' ? (
                      `${format(currentDate, 'PPP')} (${format(currentDate, 'p')})`
                    ) : (
                      format(currentDate, 'PPP')
                    )
                  ) : (
                    `Pick a ${column.type === 'timestamp' ? 'date & time' : 'date'}`
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={currentDate}
                  onSelect={handleDateSelect}
                  initialFocus
                />
                {column.type === 'timestamp' && (
                  <div className="p-3 border-t border-border">
                    <Label className="text-xs text-muted-foreground mb-2 block">Time</Label>
                    <div className="flex gap-2 items-center justify-center">
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={hours}
                        onChange={(e) => handleTimeChange('hours', e.target.value)}
                        className="w-16 text-center"
                        placeholder="HH"
                      />
                      <span className="text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={minutes}
                        onChange={(e) => handleTimeChange('minutes', e.target.value)}
                        className="w-16 text-center"
                        placeholder="MM"
                      />
                      <span className="text-muted-foreground">:</span>
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        value={seconds}
                        onChange={(e) => handleTimeChange('seconds', e.target.value)}
                        className="w-16 text-center"
                        placeholder="SS"
                      />
                    </div>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        );
      }

      default:
        // text, enum
        return (
          <div className="space-y-2">
            <Label htmlFor={column.name} className="text-sm font-medium">
              {column.label}
            </Label>
            <Input
              id={column.name}
              type="text"
              value={String(value ?? '')}
              onChange={(e) => handleFieldChange(column.name, e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Record</DialogTitle>
            <DialogDescription>
              Make changes to the record. Protected fields (ID, timestamps) are hidden.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-auto flex-1 space-y-4 py-4">
            {editableColumns.map((column) => (
              <div key={column.name}>{renderField(column)}</div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveClick}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Changes</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to save these changes? This action will update the record in the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
