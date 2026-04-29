'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AccountMenuProps {
  sessionName?: string | null;
  sessionEmail?: string | null;
  onClose?: () => void;
}

function getProfileParts(name?: string | null) {
  const normalized = name?.trim() || 'Authenticated User';
  const parts = normalized.split(/\s+/).filter(Boolean);

  return {
    displayName: normalized,
    firstName: parts[0] ?? 'Authenticated',
    lastName: parts.slice(1).join(' '),
  };
}

export function AccountMenu({ sessionName, sessionEmail, onClose }: AccountMenuProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const profile = useMemo(() => getProfileParts(sessionName), [sessionName]);

  async function handleSignOut() {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      onClose?.();
      router.replace('/auth');
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  const avatar = (
    <Avatar className="h-12 w-12 shrink-0 border border-border/80">
      <AvatarFallback className="bg-primary/8 text-sm font-semibold tracking-[0.08em] text-primary">
        ZIL
      </AvatarFallback>
    </Avatar>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-2xl border border-border/90 bg-background px-4 py-4 shadow-[0_8px_24px_rgba(15,23,42,0.06)] transition-colors hover:bg-accent/15 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2"
          aria-label="Open account menu"
        >
          {avatar}

          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">
              {profile.firstName} {profile.lastName}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {sessionEmail ?? 'Authenticated session'}
            </div>
          </div>

          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side="top"
        align="end"
        sideOffset={10}
        collisionPadding={16}
        className="w-56 rounded-2xl border border-border/90 p-0 shadow-[0_20px_40px_rgba(15,23,42,0.12)]"
      >
        <div className="px-4 py-4">
          <DropdownMenuLabel className="px-0 pb-0 text-sm font-medium tracking-normal text-foreground">
            {profile.displayName}
          </DropdownMenuLabel>
          <DropdownMenuLabel className="px-0 pt-1 text-xs font-normal text-muted-foreground">
            {sessionEmail ?? 'Authenticated session'}
          </DropdownMenuLabel>
        </div>

        <DropdownMenuSeparator className="mx-0 my-0" />

        <div className="p-2">
          <DropdownMenuItem
            variant="destructive"
            disabled={isSigningOut}
            className="rounded-xl px-3 py-3 text-base"
            onSelect={(event) => {
              event.preventDefault();
              void handleSignOut();
            }}
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? 'Signing out...' : 'Sign out'}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
