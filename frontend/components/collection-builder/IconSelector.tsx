'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Database,
  User,
  FileText,
  Image,
  ShoppingCart,
  Tag,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Settings,
  Folder,
  File,
  Upload,
  Download,
  Link,
  Bell,
  Clock,
  Hash,
  List,
  Grid,
  Users,
  Building,
  Package,
  BookOpen,
  Newspaper,
  Video,
  Music,
  Heart,
  Star,
  Flag,
  Check,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface IconSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function IconSelector({ value, onChange, error }: IconSelectorProps) {
  const tIcons = useTranslations('collectionBuilder.icons');
  const [searchQuery, setSearchQuery] = useState('');

  // Build icon options with translations
  const iconOptions = [
    { value: 'Database', label: tIcons('database'), Icon: Database },
    { value: 'User', label: tIcons('user'), Icon: User },
    { value: 'Users', label: tIcons('users'), Icon: Users },
    { value: 'FileText', label: tIcons('fileText'), Icon: FileText },
    { value: 'Image', label: tIcons('image'), Icon: Image },
    { value: 'ShoppingCart', label: tIcons('shoppingCart'), Icon: ShoppingCart },
    { value: 'Tag', label: tIcons('tag'), Icon: Tag },
    { value: 'Calendar', label: tIcons('calendar'), Icon: Calendar },
    { value: 'Mail', label: tIcons('mail'), Icon: Mail },
    { value: 'Phone', label: tIcons('phone'), Icon: Phone },
    { value: 'MapPin', label: tIcons('mapPin'), Icon: MapPin },
    { value: 'Settings', label: tIcons('settings'), Icon: Settings },
    { value: 'Folder', label: tIcons('folder'), Icon: Folder },
    { value: 'File', label: tIcons('file'), Icon: File },
    { value: 'Upload', label: tIcons('upload'), Icon: Upload },
    { value: 'Download', label: tIcons('download'), Icon: Download },
    { value: 'Link', label: tIcons('link'), Icon: Link },
    { value: 'Bell', label: tIcons('bell'), Icon: Bell },
    { value: 'Clock', label: tIcons('clock'), Icon: Clock },
    { value: 'Hash', label: tIcons('hash'), Icon: Hash },
    { value: 'List', label: tIcons('list'), Icon: List },
    { value: 'Grid', label: tIcons('grid'), Icon: Grid },
    { value: 'Building', label: tIcons('building'), Icon: Building },
    { value: 'Package', label: tIcons('package'), Icon: Package },
    { value: 'BookOpen', label: tIcons('book'), Icon: BookOpen },
    { value: 'Newspaper', label: tIcons('newspaper'), Icon: Newspaper },
    { value: 'Video', label: tIcons('video'), Icon: Video },
    { value: 'Music', label: tIcons('music'), Icon: Music },
    { value: 'Heart', label: tIcons('heart'), Icon: Heart },
    { value: 'Star', label: tIcons('star'), Icon: Star },
    { value: 'Flag', label: tIcons('flag'), Icon: Flag },
    { value: 'Check', label: tIcons('check'), Icon: Check },
    { value: 'X', label: tIcons('x'), Icon: X },
    { value: 'Plus', label: tIcons('plus'), Icon: Plus },
    { value: 'Minus', label: tIcons('minus'), Icon: Minus },
  ];

  const selectedIcon = iconOptions.find((icon) => icon.value === value);
  const SelectedIconComponent = selectedIcon?.Icon || Database;

  const filteredIcons = searchQuery
    ? iconOptions.filter(
        (icon) =>
          icon.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          icon.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : iconOptions;

  return (
    <div className="space-y-2">
      <Label htmlFor="icon-selector">Icon</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="icon-selector" className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              <SelectedIconComponent className="h-4 w-4" />
              <span>{selectedIcon?.label || tIcons('database')}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              placeholder={tIcons('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-2"
            />
          </div>
          <div className="max-h-[300px] overflow-y-auto">
            {filteredIcons.map((icon) => (
              <SelectItem key={icon.value} value={icon.value}>
                <div className="flex items-center gap-2">
                  <icon.Icon className="h-4 w-4" />
                  <span>{icon.label}</span>
                </div>
              </SelectItem>
            ))}
            {filteredIcons.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                {tIcons('noIconsFound')}
              </div>
            )}
          </div>
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        {tIcons('chooseIcon')}
      </p>
    </div>
  );
}
