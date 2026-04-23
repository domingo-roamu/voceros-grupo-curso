-- ============================================================
-- Migración: Cuotas múltiples (curso + ad-hoc)
-- Ejecutar en Supabase SQL Editor
-- ============================================================
-- Convierte el modelo de "una sola cuota anual" a "múltiples cuotas"
-- donde cada cuota tiene su propio monto, subset de alumnos y plan
-- de parcialidades. Preserva todos los datos existentes migrando
-- la cuota actual a una fila tipo 'course' llamada "Cuota Curso <año>".
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Nueva tabla: quotas
-- ============================================================
CREATE TABLE IF NOT EXISTS quotas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  total_amount  numeric(12,2) NOT NULL,
  installments  int NOT NULL DEFAULT 1,
  year          int NOT NULL,
  kind          text NOT NULL CHECK (kind IN ('course','adhoc')) DEFAULT 'adhoc',
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  created_by    uuid REFERENCES auth.users
);

-- ============================================================
-- 2. Nueva tabla: quota_participants (m:n cuota ↔ alumno)
-- ============================================================
CREATE TABLE IF NOT EXISTS quota_participants (
  quota_id                uuid NOT NULL REFERENCES quotas(id) ON DELETE CASCADE,
  student_id              uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  amount_per_installment  numeric(12,2) NOT NULL,
  PRIMARY KEY (quota_id, student_id)
);

-- ============================================================
-- 3. Refactor quota_payments
-- ============================================================
ALTER TABLE quota_payments ADD COLUMN IF NOT EXISTS quota_id uuid REFERENCES quotas(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quota_payments' AND column_name = 'quota_number'
  ) THEN
    ALTER TABLE quota_payments RENAME COLUMN quota_number TO installment_number;
  END IF;
END $$;

-- ============================================================
-- 4. Migración de datos: crear una "Cuota Curso YYYY" por cada año existente
-- ============================================================
DO $$
DECLARE
  yr int;
  new_quota_id uuid;
  max_installments int;
  total_amt numeric;
BEGIN
  FOR yr IN
    SELECT DISTINCT year FROM quota_payments
    UNION
    SELECT DISTINCT key::int
      FROM students, jsonb_object_keys(quota_plan) AS key
      WHERE quota_plan IS NOT NULL AND quota_plan::text <> '{}'
  LOOP
    IF EXISTS (SELECT 1 FROM quotas WHERE year = yr AND kind = 'course') THEN
      CONTINUE;
    END IF;

    SELECT COALESCE(MAX((quota_plan->(yr::text)->>'total_quotas')::int), 1)
      INTO max_installments
      FROM students
      WHERE quota_plan ? (yr::text);
    IF max_installments IS NULL OR max_installments < 1 THEN
      max_installments := 1;
    END IF;

    SELECT COALESCE(SUM(
        ((quota_plan->(yr::text)->>'total_quotas')::numeric) *
        ((quota_plan->(yr::text)->>'amount_per_quota')::numeric)
      ), 0)
      INTO total_amt
      FROM students
      WHERE quota_plan ? (yr::text) AND active = true;

    INSERT INTO quotas (name, total_amount, installments, year, kind)
      VALUES ('Cuota Curso ' || yr, total_amt, max_installments, yr, 'course')
      RETURNING id INTO new_quota_id;

    INSERT INTO quota_participants (quota_id, student_id, amount_per_installment)
    SELECT new_quota_id, s.id, (s.quota_plan->(yr::text)->>'amount_per_quota')::numeric
      FROM students s
      WHERE s.quota_plan ? (yr::text) AND s.active = true;

    UPDATE quota_payments
      SET quota_id = new_quota_id
      WHERE year = yr AND quota_id IS NULL;
  END LOOP;
END $$;

-- Pagos huérfanos (por si quedara alguno sin quota_plan asociado): crear cuota genérica
DO $$
DECLARE
  yr int;
  new_quota_id uuid;
BEGIN
  FOR yr IN
    SELECT DISTINCT year FROM quota_payments WHERE quota_id IS NULL
  LOOP
    INSERT INTO quotas (name, total_amount, installments, year, kind)
      VALUES ('Cuota Curso ' || yr, 0, 1, yr, 'course')
      RETURNING id INTO new_quota_id;

    UPDATE quota_payments SET quota_id = new_quota_id WHERE year = yr AND quota_id IS NULL;
  END LOOP;
END $$;

ALTER TABLE quota_payments ALTER COLUMN quota_id SET NOT NULL;

ALTER TABLE quota_payments
  DROP CONSTRAINT IF EXISTS quota_payments_student_id_year_quota_number_key;

ALTER TABLE quota_payments
  ADD CONSTRAINT quota_payments_quota_student_installment_key
  UNIQUE (quota_id, student_id, installment_number);

-- ============================================================
-- 5. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_quotas_year ON quotas(year);
CREATE INDEX IF NOT EXISTS idx_quota_participants_student ON quota_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_quota_payments_quota ON quota_payments(quota_id);

-- ============================================================
-- 6. Row Level Security
-- ============================================================
ALTER TABLE quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Quotas: lectura autenticado"
  ON quotas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Quotas: insertar autenticado"
  ON quotas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Quotas: actualizar autenticado"
  ON quotas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Quotas: eliminar autenticado"
  ON quotas FOR DELETE TO authenticated USING (true);

CREATE POLICY "QuotaParticipants: lectura autenticado"
  ON quota_participants FOR SELECT TO authenticated USING (true);
CREATE POLICY "QuotaParticipants: insertar autenticado"
  ON quota_participants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "QuotaParticipants: actualizar autenticado"
  ON quota_participants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "QuotaParticipants: eliminar autenticado"
  ON quota_participants FOR DELETE TO authenticated USING (true);

COMMIT;
