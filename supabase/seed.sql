-- ============================================================
-- Tesorería 7D — Datos de ejemplo (Seed)
-- Ejecutar después de schema.sql
-- ============================================================

-- ============================================================
-- 1. ALUMNOS DE EJEMPLO
-- ============================================================
INSERT INTO students (full_name, parent1_name, parent1_email, parent2_name, parent2_email) VALUES
  ('Sofía González Muñoz', 'María Muñoz', 'maria.munoz@email.com', 'Carlos González', 'carlos.gonzalez@email.com'),
  ('Tomás Rivera López', 'Ana López', 'ana.lopez@email.com', NULL, NULL),
  ('Valentina Soto Díaz', 'Carmen Díaz', 'carmen.diaz@email.com', 'Pedro Soto', 'pedro.soto@email.com')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. MOVIMIENTOS DE EJEMPLO (2026)
-- ============================================================
INSERT INTO transactions (date, type, category, description, amount, year) VALUES
  ('2026-03-01', 'income', 'CUOTAS', 'Cuota marzo - 15 alumnos', 150000, 2026),
  ('2026-03-05', 'expense', 'COLACIÓN COMPARTIDA', 'Colación día de la mujer', 25000, 2026),
  ('2026-03-10', 'income', 'KERMESSE', 'Recaudación kermesse marzo', 85000, 2026),
  ('2026-03-15', 'expense', 'CLASS MERIT', 'Premios class merit trimestre 1', 15000, 2026),
  ('2026-03-20', 'expense', 'PASEO DE CURSO', 'Reserva parcialidad paseo fin de año', 50000, 2026);

-- ============================================================
-- 3. ANUNCIOS DE EJEMPLO
-- ============================================================
INSERT INTO announcements (title, content, is_pinned, published_at) VALUES
  (
    'Bienvenidos al sistema de tesorería',
    'Estimados apoderados, a partir de ahora pueden consultar el estado financiero del curso en esta plataforma. Cualquier duda, contactar a la directiva.',
    true,
    '2026-03-01 10:00:00-03'
  ),
  (
    'Recordatorio cuota de marzo',
    'Les recordamos que la cuota correspondiente a marzo tiene como fecha límite el **15 de marzo**. El monto es de $10.000 por alumno. Pueden transferir a la cuenta del curso.',
    false,
    '2026-03-05 09:00:00-03'
  );
