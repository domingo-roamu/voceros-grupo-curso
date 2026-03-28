-- ============================================================
-- Migración: Sistema de compromisos / pagos parciales
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Tabla de compromisos
CREATE TABLE IF NOT EXISTS partial_commitments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  description   text NOT NULL,
  category      text NOT NULL,
  total_amount  numeric(12,2) NOT NULL,
  paid_amount   numeric(12,2) DEFAULT 0,
  year          int NOT NULL,
  is_completed  boolean DEFAULT false,
  created_by    uuid REFERENCES auth.users,
  created_at    timestamptz DEFAULT now()
);

-- 2. Campo en transactions para vincular
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS commitment_id uuid REFERENCES partial_commitments(id);

-- 3. RLS
ALTER TABLE partial_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Commitments: lectura pública"
  ON partial_commitments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Commitments: insertar autenticado"
  ON partial_commitments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Commitments: actualizar autenticado"
  ON partial_commitments FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Commitments: eliminar autenticado"
  ON partial_commitments FOR DELETE
  TO authenticated
  USING (true);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_commitments_year ON partial_commitments(year);
CREATE INDEX IF NOT EXISTS idx_commitments_pending ON partial_commitments(is_completed, year);
CREATE INDEX IF NOT EXISTS idx_transactions_commitment ON transactions(commitment_id);
