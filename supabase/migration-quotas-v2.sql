-- ============================================================
-- Migración: Cuotas personalizadas por alumno
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Campo quota_plan en students (jsonb para planes por año)
ALTER TABLE students ADD COLUMN IF NOT EXISTS quota_plan jsonb DEFAULT '{}';

-- 2. Monto anual de cuota (valor por defecto)
INSERT INTO app_settings (key, value) VALUES ('quota_annual_amount', '30000')
ON CONFLICT (key) DO NOTHING;

-- 3. Limpiar cuotas huérfanas (las 10 vacías creadas por el seed anterior)
DELETE FROM quota_payments WHERE is_paid = false AND amount IS NULL;
