'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AppLogo } from '@/components/shared/app-logo';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

function fallbackForPath(pathname: string, hasLocationDetail: boolean) {
  if (pathname.startsWith('/assets/')) return '/inventory';
  if (pathname === '/locations' && hasLocationDetail) return '/locations';
  return '/';
}

export function Header({ onMenuClick }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hasLocationDetail = pathname === '/locations' && Boolean(searchParams.get('id'));
  const showBackButton = pathname !== '/' && pathname !== '/auth' && pathname !== '/login';
  const fallbackHref = fallbackForPath(pathname, hasLocationDetail);

  return (
    <header className="sticky top-0 z-20 h-16 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="relative flex h-full items-center justify-between px-4">
        <div className="flex w-10 items-center justify-start">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.length > 1) {
                  router.back();
                } else {
                  router.push(fallbackHref);
                }
              }}
            >
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
          ) : (
            <div className="h-10 w-10" />
          )}
        </div>

        <div className="pointer-events-none absolute inset-x-0 flex justify-center">
          <div className="flex h-16 max-w-[70vw] items-center gap-2">
            <AppLogo className="h-8 w-12 shrink-0 sm:h-9 sm:w-14" priority />
            <span className="truncate text-sm font-semibold leading-none sm:text-base">Assets Manager</span>
          </div>
        </div>

        <div className="flex w-10 items-center justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
