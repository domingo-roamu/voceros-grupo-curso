'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, ExternalLink } from 'lucide-react';

interface AdminHeaderProps {
  courseName: string;
  userEmail: string;
}

export function AdminHeader({ courseName, userEmail }: AdminHeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const initial = userEmail?.charAt(0).toUpperCase() ?? 'A';

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 shadow-sm lg:px-6">
      <h1 className="text-lg font-bold tracking-tight truncate">{courseName}</h1>
      <div className="flex items-center gap-1">
        <Link
          href="/"
          target="_blank"
          className="flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ExternalLink className="h-4 w-4" />
          <span className="hidden sm:inline">Ver pública</span>
        </Link>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-sm font-semibold text-primary-foreground ring-2 ring-primary/20">
          {initial}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
          className="min-h-[44px] min-w-[44px]"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
