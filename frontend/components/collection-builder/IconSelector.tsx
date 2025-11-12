'use client';

import { useState } from 'react';
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

// Common icons for collections
const ICON_OPTIONS = [
  { value: 'Database', label: 'Database', Icon: Database },
  { value: 'User', label: 'User', Icon: User },
  { value: 'Users', label: 'Users', Icon: Users },
  { value: 'FileText', label: 'File Text', Icon: FileText },
  { value: 'Image', label: 'Image', Icon: Image },
  { value: 'ShoppingCart', label: 'Shopping Cart', Icon: ShoppingCart },
  { value: 'Tag', label: 'Tag', Icon: Tag },
  { value: 'Calendar', label: 'Calendar', Icon: Calendar },
  { value: 'Mail', label: 'Mail', Icon: Mail },
  { value: 'Phone', label: 'Phone', Icon: Phone },
  { value: 'MapPin', label: 'Map Pin', Icon: MapPin },
  { value: 'Settings', label: 'Settings', Icon: Settings },
  { value: 'Folder', label: 'Folder', Icon: Folder },
  { value: 'File', label: 'File', Icon: File },
  { value: 'Upload', label: 'Upload', Icon: Upload },
  { value: 'Download', label: 'Download', Icon: Download },
  { value: 'Link', label: 'Link', Icon: Link },
  { value: 'Bell', label: 'Bell', Icon: Bell },
  { value: 'Clock', label: 'Clock', Icon: Clock },
  { value: 'Hash', label: 'Hash', Icon: Hash },
  { value: 'List', label: 'List', Icon: List },
  { value: 'Grid', label: 'Grid', Icon: Grid },
  { value: 'Building', label: 'Building', Icon: Building },
  { value: 'Package', label: 'Package', Icon: Package },
  { value: 'BookOpen', label: 'Book', Icon: BookOpen },
  { value: 'Newspaper', label: 'Newspaper', Icon: Newspaper },
  { value: 'Video', label: 'Video', Icon: Video },
  { value: 'Music', label: 'Music', Icon: Music },
  { value: 'Heart', label: 'Heart', Icon: Heart },
  { value: 'Star', label: 'Star', Icon: Star },
  { value: 'Flag', label: 'Flag', Icon: Flag },
  { value: 'Check', label: 'Check', Icon: Check },
  { value: 'X', label: 'X', Icon: X },
  { value: 'Plus', label: 'Plus', Icon: Plus },
  { value: 'Minus', label: 'Minus', Icon: Minus },
];

interface IconSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

export function IconSelector({ value, onChange, error }: IconSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const selectedIcon = ICON_OPTIONS.find((icon) => icon.value === value);
  const SelectedIconComponent = selectedIcon?.Icon || Database;

  const filteredIcons = searchQuery
    ? ICON_OPTIONS.filter(
        (icon) =>
          icon.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          icon.value.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : ICON_OPTIONS;

  return (
    <div className="space-y-2">
      <Label htmlFor="icon-selector">Icon</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id="icon-selector" className="w-full">
          <SelectValue>
            <div className="flex items-center gap-2">
              <SelectedIconComponent className="h-4 w-4" />
              <span>{selectedIcon?.label || 'Database'}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <div className="p-2">
            <Input
              placeholder="Search icons..."
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
                No icons found
              </div>
            )}
          </div>
        </SelectContent>
      </Select>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Choose an icon to represent this collection
      </p>
    </div>
  );
}
