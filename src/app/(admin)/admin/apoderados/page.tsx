import { getStudents } from '@/lib/supabase/queries';
import { ApoderadosList } from '@/components/admin/apoderados-list';

export default async function ApoderadosPage() {
  const students = await getStudents();

  const emailSet = new Set<string>();
  for (const s of students) {
    if (s.parent1_email) emailSet.add(s.parent1_email);
    if (s.parent2_email) emailSet.add(s.parent2_email);
  }

  return (
    <ApoderadosList
      students={students}
      totalEmails={emailSet.size}
    />
  );
}
