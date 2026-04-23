'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mail, Users, Copy, Check, Pencil, GraduationCap, User, Plus } from 'lucide-react';
import { StudentForm } from './student-form';
import type { Student } from '@/types';

interface ApoderadosListProps {
  students: Student[];
  totalEmails: number;
}

interface EditingData {
  student: Student;
}

export function ApoderadosList({ students, totalEmails }: ApoderadosListProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState<EditingData | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit form state
  const [p1Name, setP1Name] = useState('');
  const [p1Email, setP1Email] = useState('');
  const [p2Name, setP2Name] = useState('');
  const [p2Email, setP2Email] = useState('');

  function startEdit(student: Student) {
    setP1Name(student.parent1_name ?? '');
    setP1Email(student.parent1_email ?? '');
    setP2Name(student.parent2_name ?? '');
    setP2Email(student.parent2_email ?? '');
    setEditing({ student });
  }

  async function handleSave() {
    if (!editing) return;
    setLoading(true);
    try {
      const supabase = createClient();
      await supabase
        .from('students')
        .update({
          parent1_name: p1Name.trim() || null,
          parent1_email: p1Email.trim().toLowerCase() || null,
          parent2_name: p2Name.trim() || null,
          parent2_email: p2Email.trim().toLowerCase() || null,
        })
        .eq('id', editing.student.id);
      setEditing(null);
      router.refresh();
    } catch {
      alert('Error al guardar.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(q) ||
      (s.parent1_name?.toLowerCase().includes(q) ?? false) ||
      (s.parent1_email?.toLowerCase().includes(q) ?? false) ||
      (s.parent2_name?.toLowerCase().includes(q) ?? false) ||
      (s.parent2_email?.toLowerCase().includes(q) ?? false)
    );
  });

  const allEmails: string[] = [];
  for (const s of students) {
    if (s.parent1_email) allEmails.push(s.parent1_email);
    if (s.parent2_email) allEmails.push(s.parent2_email);
  }
  const uniqueEmails = Array.from(new Set(allEmails));

  async function handleCopyAll() {
    await navigator.clipboard.writeText(uniqueEmails.join(', '));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const studentsWithoutContacts = students.filter(
    (s) => !s.parent1_email && !s.parent2_email
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-bold">Apoderados</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowAddStudent(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar alumno
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleCopyAll}>
            {copied ? <Check className="h-4 w-4 text-income" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiados' : `Copiar emails`}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Alumnos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-balance" />
              <p className="text-2xl font-bold">{students.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Emails de contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-income" />
              <p className="text-2xl font-bold">{totalEmails}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sin contacto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-expense" />
              <p className="text-2xl font-bold">{studentsWithoutContacts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Input
        placeholder="Buscar por alumno, apoderado o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-12 text-base"
      />

      {/* Student family cards — 2 columns on desktop */}
      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((s) => {
          const hasP1 = s.parent1_name || s.parent1_email;
          const hasP2 = s.parent2_name || s.parent2_email;
          const noContacts = !hasP1 && !hasP2;

          return (
            <Card key={s.id} className="shadow-card transition-shadow hover:shadow-card-hover">
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    {/* Student name */}
                    <div className="flex items-center gap-1.5">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0 text-balance" />
                      <p className="text-sm font-semibold truncate">{s.full_name}</p>
                    </div>

                    {/* Parents - compact */}
                    {hasP1 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{s.parent1_name || '—'}</span>
                        {s.parent1_email && (
                          <span className="truncate text-income">{s.parent1_email}</span>
                        )}
                      </div>
                    )}
                    {hasP2 && (
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="h-3 w-3 shrink-0 text-muted-foreground" />
                        <span className="truncate">{s.parent2_name || '—'}</span>
                        {s.parent2_email && (
                          <span className="truncate text-income">{s.parent2_email}</span>
                        )}
                      </div>
                    )}

                    {noContacts && (
                      <Badge className="border-0 bg-expense/10 text-expense text-[10px]">
                        Sin contacto
                      </Badge>
                    )}
                  </div>

                  <button
                    className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                    onClick={() => startEdit(s)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="py-8 text-center text-muted-foreground">
          {search ? 'No se encontraron resultados.' : 'No hay alumnos registrados.'}
        </p>
      )}

      {/* Edit dialog */}
      {editing && (
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Apoderados de {editing.student.full_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5">
              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium text-muted-foreground">Apoderado 1</p>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={p1Name}
                    onChange={(e) => setP1Name(e.target.value)}
                    placeholder="Nombre completo"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={p1Email}
                    onChange={(e) => setP1Email(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <p className="text-sm font-medium text-muted-foreground">Apoderado 2</p>
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={p2Name}
                    onChange={(e) => setP2Name(e.target.value)}
                    placeholder="Nombre completo"
                    className="h-12 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={p2Email}
                    onChange={(e) => setP2Email(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="h-12 text-base"
                  />
                </div>
              </div>

              <Button onClick={handleSave} className="h-12 w-full text-base" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <StudentForm
        open={showAddStudent}
        onOpenChange={setShowAddStudent}
      />
    </div>
  );
}
