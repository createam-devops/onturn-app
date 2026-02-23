-- =====================================================
-- SCRIPT: create-reviews-table.sql
-- Descripción: Crea la tabla de reviews/calificaciones
-- Fecha: 2026-02-22
-- =====================================================

-- 1. Crear tabla de reviews
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  
  -- Información del reviewer
  customer_name VARCHAR(100) NOT NULL,
  customer_email VARCHAR(255),
  
  -- Calificación y contenido
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL CHECK (char_length(comment) >= 10 AND char_length(comment) <= 1000),
  
  -- Respuesta del negocio
  business_response TEXT CHECK (char_length(business_response) <= 1000),
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Estado
  is_verified BOOLEAN DEFAULT false, -- Si la review está verificada (tiene cita confirmada)
  is_visible BOOLEAN DEFAULT true,   -- Si la review está visible públicamente
  is_flagged BOOLEAN DEFAULT false,  -- Si fue reportada por contenido inapropiado
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Crear índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_reviews_business_id ON reviews(business_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_appointment_id ON reviews(appointment_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_is_visible ON reviews(is_visible) WHERE is_visible = true;

-- 3. Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_reviews_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reviews_updated_at ON reviews;
CREATE TRIGGER reviews_updated_at
  BEFORE UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_reviews_updated_at();

-- 4. Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver reviews visibles
DROP POLICY IF EXISTS "Reviews visibles son públicas" ON reviews;
CREATE POLICY "Reviews visibles son públicas"
  ON reviews FOR SELECT
  USING (is_visible = true AND is_flagged = false);

-- Política: Usuarios autenticados pueden crear reviews
DROP POLICY IF EXISTS "Usuarios pueden crear reviews" ON reviews;
CREATE POLICY "Usuarios pueden crear reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
  );

-- Política: Usuarios pueden editar sus propias reviews (solo las primeras 24hrs)
DROP POLICY IF EXISTS "Usuarios pueden editar sus reviews" ON reviews;
CREATE POLICY "Usuarios pueden editar sus reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id 
    AND created_at > now() - interval '24 hours'
  )
  WITH CHECK (
    auth.uid() = user_id
  );

-- Política: Business owners pueden ver todas las reviews de su negocio
DROP POLICY IF EXISTS "Business owners ven sus reviews" ON reviews;
CREATE POLICY "Business owners ven sus reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id 
      FROM businesses b
      INNER JOIN tenant_users tu ON tu.tenant_id = b.id
      WHERE tu.user_id = auth.uid() 
        AND tu.role = 'business_owner'
        AND tu.is_active = true
    )
  );

-- Política: Business owners pueden responder reviews
DROP POLICY IF EXISTS "Business owners responden reviews" ON reviews;
CREATE POLICY "Business owners responden reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT b.id 
      FROM businesses b
      INNER JOIN tenant_users tu ON tu.tenant_id = b.id
      WHERE tu.user_id = auth.uid() 
        AND tu.role = 'business_owner'
        AND tu.is_active = true
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT b.id 
      FROM businesses b
      INNER JOIN tenant_users tu ON tu.tenant_id = b.id
      WHERE tu.user_id = auth.uid() 
        AND tu.role = 'business_owner'
        AND tu.is_active = true
    )
  );

-- 5. Función para calcular rating promedio de un negocio
CREATE OR REPLACE FUNCTION get_business_average_rating(p_business_id UUID)
RETURNS NUMERIC AS $$
  SELECT ROUND(AVG(rating)::numeric, 1)
  FROM reviews
  WHERE business_id = p_business_id
    AND is_visible = true
    AND is_flagged = false;
$$ LANGUAGE SQL STABLE;

-- 6. Función para contar reviews de un negocio
CREATE OR REPLACE FUNCTION get_business_reviews_count(p_business_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::integer
  FROM reviews
  WHERE business_id = p_business_id
    AND is_visible = true
    AND is_flagged = false;
$$ LANGUAGE SQL STABLE;

-- 7. Verificar que la tabla fue creada correctamente
DO $$
DECLARE
  table_count INTEGER;
  index_count INTEGER;
  policy_count INTEGER;
BEGIN
  -- Verificar tabla
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name = 'reviews';
  
  IF table_count = 0 THEN
    RAISE EXCEPTION 'Error: Tabla reviews no fue creada';
  END IF;

  -- Verificar índices
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'reviews';
  
  IF index_count < 6 THEN
    RAISE WARNING 'Advertencia: Se esperaban al menos 6 índices, se encontraron %', index_count;
  END IF;

  -- Verificar políticas RLS
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'reviews';
  
  IF policy_count < 5 THEN
    RAISE WARNING 'Advertencia: Se esperaban 5 políticas RLS, se encontraron %', policy_count;
  END IF;

  RAISE NOTICE '✅ Tabla reviews creada exitosamente';
  RAISE NOTICE '✅ % índices creados', index_count;
  RAISE NOTICE '✅ % políticas RLS configuradas', policy_count;
  RAISE NOTICE '✅ Funciones de rating promedio y conteo creadas';
END $$;

-- 8. Datos de prueba (opcional - comentar si no se necesita)
/*
INSERT INTO reviews (business_id, user_id, customer_name, customer_email, rating, comment, is_verified)
VALUES 
  (
    (SELECT id FROM businesses LIMIT 1),
    (SELECT id FROM auth.users LIMIT 1),
    'Juan Pérez',
    'juan@example.com',
    5,
    'Excelente servicio, muy profesionales y puntuales. Lo recomiendo totalmente.',
    true
  ),
  (
    (SELECT id FROM businesses LIMIT 1),
    (SELECT id FROM auth.users OFFSET 1 LIMIT 1),
    'María González',
    'maria@example.com',
    4,
    'Muy buena atención, solo que tuve que esperar un poco más de lo esperado.',
    true
  );
*/
