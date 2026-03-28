-- ============================================================
-- Tesorería 7D — Schema SQL completo
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TABLA: students
-- ============================================================
CREATE TABLE IF NOT EXISTS students (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name   text NOT NULL,
  parent1_name  text,
  parent1_email text,
  parent2_name  text,
  parent2_email text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 2. TABLA: transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date        date NOT NULL,
  type        text NOT NULL CHECK (type IN ('income', 'expense')),
  category    text NOT NULL,
  description text,
  amount      numeric(12,2) NOT NULL,
  year        int NOT NULL,
  created_by  uuid REFERENCES auth.users,
  created_at  timestamptz DEFAULT now()
);

-- ============================================================
-- 3. TABLA: quota_payments
-- ============================================================
CREATE TABLE IF NOT EXISTS quota_payments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id  uuid REFERENCES students(id) ON DELETE CASCADE,
  year        int NOT NULL,
  quota_number int NOT NULL,
  amount      numeric(12,2),
  paid_at     date,
  is_paid     boolean DEFAULT false,
  notes       text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE(student_id, year, quota_number)
);

-- ============================================================
-- 4. TABLA: announcements
-- ============================================================
CREATE TABLE IF NOT EXISTS announcements (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  content       text NOT NULL,
  is_pinned     boolean DEFAULT false,
  published_at  timestamptz DEFAULT now(),
  created_by    uuid REFERENCES auth.users,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 5. TABLA: report_schedules
-- ============================================================
CREATE TABLE IF NOT EXISTS report_schedules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  frequency     text NOT NULL CHECK (frequency IN ('manual', 'weekly', 'monthly', 'custom')),
  custom_date   date,
  day_of_week   int CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month  int CHECK (day_of_month BETWEEN 1 AND 31),
  last_sent_at  timestamptz,
  is_active     boolean DEFAULT true,
  created_by    uuid REFERENCES auth.users,
  created_at    timestamptz DEFAULT now()
);

-- ============================================================
-- 6. TABLA: app_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS app_settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  value       text NOT NULL,
  updated_at  timestamptz DEFAULT now()
);

-- Insertar configuración inicial
INSERT INTO app_settings (key, value) VALUES
  ('active_year', '2026'),
  ('show_quotas_public', 'false'),
  ('course_name', 'Tesorería 7°D')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 7. ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_year ON transactions(year);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_quota_payments_student ON quota_payments(student_id);
CREATE INDEX IF NOT EXISTS idx_quota_payments_year ON quota_payments(year);
CREATE INDEX IF NOT EXISTS idx_announcements_pinned ON announcements(is_pinned DESC, published_at DESC);

-- ============================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8.1 Políticas para TRANSACTIONS (lectura pública)
-- ============================================================
CREATE POLICY "Transactions: lectura pública"
  ON transactions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Transactions: insertar autenticado"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Transactions: actualizar autenticado"
  ON transactions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Transactions: eliminar autenticado"
  ON transactions FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 8.2 Políticas para ANNOUNCEMENTS (lectura pública)
-- ============================================================
CREATE POLICY "Announcements: lectura pública"
  ON announcements FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Announcements: insertar autenticado"
  ON announcements FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Announcements: actualizar autenticado"
  ON announcements FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Announcements: eliminar autenticado"
  ON announcements FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 8.3 Políticas para APP_SETTINGS (lectura pública)
-- ============================================================
CREATE POLICY "AppSettings: lectura pública"
  ON app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "AppSettings: actualizar autenticado"
  ON app_settings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- 8.4 Políticas para STUDENTS (solo autenticados)
-- ============================================================
CREATE POLICY "Students: lectura autenticado"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Students: insertar autenticado"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Students: actualizar autenticado"
  ON students FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Students: eliminar autenticado"
  ON students FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 8.5 Políticas para QUOTA_PAYMENTS (solo autenticados)
-- ============================================================
CREATE POLICY "QuotaPayments: lectura autenticado"
  ON quota_payments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "QuotaPayments: insertar autenticado"
  ON quota_payments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "QuotaPayments: actualizar autenticado"
  ON quota_payments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "QuotaPayments: eliminar autenticado"
  ON quota_payments FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================
-- 8.6 Políticas para REPORT_SCHEDULES (solo autenticados)
-- ============================================================
CREATE POLICY "ReportSchedules: lectura autenticado"
  ON report_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "ReportSchedules: insertar autenticado"
  ON report_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "ReportSchedules: actualizar autenticado"
  ON report_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "ReportSchedules: eliminar autenticado"
  ON report_schedules FOR DELETE
  TO authenticated
  USING (true);
