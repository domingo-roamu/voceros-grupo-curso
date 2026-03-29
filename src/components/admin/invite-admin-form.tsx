'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Send, Check } from 'lucide-react';

export function InviteAdminForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleInvite() {
    setError(null);
    setSuccess(false);

    if (!email.trim() || !email.includes('@')) {
      setError('Ingresa un correo válido.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar invitación');
      }

      setSuccess(true);
      setEmail('');
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar invitación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-4 w-4" />
          Invitar administrador
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Envía una invitación por correo para que otro apoderado pueda administrar la plataforma.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="inviteEmail">Correo electrónico</Label>
          <div className="flex gap-2">
            <Input
              id="inviteEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="apoderado@email.com"
              className="h-12 flex-1 text-base"
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
            <Button
              onClick={handleInvite}
              disabled={loading}
              className="h-12 gap-2"
            >
              {loading ? (
                'Enviando...'
              ) : success ? (
                <>
                  <Check className="h-4 w-4" />
                  Enviada
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Invitar
                </>
              )}
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        {success && (
          <p className="text-sm text-income">
            Invitación enviada correctamente. El usuario recibirá un correo para crear su contraseña.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
