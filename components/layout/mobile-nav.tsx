'use client';

import type { ComponentType } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Home, Scan, Package, History, Settings } from 'lucide-react';

interface MobileNavProps {
  className?: string;
}

type NavIconProps = {
  className?: string;
};

function FilledHomeIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.94 2.6a1.5 1.5 0 0 1 2.12 0l7 7a1.5 1.5 0 0 1-2.12 2.12l-.44-.43V19a2 2 0 0 1-2 2h-2.75a1 1 0 0 1-1-1v-4h-1.5v4a1 1 0 0 1-1 1H6.5a2 2 0 0 1-2-2v-7.7l-.44.43A1.5 1.5 0 0 1 1.94 9.6l7-7Z"
      />
    </svg>
  );
}

function FilledScanIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.25" fill="currentColor" />
      <rect x="15" y="3" width="6" height="6" rx="1.25" fill="currentColor" />
      <rect x="3" y="15" width="6" height="6" rx="1.25" fill="currentColor" />
      <rect x="11" y="11" width="2.5" height="2.5" rx="0.6" fill="currentColor" />
      <rect x="15" y="11" width="2.5" height="6.5" rx="0.6" fill="currentColor" />
      <rect x="18.5" y="11" width="2.5" height="2.5" rx="0.6" fill="currentColor" />
      <rect x="11" y="15" width="2.5" height="6" rx="0.6" fill="currentColor" />
      <rect x="18.5" y="15" width="2.5" height="6" rx="0.6" fill="currentColor" />
    </svg>
  );
}

function FilledPackageIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.88 2.63a2.25 2.25 0 0 1 2.24 0l6.5 3.7A2.25 2.25 0 0 1 20.75 8.3v7.4a2.25 2.25 0 0 1-1.13 1.96l-6.5 3.7a2.25 2.25 0 0 1-2.24 0l-6.5-3.7a2.25 2.25 0 0 1-1.13-1.96V8.3a2.25 2.25 0 0 1 1.13-1.96l6.5-3.7ZM12 4.93 6.81 7.88 12 10.84l5.19-2.96L12 4.93Zm-6.25 4.9v5.87L10.75 18.55v-5.87L5.75 9.83Zm6.5 8.72 5-2.85V9.83l-5 2.85v5.87Z"
      />
    </svg>
  );
}

function FilledHistoryIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.75a9.25 9.25 0 1 1-8.96 11.55 1 1 0 0 1 1.94-.48A7.25 7.25 0 1 0 12 4.75c-2.1 0-4.03.89-5.4 2.33h2.15a1 1 0 1 1 0 2H3.5a1 1 0 0 1-1-1V2.83a1 1 0 1 1 2 0v2.55A9.2 9.2 0 0 1 12 2.75Zm0 4a1 1 0 0 1 1 1v3.84l2.62 1.57a1 1 0 0 1-1.03 1.72l-3.1-1.86a1 1 0 0 1-.49-.86V7.75a1 1 0 0 1 1-1Z"
      />
    </svg>
  );
}

function FilledSettingsIcon({ className }: NavIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M10.63 2.57a1.5 1.5 0 0 1 2.74 0l.68 1.59c.16.37.52.63.92.65l1.72.1a1.5 1.5 0 0 1 1.94 1.94l-.1 1.72c-.02.4.23.76.6.92l1.64.68a1.5 1.5 0 0 1 0 2.74l-1.59.68a1 1 0 0 0-.65.92l-.1 1.72a1.5 1.5 0 0 1-1.94 1.94l-1.72-.1a1 1 0 0 0-.92.6l-.68 1.64a1.5 1.5 0 0 1-2.74 0l-.68-1.59a1 1 0 0 0-.92-.65l-1.72-.1a1.5 1.5 0 0 1-1.94-1.94l.1-1.72a1 1 0 0 0-.6-.92l-1.64-.68a1.5 1.5 0 0 1 0-2.74l1.59-.68a1 1 0 0 0 .65-.92l.1-1.72a1.5 1.5 0 0 1 1.94-1.94l1.72.1a1 1 0 0 0 .92-.6l.68-1.64ZM12 9.25a2.75 2.75 0 1 0 0 5.5 2.75 2.75 0 0 0 0-5.5Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const navItems: Array<{
  href: string;
  label: string;
  icon: ComponentType<NavIconProps>;
  activeIcon: ComponentType<NavIconProps>;
}> = [
  { href: '/', label: 'Home', icon: Home, activeIcon: FilledHomeIcon },
  { href: '/scan', label: 'Scan', icon: Scan, activeIcon: FilledScanIcon },
  { href: '/inventory', label: 'Inventory', icon: Package, activeIcon: FilledPackageIcon },
  { href: '/history', label: 'History', icon: History, activeIcon: FilledHistoryIcon },
  { href: '/settings', label: 'Settings', icon: Settings, activeIcon: FilledSettingsIcon },
];

export function MobileNav({ className }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80',
        className
      )}
    >
      <div className="mx-auto flex h-16 max-w-md items-center justify-around px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = isActive ? item.activeIcon : item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center gap-1 rounded-lg py-2 transition-colors',
                'active:scale-95',
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'scale-[1.05]')} />
              <span className={cn('text-xs font-medium', isActive && 'font-semibold')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
