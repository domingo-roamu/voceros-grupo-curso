'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Settings } from 'lucide-react';

interface GeneralSettingsFormProps {
  settings: Record<string, string>;
}

export function GeneralSettingsForm({ settings }: GeneralSettingsFormProps) {
  const router = useRouter();
  const [courseName, setCourseName] = useState(settings['course_name'] ?? '');
  const [activeYear, setActiveYear] = useState(settings['active_year'] ?? String(new Date().getFullYear()));
  const [showQuotas, setShowQuotas] = useState(settings['show_quotas_public'] === 'true');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setLoading(true);
    setSaved(false);
    try {
      const supabase = createClient();
      const entries = [
        { key: 'course_name', value: courseName },
        { key: 'active_year', value: activeYear },
        { key: 'show_quotas_public', value: showQuotas ? 'true' : 'false' },
      ];
      for (const entry of entries) {
        const { error } = await supabase.from('app_settings').upsert(entry, { onConflict: 'key' });
        if (error) {
          console.error('Error saving', entry.key, error);
          throw error;
        }
      }
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save error:', err);
      alert('Error al guardar. Revisa la consola para más detalles.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Settings className="h-4 w-4" />
          General
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="courseName">Nombre del curso</Label>
          <Input
            id="courseName"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Ej: Grupo Curso 7°D"
            className="h-12 text-base"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="activeYear">Año activo</Label>
          <Input
            id="activeYear"
            type="number"
            value={activeYear}
            onChange={(e) => setActiveYear(e.target.value)}
            className="h-12 text-base"
          />
        </div>
        <div className="flex items-center gap-3">
          <Switch
            id="showQuotas"
            checked={showQuotas}
            onCheckedChange={setShowQuotas}
          />
          <Label htmlFor="showQuotas" className="cursor-pointer">
            Mostrar estado de cuotas en la página pública
          </Label>
        </div>
        <Button onClick={handleSave} disabled={loading} className="h-12">
          {loading ? 'Guardando...' : saved ? '¡Guardado!' : 'Guardar cambios'}
        </Button>
      </CardContent>
    </Card>
  );
}
