-- ============================================================
-- Migración: Permitir INSERT en app_settings + datos bancarios
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Agregar política de INSERT que faltaba
CREATE POLICY "AppSettings: insertar autenticado"
  ON app_settings FOR INSERT
  TO authenticated
  WITH CHECK (true);
