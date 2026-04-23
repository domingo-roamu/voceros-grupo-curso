-- ============================================================
-- Migración: Acceso público a la cuota de curso
-- Ejecutar en Supabase SQL Editor DESPUÉS de migration-quotas-multi.sql
-- ============================================================
-- Permite que la vista pública (sin login) lea la Cuota de Curso
-- del año activo cuando el admin activa el toggle "mostrar cuotas
-- públicamente". Las cuotas ad-hoc siguen siendo privadas.
-- ============================================================

BEGIN;

-- ============================================================
-- quotas: anon puede leer sólo cuotas 'course' activas
-- ============================================================
DROP POLICY IF EXISTS "Quotas: lectura pública cuota curso" ON quotas;
CREATE POLICY "Quotas: lectura pública cuota curso"
  ON quotas FOR SELECT
  TO anon
  USING (kind = 'course' AND is_active = true);

-- ============================================================
-- quota_participants: anon puede leer participantes de cuotas 'course' activas
-- ============================================================
DROP POLICY IF EXISTS "QuotaParticipants: lectura pública cuota curso" ON quota_participants;
CREATE POLICY "QuotaParticipants: lectura pública cuota curso"
  ON quota_participants FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM quotas q
      WHERE q.id = quota_participants.quota_id
        AND q.kind = 'course'
        AND q.is_active = true
    )
  );

-- ============================================================
-- quota_payments: anon puede leer pagos de cuotas 'course' activas
-- ============================================================
DROP POLICY IF EXISTS "QuotaPayments: lectura pública cuota curso" ON quota_payments;
CREATE POLICY "QuotaPayments: lectura pública cuota curso"
  ON quota_payments FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM quotas q
      WHERE q.id = quota_payments.quota_id
        AND q.kind = 'course'
        AND q.is_active = true
    )
  );

-- ============================================================
-- students: anon puede leer sólo alumnos activos
-- (necesario para joinear nombre en la vista pública)
-- ============================================================
DROP POLICY IF EXISTS "Students: lectura pública activos" ON students;
CREATE POLICY "Students: lectura pública activos"
  ON students FOR SELECT
  TO anon
  USING (active = true);

COMMIT;
