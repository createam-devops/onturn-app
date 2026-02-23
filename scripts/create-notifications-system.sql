-- =====================================================
-- NOTIFICATIONS SYSTEM
-- Sistema completo de notificaciones push in-app
-- =====================================================

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Receptor
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Tipo y contexto
  type VARCHAR(50) NOT NULL, -- 'appointment_created', 'appointment_confirmed', 'appointment_cancelled', 'appointment_reminder', 'review_received', 'review_response', 'business_approved', 'specialist_assigned', etc.
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  
  -- Metadata y enlaces
  action_url VARCHAR(500), -- URL para navegar al hacer click
  related_id UUID, -- ID del recurso relacionado (appointment_id, review_id, etc.)
  related_type VARCHAR(50), -- 'appointment', 'review', 'business', etc.
  
  -- Estado
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Prioridad
  priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Metadata adicional en JSON
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE -- Notificaciones pueden expirar
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority);

-- Trigger para actualizar read_at automáticamente
CREATE OR REPLACE FUNCTION update_notification_read_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_read = TRUE AND OLD.is_read = FALSE THEN
    NEW.read_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_notification_read_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_read_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo pueden ver sus propias notificaciones
CREATE POLICY "users_read_own_notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios pueden actualizar sus propias notificaciones (marcar como leído)
CREATE POLICY "users_update_own_notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Solo el sistema puede insertar notificaciones (via service role)
-- Esta política permite inserts solo desde backend/service role
CREATE POLICY "system_insert_notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Los usuarios pueden eliminar sus propias notificaciones
CREATE POLICY "users_delete_own_notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- FUNCIONES HELPER
-- =====================================================

-- Función para obtener conteo de notificaciones no leídas
CREATE OR REPLACE FUNCTION get_unread_notifications_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
      AND is_read = FALSE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para marcar todas las notificaciones como leídas
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = TRUE,
      read_at = NOW()
  WHERE user_id = p_user_id
    AND is_read = FALSE;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar notificaciones expiradas (ejecutar periódicamente)
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE expires_at IS NOT NULL
    AND expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para limpiar notificaciones antiguas leídas (30+ días)
CREATE OR REPLACE FUNCTION cleanup_old_read_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE is_read = TRUE
    AND read_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- TRIGGERS AUTOMÁTICOS DE NOTIFICACIONES
-- =====================================================

-- Trigger: Notificar cuando se crea una cita
CREATE OR REPLACE FUNCTION notify_appointment_created()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_name TEXT;
  v_business_name TEXT;
  v_business_owner_id UUID;
BEGIN
  -- Obtener datos del cliente
  SELECT full_name INTO v_customer_name
  FROM profiles
  WHERE id = NEW.user_id;

  -- Obtener nombre del negocio y su owner
  SELECT name, owner_id INTO v_business_name, v_business_owner_id
  FROM businesses
  WHERE id = NEW.business_id;

  -- Notificación para el cliente
  INSERT INTO notifications (user_id, type, title, message, action_url, related_id, related_type, priority)
  VALUES (
    NEW.user_id,
    'appointment_created',
    'Reserva creada',
    'Tu reserva en ' || v_business_name || ' ha sido creada y está pendiente de confirmación.',
    '/mis-reservas/' || NEW.id,
    NEW.id,
    'appointment',
    'normal'
  );

  -- Notificación para el dueño del negocio
  INSERT INTO notifications (user_id, type, title, message, action_url, related_id, related_type, priority)
  VALUES (
    v_business_owner_id,
    'new_appointment',
    'Nueva reserva',
    'Nueva reserva de ' || COALESCE(v_customer_name, 'Cliente') || ' para el ' || TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY') || ' a las ' || NEW.appointment_time,
    '/admin/reservas/' || NEW.id,
    NEW.id,
    'appointment',
    'high'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_appointment_created
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_created();

-- Trigger: Notificar cuando se confirma una cita
CREATE OR REPLACE FUNCTION notify_appointment_confirmed()
RETURNS TRIGGER AS $$
DECLARE
  v_business_name TEXT;
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
    -- Obtener nombre del negocio
    SELECT name INTO v_business_name
    FROM businesses
    WHERE id = NEW.business_id;

    -- Notificar al cliente
    INSERT INTO notifications (user_id, type, title, message, action_url, related_id, related_type, priority)
    VALUES (
      NEW.user_id,
      'appointment_confirmed',
      '✅ Reserva confirmada',
      'Tu reserva en ' || v_business_name || ' para el ' || TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY') || ' a las ' || NEW.appointment_time || ' ha sido confirmada.',
      '/mis-reservas/' || NEW.id,
      NEW.id,
      'appointment',
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_appointment_confirmed
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_confirmed();

-- Trigger: Notificar cuando se cancela una cita
CREATE OR REPLACE FUNCTION notify_appointment_cancelled()
RETURNS TRIGGER AS $$
DECLARE
  v_business_name TEXT;
  v_business_owner_id UUID;
  v_customer_name TEXT;
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Obtener datos
    SELECT name, owner_id INTO v_business_name, v_business_owner_id
    FROM businesses
    WHERE id = NEW.business_id;

    SELECT full_name INTO v_customer_name
    FROM profiles
    WHERE id = NEW.user_id;

    -- Notificar al cliente
    INSERT INTO notifications (user_id, type, title, message, action_url, related_id, related_type, priority)
    VALUES (
      NEW.user_id,
      'appointment_cancelled',
      '❌ Reserva cancelada',
      'Tu reserva en ' || v_business_name || ' para el ' || TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY') || ' ha sido cancelada.',
      '/mis-reservas/' || NEW.id,
      NEW.id,
      'appointment',
      'normal'
    );

    -- Notificar al dueño del negocio
    INSERT INTO notifications (user_id, type, title, message, action_url, related_id, related_type, priority)
    VALUES (
      v_business_owner_id,
      'appointment_cancelled',
      'Reserva cancelada',
      'La reserva de ' || COALESCE(v_customer_name, 'Cliente') || ' para el ' || TO_CHAR(NEW.appointment_date, 'DD/MM/YYYY') || ' ha sido cancelada.',
      '/admin/reservas/' || NEW.id,
      NEW.id,
      'appointment',
      'normal'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_appointment_cancelled
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_cancelled();

-- Trigger: Notificar cuando se crea una review
CREATE OR REPLACE FUNCTION notify_review_created()
RETURNS TRIGGER AS $$
DECLARE
  v_business_owner_id UUID;
  v_business_name TEXT;
BEGIN
  -- Obtener owner del negocio y nombre
  SELECT owner_id, name INTO v_business_owner_id, v_business_name
  FROM businesses
  WHERE id = NEW.business_id;

  -- Notificar al dueño del negocio
  INSERT INTO notifications (user_id, type, title, message, action_url, related_id, related_type, priority)
  VALUES (
    v_business_owner_id,
    'new_review',
    '⭐ Nueva opinión',
    NEW.customer_name || ' dejó una opinión de ' || NEW.rating || ' estrellas en ' || v_business_name,
    '/admin/reviews',
    NEW.id,
    'review',
    'high'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_created();

-- Trigger: Notificar cuando el negocio responde a una review
CREATE OR REPLACE FUNCTION notify_review_response()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.business_response IS NOT NULL AND OLD.business_response IS NULL THEN
    -- Notificar al usuario que dejó la review (si tiene user_id)
    IF NEW.user_id IS NOT NULL THEN
      INSERT INTO notifications (user_id, type, title, message, action_url, related_id, related_type, priority)
      VALUES (
        NEW.user_id,
        'review_response',
        '💬 Respuesta a tu opinión',
        'El negocio respondió a tu opinión.',
        '/mis-reservas',
        NEW.id,
        'review',
        'normal'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_review_response
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_response();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
  v_policies_count INTEGER;
  v_triggers_count INTEGER;
BEGIN
  -- Verificar tabla
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notifications'
  ) INTO v_table_exists;

  IF v_table_exists THEN
    RAISE NOTICE '✅ Tabla notifications creada correctamente';
  ELSE
    RAISE EXCEPTION '❌ Error: Tabla notifications no existe';
  END IF;

  -- Verificar políticas RLS
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE tablename = 'notifications';

  RAISE NOTICE '✅ % políticas RLS creadas', v_policies_count;

  -- Verificar triggers
  SELECT COUNT(*) INTO v_triggers_count
  FROM pg_trigger
  WHERE tgname LIKE '%notify%';

  RAISE NOTICE '✅ % triggers de notificación creados', v_triggers_count;

  RAISE NOTICE '✅ Sistema de notificaciones instalado correctamente';
END $$;

-- =====================================================
-- DATOS DE PRUEBA (OPCIONAL - COMENTADO)
-- =====================================================

/*
-- Crear notificaciones de prueba
INSERT INTO notifications (user_id, type, title, message, action_url, priority)
SELECT 
  id,
  'welcome',
  'Bienvenido a OnTurn',
  'Gracias por registrarte. Comienza reservando tu primera cita.',
  '/reservas',
  'normal'
FROM auth.users
LIMIT 5;
*/
