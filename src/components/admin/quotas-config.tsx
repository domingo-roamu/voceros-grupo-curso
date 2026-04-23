'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff } from 'lucide-react';

interface QuotasConfigProps {
  showPublic: boolean;
}

export function QuotasConfig({ showPublic }: QuotasConfigProps) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(showPublic);
  const [loading, setLoading] = useState(false);

  async function handleToggle(checked: boolean) {
    setEnabled(checked);
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from('app_settings')
        .update({ value: String(checked), updated_at: new Date().toISOString() })
        .eq('key', 'show_quotas_public');
      router.refresh();
    } catch {
      setEnabled(!checked);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card">
      {enabled ? (
        <Eye className="h-4 w-4 text-income" />
      ) : (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      )}
      <Label htmlFor="show-public" className="cursor-pointer text-sm">
        Cuota de curso {enabled ? 'pública' : 'oculta'}
      </Label>
      <Switch
        id="show-public"
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={loading}
      />
    </div>
  );
}
