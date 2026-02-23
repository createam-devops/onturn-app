-- =====================================================
-- Agregar columna 'avatar_url' a tabla 'specialists'
-- =====================================================
-- Este script agrega soporte para avatares de especialistas
-- Ejecutar en Supabase SQL Editor cuando quieras habilitar avatares
-- NOTA: Usa avatar_url (no avatar) para consistencia con otras tablas

-- Agregar columna avatar_url (si no existe)
DO $$ 
BEGIN
  -- Verificar si existe 'avatar' legacy
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'specialists' 
    AND column_name = 'avatar'
  ) THEN
    -- Renombrar avatar → avatar_url
    ALTER TABLE specialists RENAME COLUMN avatar TO avatar_url;
    RAISE NOTICE '✅ Columna "avatar" renombrada a "avatar_url" en tabla "specialists"';
    
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'specialists' 
    AND column_name = 'avatar_url'
  ) THEN
    -- Crear avatar_url desde cero
    ALTER TABLE specialists ADD COLUMN avatar_url TEXT;
    RAISE NOTICE '✅ Columna "avatar_url" agregada a tabla "specialists"';
    
  ELSE
    RAISE NOTICE 'ℹ️ La columna "avatar_url" ya existe en la tabla "specialists"';
  END IF;
END $$;

-- Agregar índice para performance
CREATE INDEX IF NOT EXISTS idx_specialists_avatar_url 
  ON specialists(avatar_url) 
  WHERE avatar_url IS NOT NULL;

-- Verificación
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'specialists'
  AND column_name LIKE '%avatar%';

-- =====================================================
-- DESPUÉS DE EJECUTAR ESTE SCRIPT:
-- =====================================================
-- El código frontend en app/admin/especialistas/page.tsx actualmente usa
-- el campo 'avatar' (comentado). Tienes dos opciones:
--
-- OPCIÓN A: Mantener campo como 'avatar' en el código (menos cambios)
--   1. No necesitas cambiar nada en el código
--   2. Descomentar todas las líneas que dicen // Disabled
--
-- OPCIÓN B: Migrar a 'avatar_url' (recomendado - consistencia)
--   1. En tipos/specialist.ts cambiar: avatar → avatar_url
--   2. En app/admin/especialistas/page.tsx cambiar todas las referencias:
--      - formData.avatar → formData.avatar_url
--      - specialist.avatar → specialist.avatar_url
--
-- Este script crea 'avatar_url' (opción B recomendada)
--
-- También verificar:
-- - Bucket 'avatars' existe en Supabase Storage (público)
-- - Políticas RLS permiten lectura pública de specialists
