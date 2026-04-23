import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { getQuotaDetail, getStudents } from '@/lib/supabase/queries';
import { QuotasGrid } from '@/components/admin/quotas-grid';
import { QuotaDetailHeader } from '@/components/admin/quota-detail-header';

interface PageProps {
  params: { id: string };
}

export default async function QuotaDetailPage({ params }: PageProps) {
  const [detail, students] = await Promise.all([
    getQuotaDetail(params.id),
    getStudents(),
  ]);

  if (!detail) notFound();

  const hasPaidPayments = detail.participants.some((p) => p.payments.some((pay) => pay.is_paid));
  const participantIds = detail.participants.map((p) => p.student_id);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/cuotas"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Volver a cuotas
      </Link>

      <QuotaDetailHeader
        quota={detail.quota}
        students={students}
        initialParticipantIds={participantIds}
        hasPaidPayments={hasPaidPayments}
      />

      <QuotasGrid detail={detail} />
    </div>
  );
}
