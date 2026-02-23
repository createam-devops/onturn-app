-- =====================================================
-- TABLA: specialist_availability
-- Descripción: Horarios de disponibilidad de especialistas
-- =====================================================

CREATE TABLE IF NOT EXISTS specialist_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  -- 0 = Domingo, 1 = Lunes, 2 = Martes, 3 = Miércoles, 4 = Jueves, 5 = Viernes, 6 = Sábado
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraint: end_time debe ser después de start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  
  -- Índice único para evitar horarios duplicados
  UNIQUE(specialist_id, day_of_week, start_time, end_time)
);

-- Índice para optimizar consultas por especialista
CREATE INDEX IF NOT EXISTS idx_availability_specialist 
  ON specialist_availability(specialist_id);

-- Índice para consultas por día de semana
CREATE INDEX IF NOT EXISTS idx_availability_day 
  ON specialist_availability(day_of_week);

-- RLS: Habilitar Row Level Security
ALTER TABLE specialist_availability ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede ver los horarios disponibles (público)
CREATE POLICY "Anyone can view availability"
  ON specialist_availability
  FOR SELECT
  USING (is_available = true);

-- Política: Solo el negocio dueño del especialista puede insertar/actualizar
CREATE POLICY "Business owners can manage their specialists availability"
  ON specialist_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM specialists s
      JOIN businesses b ON s.business_id = b.id
      JOIN profiles p ON p.id = auth.uid()
      WHERE s.id = specialist_id
        AND (
          p.role = 'business_owner' AND b.owner_id = auth.uid()
          OR p.role = 'admin'
        )
    )
  );

-- Trigger: Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_specialist_availability_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER specialist_availability_updated_at
  BEFORE UPDATE ON specialist_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_specialist_availability_updated_at();

-- =====================================================
-- TABLA: specialist_blocked_slots (Bloqueos puntuales)
-- Para marcar días/horarios específicos como no disponibles
-- =====================================================

CREATE TABLE IF NOT EXISTS specialist_blocked_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  specialist_id UUID NOT NULL REFERENCES specialists(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  start_time TIME,  -- NULL = todo el día bloqueado
  end_time TIME,    -- NULL = todo el día bloqueado
  reason TEXT,      -- ej: "Vacaciones", "Día festivo", "Emergencia"
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraint: Si hay start_time, debe haber end_time
  CONSTRAINT valid_blocked_times CHECK (
    (start_time IS NULL AND end_time IS NULL) 
    OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

-- Índice para optimizar consultas de bloqueos
CREATE INDEX IF NOT EXISTS idx_blocked_slots_specialist_date
  ON specialist_blocked_slots(specialist_id, blocked_date);

-- RLS: Habilitar Row Level Security
ALTER TABLE specialist_blocked_slots ENABLE ROW LEVEL SECURITY;

-- Política: Solo business owners pueden gestionar bloqueos
CREATE POLICY "Business owners can manage blocked slots"
  ON specialist_blocked_slots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM specialists s
      JOIN businesses b ON s.business_id = b.id
      JOIN profiles p ON p.id = auth.uid()
      WHERE s.id = specialist_id
        AND (
          p.role = 'business_owner' AND b.owner_id = auth.uid()
          OR p.role = 'admin'
        )
    )
  );

-- =====================================================
-- INSERCIÓN DE DATOS DE EJEMPLO
-- (Comentado - descomentar para testing)
-- =====================================================

/*
-- Ejemplo: Disponibilidad de un especialista
-- Lunes a Viernes: 9:00 - 18:00 con descanso de 13:00 - 14:00
DO $$
DECLARE
  test_specialist_id UUID;
  day_num INTEGER;
BEGIN
  -- Obtener un especialista de prueba
  SELECT id INTO test_specialist_id
  FROM specialists
  LIMIT 1;
  
  IF test_specialist_id IS NOT NULL THEN
    -- Lunes (1) a Viernes (5)
    FOR day_num IN 1..5 LOOP
      -- Mañana: 9:00 - 13:00
      INSERT INTO specialist_availability (specialist_id, day_of_week, start_time, end_time)
      VALUES (test_specialist_id, day_num, '09:00', '13:00')
      ON CONFLICT DO NOTHING;
      
      -- Tarde: 14:00 - 18:00
      INSERT INTO specialist_availability (specialist_id, day_of_week, start_time, end_time)
      VALUES (test_specialist_id, day_num, '14:00', '18:00')
      ON CONFLICT DO NOTHING;
    END LOOP;
    
    RAISE NOTICE 'Disponibilidad de ejemplo creada para especialista: %', test_specialist_id;
  ELSE
    RAISE NOTICE 'No se encontró ningún especialista para crear datos de ejemplo';
  END IF;
END $$;
*/

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

-- Verificar que las tablas se crearon correctamente
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'specialist_availability') THEN
    RAISE NOTICE '✅ Tabla specialist_availability creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Tabla specialist_availability no se creó';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'specialist_blocked_slots') THEN
    RAISE NOTICE '✅ Tabla specialist_blocked_slots creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Tabla specialist_blocked_slots no se creó';
  END IF;
END $$;
