'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Key, Database, ChevronDown, LogOut, ShieldCheck } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'API Keys', href: '/admin/api-keys', icon: Key },
  { name: 'Authorized Admins', href: '/admin/authorized-admins', icon: ShieldCheck },
];

interface SidebarProps {
  isMobileMenuOpen?: boolean;
  onCloseMobile?: () => void;
}

export function Sidebar({ isMobileMenuOpen = false, onCloseMobile }: SidebarProps = {}) {
  const pathname = usePathname();
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false);

  const fetchCollections = async () => {
    try {
      const response = await adminApi.getCollections();
      setCollections(response.data.data.collections);
    } catch (error) {
      console.error('Failed to fetch collections:', error);
    }
  };

  useEffect(() => {
    // Only fetch collections if user is authenticated
    if (user && isAuthenticated) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchCollections();
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    // Auto-expand Collections dropdown if on a collection page
    if (pathname?.startsWith('/admin/collections/')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCollectionsOpen(true);
    }
  }, [pathname]);

  const handleLogout = () => {
    clearAuth();
    window.location.href = '/admin/login';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'outline';
    }
  };

  // Helper to close mobile menu when clicking links
  const handleLinkClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <div
      className={cn(
        "flex h-screen w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 ease-in-out border-r border-sidebar-border",
        // Mobile: fixed position, slide from left
        "fixed inset-y-0 left-0 z-40 md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-sidebar-border">
        <h1 className="text-xl font-bold">Admin Panel</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={handleLinkClick}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
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
                pathname?.startsWith('/admin/collections')
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <Database className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left">Collections</span>
              <ChevronDown
                className={cn(
                  'h-4 w-4 transition-transform flex-shrink-0',
                  isCollectionsOpen && 'rotate-180'
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 pl-8 pt-1">
            {collections.map((collection) => {
              const isActive = pathname === `/admin/collections/${collection.table}`;
              return (
                <Link
                  key={collection.table}
                  href={`/admin/collections/${collection.table}`}
                  onClick={handleLinkClick}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors cursor-pointer',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
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
      <div className="p-4 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-sidebar-accent cursor-pointer">
            {user?.avatar && (
              <Image
                src={user.avatar}
                alt={user.name || 'User'}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-sidebar-border flex-shrink-0"
              />
            )}
            <div className="flex-1 overflow-hidden text-left">
              <p className="truncate text-sm font-medium">{user?.name || 'User'}</p>
              <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-sidebar-foreground/60 flex-shrink-0" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-2">
                <p className="text-sm font-medium leading-none">{user?.name || 'User'}</p>
                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                {user?.role && (
                  <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize w-fit">
                    {user.role}
                  </Badge>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
