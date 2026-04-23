'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Home,
  Scan,
  Layers,
  Package,
  History,
  MapPin,
  ClipboardCheck,
  Settings,
  X,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/scan', label: 'Scan Asset', icon: Scan },
  { href: '/batch-scan', label: 'Batch Scan', icon: Layers },
  { href: '/inventory', label: 'Inventory', icon: Package },
  { href: '/history', label: 'History', icon: History },
  { href: '/locations', label: 'Locations', icon: MapPin },
  { href: '/audit', label: 'Audit Mode', icon: ClipboardCheck },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar({ className, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className={cn(
      'fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-card border-r border-border',
      className
    )}>
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Package className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-none">ZIL Assets</span>
            <span className="text-xs text-muted-foreground leading-none mt-0.5">Asset Manager</span>
          </div>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="lg:hidden">
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  'active:scale-[0.98]',
                  isActive 
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground' 
                    : 'text-muted-foreground'
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground">
          <p>Zoom Innovation Lab</p>
          <p>Arizona State University</p>
        </div>
      </div>
    </div>
  );
}
