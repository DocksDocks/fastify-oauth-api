import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Key, Database, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api';
import type { Collection } from '@/types';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'API Keys', href: '/admin/api-keys', icon: Key },
];

export function Sidebar() {
  const location = useLocation();
  const { user } = useAuthStore();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);

  useEffect(() => {
    fetchCollections();
  }, []);

  useEffect(() => {
    // Auto-expand Collections dropdown if on a collection page
    if (location.pathname.startsWith('/admin/collections/')) {
      setIsCollectionsOpen(true);
    }
  }, [location.pathname]);

  const fetchCollections = async () => {
    try {
      const response = await adminApi.getCollections();
      setCollections(response.data.data.collections);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    }
  };

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-primary text-primary-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-primary-foreground/20 px-6">
        <h1 className="text-xl font-bold text-white">Admin Panel</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}

        {/* Collections Collapsible */}
        <Collapsible open={isCollectionsOpen} onOpenChange={setIsCollectionsOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                location.pathname.startsWith('/admin/collections')
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              )}
            >
              <Database className="h-5 w-5" />
              <span className="flex-1 text-left">Collections</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform',
                  isCollectionsOpen && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pl-8 pt-1">
            {collections.map((collection) => {
              const isActive = location.pathname === `/admin/collections/${collection.table}`;
              return (
                <Link
                  key={collection.table}
                  to={`/admin/collections/${collection.table}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer',
                    isActive
                      ? 'bg-white/20 text-white font-medium'
                      : 'text-white/60 hover:bg-white/10 hover:text-white/90'
                  )}
                >
                  {collection.name}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      </nav>

      {/* User section */}
      <div className="border-t border-white/20 p-4">
        <div className="flex items-center gap-3">
          {user?.avatar && (
            <img src={user.avatar} alt={user.name || 'User'} className="h-8 w-8 rounded-full ring-2 ring-white/20" />
          )}
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{user?.name || 'User'}</p>
            <p className="truncate text-xs text-white/60">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
