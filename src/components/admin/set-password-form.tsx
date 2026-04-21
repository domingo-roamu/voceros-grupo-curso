'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function SetPasswordForm() {
  const [email, setEmail] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace('/login?error=expired_link');
        return;
      }
      setEmail(data.user.email ?? null);
      setChecking(false);
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        setError('No se pudo guardar la contraseña. Intenta de nuevo.');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('Error al guardar la contraseña. Intenta más tarde.');
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <Card className="w-full max-w-sm shadow-card-hover">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Verificando enlace...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-sm shadow-card-hover">
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-lg font-bold text-primary-foreground">
          GC
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight text-primary">Crea tu contraseña</CardTitle>
        <CardDescription>
          {email ? <>Estás configurando el acceso para <strong>{email}</strong></> : 'Define una contraseña para ingresar'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nueva contraseña</Label>
            <Input
              id="password"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="h-12 text-base"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmar contraseña</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="Repite la contraseña"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="h-12 text-base"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-12 w-full text-base shadow-sm transition-all hover:shadow-md" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar y entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
