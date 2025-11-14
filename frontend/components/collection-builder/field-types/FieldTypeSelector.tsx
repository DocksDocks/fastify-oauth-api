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
import { useTranslations } from 'next-intl';

const FIELD_TYPE_ICONS: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-4 w-4" />,
  longtext: <FileText className="h-4 w-4" />,
  richtext: <Edit3 className="h-4 w-4" />,
  integer: <Hash className="h-4 w-4" />,
  decimal: <Hash className="h-4 w-4" />,
  date: <Calendar className="h-4 w-4" />,
  datetime: <Clock className="h-4 w-4" />,
  boolean: <ToggleLeft className="h-4 w-4" />,
  enum: <List className="h-4 w-4" />,
  json: <Braces className="h-4 w-4" />,
  relation: <Link className="h-4 w-4" />,
  media: <ImageIcon className="h-4 w-4" />,
};

interface FieldTypeSelectorProps {
  value: FieldType;
  onChange: (value: FieldType) => void;
  disabled?: boolean;
}

export function FieldTypeSelector({ value, onChange, disabled }: FieldTypeSelectorProps) {
  const t = useTranslations('collectionBuilder');

  const fieldTypeOptions: { value: FieldType; label: string; icon: React.ReactNode }[] = [
    { value: 'text', label: t('fieldTypes.text'), icon: FIELD_TYPE_ICONS.text },
    { value: 'longtext', label: t('fieldTypes.longtext'), icon: FIELD_TYPE_ICONS.longtext },
    { value: 'richtext', label: t('fieldTypes.richtext'), icon: FIELD_TYPE_ICONS.richtext },
    { value: 'integer', label: t('fieldTypes.integer'), icon: FIELD_TYPE_ICONS.integer },
    { value: 'decimal', label: t('fieldTypes.decimal'), icon: FIELD_TYPE_ICONS.decimal },
    { value: 'date', label: t('fieldTypes.date'), icon: FIELD_TYPE_ICONS.date },
    { value: 'datetime', label: t('fieldTypes.datetime'), icon: FIELD_TYPE_ICONS.datetime },
    { value: 'boolean', label: t('fieldTypes.boolean'), icon: FIELD_TYPE_ICONS.boolean },
    { value: 'enum', label: t('fieldTypes.enum'), icon: FIELD_TYPE_ICONS.enum },
    { value: 'json', label: t('fieldTypes.json'), icon: FIELD_TYPE_ICONS.json },
    { value: 'relation', label: t('fieldTypes.relation'), icon: FIELD_TYPE_ICONS.relation },
    { value: 'media', label: t('fieldTypes.media'), icon: FIELD_TYPE_ICONS.media },
  ];

  return (
    <div className="space-y-2">
      <Label htmlFor="field-type">{t('fieldTypeSelector.label')}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="field-type">
          <SelectValue placeholder={t('fieldTypeSelector.placeholder')} />
        </SelectTrigger>
        <SelectContent>
          {fieldTypeOptions.map((option) => (
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
export { FIELD_TYPE_ICONS };
