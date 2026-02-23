-- =====================================================
-- DIAGNÓSTICO: Sistema de Notificaciones
-- Verificar estado actual de la base de datos
-- =====================================================

-- 1. Verificar si la tabla notifications existe
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) AS notifications_table_exists;

-- 2. Ver estructura actual de la tabla notifications (si existe)
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'notifications'
ORDER BY ordinal_position;

-- 3. Verificar políticas RLS en notifications
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'notifications';

-- 4. Verificar triggers existentes
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE '%notif%'
ORDER BY event_object_table, trigger_name;

-- 5. Verificar tablas relacionadas necesarias
SELECT 
  table_name,
  CASE 
    WHEN table_name = 'appointments' THEN 'Necesaria para triggers'
    WHEN table_name = 'reviews' THEN 'Necesaria para triggers'
    WHEN table_name = 'businesses' THEN 'Necesaria para triggers'
    WHEN table_name = 'profiles' THEN 'Necesaria para triggers'
  END AS purpose
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('appointments', 'reviews', 'businesses', 'profiles')
ORDER BY table_name;

-- 6. Ver columnas de appointments (para verificar compatibilidad con triggers)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'appointments'
ORDER BY ordinal_position;

-- 7. Ver columnas de reviews (para verificar compatibilidad con triggers)
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'reviews'
ORDER BY ordinal_position;

-- 8. Contar registros en notifications (si existe)
SELECT 
  COUNT(*) as total_notifications,
  COUNT(*) FILTER (WHERE is_read = TRUE) as read_count,
  COUNT(*) FILTER (WHERE is_read = FALSE) as unread_count
FROM notifications;

-- =====================================================
-- NOTAS:
-- Ejecuta este script en Supabase SQL Editor
-- Te mostrará exactamente qué existe y qué falta
-- =====================================================
