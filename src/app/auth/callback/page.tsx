'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [message, setMessage] = useState('Validando enlace...');

  useEffect(() => {
    const supabase = createClient();
    const url = new URL(window.location.href);
    const next = url.searchParams.get('next') ?? '/admin';
    const code = url.searchParams.get('code');

    async function handle() {
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/login?error=invalid_link');
          return;
        }
        router.replace(next);
        return;
      }

      // Implicit flow: supabase-js processes the hash automatically on client init.
      // Poll briefly for the resulting session.
      for (let i = 0; i < 20; i++) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          router.replace(next);
          return;
        }
        await new Promise((r) => setTimeout(r, 100));
      }

      setMessage('Enlace inválido o expirado. Redirigiendo...');
      router.replace('/login?error=invalid_link');
    }

    handle();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-balance-light/30 px-4">
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  );
}
