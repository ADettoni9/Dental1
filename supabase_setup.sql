-- ============================================================
-- LABORATORIO DENTAL — Supabase Setup
-- Ejecutar este script completo en el SQL Editor de Supabase
-- ============================================================

-- 1. TABLAS
-- ------------------------------------------------------------

-- Tabla de doctores / clientes
CREATE TABLE IF NOT EXISTS doctores (
  id SERIAL PRIMARY KEY,
  nombre_completo TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de precios / catálogo de trabajos
CREATE TABLE IF NOT EXISTS precios (
  id SERIAL PRIMARY KEY,
  categoria TEXT NOT NULL,
  nombre_trabajo TEXT NOT NULL,
  precio_actual NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de movimientos (ficha de cuenta corriente)
CREATE TABLE IF NOT EXISTS movimientos (
  id SERIAL PRIMARY KEY,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  doctor_id INTEGER NOT NULL REFERENCES doctores(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL,
  debe NUMERIC(12,2) NOT NULL DEFAULT 0,
  haber NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índice para consultas frecuentes por doctor
CREATE INDEX IF NOT EXISTS idx_movimientos_doctor ON movimientos(doctor_id);

-- 2. VISTA: Resumen de cuentas por doctor
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW resumen_cuentas AS
SELECT
  d.id AS doctor_id,
  d.nombre_completo,
  COALESCE(SUM(m.debe), 0)  AS total_debe,
  COALESCE(SUM(m.haber), 0) AS total_haber,
  COALESCE(SUM(m.debe), 0) - COALESCE(SUM(m.haber), 0) AS saldo
FROM doctores d
LEFT JOIN movimientos m ON m.doctor_id = d.id
GROUP BY d.id, d.nombre_completo
ORDER BY d.nombre_completo;

-- 3. ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------
-- Habilitamos RLS en todas las tablas y permitimos acceso
-- completo vía anon key (aplicación interna / de uso privado).

ALTER TABLE doctores  ENABLE ROW LEVEL SECURITY;
ALTER TABLE precios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;

-- Políticas para doctores
DROP POLICY IF EXISTS "doctores_select" ON doctores;
DROP POLICY IF EXISTS "doctores_insert" ON doctores;
DROP POLICY IF EXISTS "doctores_update" ON doctores;
DROP POLICY IF EXISTS "doctores_delete" ON doctores;
CREATE POLICY "doctores_select" ON doctores FOR SELECT USING (true);
CREATE POLICY "doctores_insert" ON doctores FOR INSERT WITH CHECK (true);
CREATE POLICY "doctores_update" ON doctores FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "doctores_delete" ON doctores FOR DELETE USING (true);

-- Políticas para precios
DROP POLICY IF EXISTS "precios_select" ON precios;
DROP POLICY IF EXISTS "precios_insert" ON precios;
DROP POLICY IF EXISTS "precios_update" ON precios;
DROP POLICY IF EXISTS "precios_delete" ON precios;
CREATE POLICY "precios_select" ON precios FOR SELECT USING (true);
CREATE POLICY "precios_insert" ON precios FOR INSERT WITH CHECK (true);
CREATE POLICY "precios_update" ON precios FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "precios_delete" ON precios FOR DELETE USING (true);

-- Políticas para movimientos
DROP POLICY IF EXISTS "movimientos_select" ON movimientos;
DROP POLICY IF EXISTS "movimientos_insert" ON movimientos;
DROP POLICY IF EXISTS "movimientos_update" ON movimientos;
DROP POLICY IF EXISTS "movimientos_delete" ON movimientos;
CREATE POLICY "movimientos_select" ON movimientos FOR SELECT USING (true);
CREATE POLICY "movimientos_insert" ON movimientos FOR INSERT WITH CHECK (true);
CREATE POLICY "movimientos_update" ON movimientos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "movimientos_delete" ON movimientos FOR DELETE USING (true);

-- 4. DATOS DE EJEMPLO (Seed Data)
-- ------------------------------------------------------------

-- Doctores de ejemplo
INSERT INTO doctores (nombre_completo) VALUES
  ('Dr. Llasen María J.'),
  ('Dr. Marconi'),
  ('Dra. Fernández Laura'),
  ('Dr. Rodríguez Pablo');

-- Precios de ejemplo
INSERT INTO precios (categoria, nombre_trabajo, precio_actual) VALUES
  ('Prótesis Removible', 'Prótesis hasta 2 dientes',       77060),
  ('Prótesis Removible', 'Prótesis hasta 4 dientes',      100000),
  ('Prótesis Removible', 'Prótesis hasta 6 dientes',      120000),
  ('Prótesis Removible', 'Prótesis completa superior',    180000),
  ('Prótesis Removible', 'Prótesis completa inferior',    180000),
  ('Prótesis Flexibles',  'Flexible hasta 3 dientes',      130000),
  ('Prótesis Flexibles',  'Flexible hasta 6 dientes',      170000),
  ('Prótesis Flexibles',  'Flexible completa',             220000),
  ('Cromo-Cobalto',       'Esquelético superior',          250000),
  ('Cromo-Cobalto',       'Esquelético inferior',          250000),
  ('Coronas y Puentes',   'Corona colada entera',           80120),
  ('Coronas y Puentes',   'Corona de porcelana',           110000),
  ('Coronas y Puentes',   'Puente (por pieza)',             85000),
  ('Ortodoncia',          'Placa activa',                   70000),
  ('Ortodoncia',          'Placa de contención',            55000),
  ('Compostura',          'Compostura simple',              25000),
  ('Compostura',          'Compostura con diente',          35000),
  ('Compostura',          'Rebasing',                       60000);

-- Movimientos de ejemplo
INSERT INTO movimientos (fecha, doctor_id, concepto, debe, haber) VALUES
  ('2026-03-01', 1, 'Prótesis hasta 2 dientes',   77060,  0),
  ('2026-03-02', 1, 'Corona colada entera',        80120,  0),
  ('2026-03-05', 1, 'Pago en efectivo',                0,  100000),
  ('2026-03-01', 2, 'Flexible hasta 3 dientes',   130000,  0),
  ('2026-03-03', 2, 'Compostura simple',            25000,  0),
  ('2026-03-06', 2, 'Pago transferencia',               0,  80000),
  ('2026-03-02', 3, 'Esquelético superior',        250000,  0),
  ('2026-03-04', 3, 'Pago parcial',                     0, 150000);
