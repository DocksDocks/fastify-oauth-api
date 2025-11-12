import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { FieldType } from '@/types';
import {
  Type,
  FileText,
  Edit3,
  Hash,
  Calendar,
  Clock,
  ToggleLeft,
  List,
  Braces,
  Link,
  Image as ImageIcon,
} from 'lucide-react';

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Text', icon: <Type className="h-4 w-4" /> },
  { value: 'longtext', label: 'Long Text', icon: <FileText className="h-4 w-4" /> },
  { value: 'richtext', label: 'Rich Text', icon: <Edit3 className="h-4 w-4" /> },
  { value: 'number', label: 'Number', icon: <Hash className="h-4 w-4" /> },
  { value: 'date', label: 'Date', icon: <Calendar className="h-4 w-4" /> },
  { value: 'datetime', label: 'Date & Time', icon: <Clock className="h-4 w-4" /> },
  { value: 'boolean', label: 'Boolean', icon: <ToggleLeft className="h-4 w-4" /> },
  { value: 'enum', label: 'Enum (Options)', icon: <List className="h-4 w-4" /> },
  { value: 'json', label: 'JSON', icon: <Braces className="h-4 w-4" /> },
  { value: 'relation', label: 'Relation', icon: <Link className="h-4 w-4" /> },
  { value: 'media', label: 'Media', icon: <ImageIcon className="h-4 w-4" /> },
];

interface FieldTypeSelectorProps {
  value: FieldType;
  onChange: (value: FieldType) => void;
  disabled?: boolean;
}

export function FieldTypeSelector({ value, onChange, disabled }: FieldTypeSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="field-type">Field Type</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="field-type">
          <SelectValue placeholder="Select field type" />
        </SelectTrigger>
        <SelectContent>
          {FIELD_TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center gap-2">
                {option.icon}
                <span>{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Export field type icons for use in other components
export const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  longtext: <FileText className="h-4 w-4" />,
  richtext: <Edit3 className="h-4 w-4" />,
  number: <Hash className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  datetime: <Clock className="h-4 w-4" />,
  boolean: <ToggleLeft className="h-4 w-4" />,
  enum: <List className="h-4 w-4" />,
  json: <Braces className="h-4 w-4" />,
  relation: <Link className="h-4 w-4" />,
  media: <ImageIcon className="h-4 w-4" />,
};
