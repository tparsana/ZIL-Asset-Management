'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { MobileNav } from './mobile-nav';
import { Header } from './header';
import { CreatedCuriouslyCredit } from '@/components/shared/created-curiously-credit';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  sessionName?: string | null;
  sessionEmail?: string | null;
}

export function AppShell({ children, sessionName, sessionEmail }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isAuthScreen = pathname === '/login' || pathname === '/auth';

  if (isAuthScreen) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      {/* Desktop Sidebar */}
      <Sidebar className="hidden lg:flex" sessionName={sessionName} sessionEmail={sessionEmail} />
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Mobile Sidebar */}
      <div className={cn(
        'fixed inset-y-0 right-0 z-50 w-72 transform transition-transform duration-200 ease-in-out lg:hidden',
        sidebarOpen ? 'translate-x-0' : 'translate-x-full'
      )}>
        <Sidebar
          onClose={() => setSidebarOpen(false)}
          side="right"
          sessionName={sessionName}
          sessionEmail={sessionEmail}
        />
      </div>

      {/* Main Content */}
      <div className="min-w-0 lg:pl-64">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex min-h-[calc(100vh-4rem)] flex-col pb-20 lg:pb-6">
          <div className="flex-1">
            {children}
          </div>
          <div className="flex h-5 items-center justify-center px-4 pb-0 sm:px-5 lg:px-6">
            <CreatedCuriouslyCredit />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileNav className="lg:hidden" />
    </div>
  );
}
