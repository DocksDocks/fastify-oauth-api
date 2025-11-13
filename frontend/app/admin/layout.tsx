'use client';

import { useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Menu, X } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const t = useTranslations('navigation');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated } = useAuthStore();

  // Check if we're on a public page (login, OAuth callback, or setup)
  const isPublicPage =
    pathname === '/admin/login' ||
    pathname?.startsWith('/admin/auth/callback') ||
    pathname?.startsWith('/admin/setup');

  // Only show sidebar and mobile menu if authenticated and not on public pages
  const shouldShowSidebar = isAuthenticated && !isPublicPage;

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Header with Hamburger - only show if sidebar should be visible */}
      {shouldShowSidebar && (
        <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-sidebar px-2 py-1 md:hidden shadow-md border-b border-sidebar-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-sidebar-foreground hover:bg-sidebar-accent"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
          <h1 className="text-lg font-bold text-sidebar-foreground">{t('title')}</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      )}

      {/* Mobile Backdrop - only show if sidebar should be visible */}
      {shouldShowSidebar && isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - only render if should be visible */}
      {shouldShowSidebar && (
        <Sidebar
          isMobileMenuOpen={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile padding to account for fixed header - only if sidebar is visible */}
        {shouldShowSidebar && <div className="h-14 md:hidden" />}
        <main className={`flex-1 flex flex-col overflow-hidden ${shouldShowSidebar ? 'p-6' : ''} bg-background`}>
          {children}
        </main>
      </div>
    </div>
  );
}
