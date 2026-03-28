'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Student } from '@/types';

interface StudentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  year: number;
  totalQuotas: number;
}

export function StudentForm({ open, onOpenChange, student, year, totalQuotas }: StudentFormProps) {
  const router = useRouter();
  const isEditing = !!student;

  const [fullName, setFullName] = useState(student?.full_name ?? '');
  const [parent1Name, setParent1Name] = useState(student?.parent1_name ?? '');
  const [parent1Email, setParent1Email] = useState(student?.parent1_email ?? '');
  const [parent2Name, setParent2Name] = useState(student?.parent2_name ?? '');
  const [parent2Email, setParent2Email] = useState(student?.parent2_email ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('El nombre del alumno es obligatorio.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const payload = {
        full_name: fullName.trim(),
        parent1_name: parent1Name.trim() || null,
        parent1_email: parent1Email.trim().toLowerCase() || null,
        parent2_name: parent2Name.trim() || null,
        parent2_email: parent2Email.trim().toLowerCase() || null,
      };

      if (isEditing && student) {
        const { error: updateError } = await supabase
          .from('students')
          .update(payload)
          .eq('id', student.id);
        if (updateError) throw updateError;
      } else {
        // Insert student
        const { data, error: insertError } = await supabase
          .from('students')
          .insert({ ...payload, active: true })
          .select('id')
          .single();
        if (insertError) throw insertError;

        // Create empty quota_payments for current year
        if (data) {
          const quotas = Array.from({ length: totalQuotas }, (_, i) => ({
            student_id: data.id,
            year,
            quota_number: i + 1,
            amount: null,
            is_paid: false,
          }));
          await supabase.from('quota_payments').insert(quotas);
        }
      }

      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Error al guardar el alumno.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!student) return;
    if (!confirm(`¿Eliminar a ${student.full_name}? Se eliminarán también sus cuotas.`)) return;

    setLoading(true);
    try {
      const supabase = createClient();
      // quota_payments have ON DELETE CASCADE
      const { error } = await supabase.from('students').delete().eq('id', student.id);
      if (error) throw error;
      onOpenChange(false);
      router.refresh();
    } catch {
      setError('Error al eliminar el alumno.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar alumno' : 'Nuevo alumno'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nombre completo del alumno *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nombre Apellido"
              required
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Apoderado 1</Label>
            <Input
              value={parent1Name}
              onChange={(e) => setParent1Name(e.target.value)}
              placeholder="Nombre apoderado"
              className="h-12 text-base"
            />
            <Input
              type="email"
              value={parent1Email}
              onChange={(e) => setParent1Email(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="h-12 text-base"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Apoderado 2</Label>
            <Input
              value={parent2Name}
              onChange={(e) => setParent2Name(e.target.value)}
              placeholder="Nombre apoderado"
              className="h-12 text-base"
            />
            <Input
              type="email"
              value={parent2Email}
              onChange={(e) => setParent2Email(e.target.value)}
              placeholder="correo@ejemplo.com"
              className="h-12 text-base"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="submit" className="h-12 flex-1 text-base" disabled={loading}>
              {loading ? 'Guardando...' : isEditing ? 'Actualizar' : 'Agregar alumno'}
            </Button>
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                className="h-12"
                onClick={handleDelete}
                disabled={loading}
              >
                Eliminar
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
