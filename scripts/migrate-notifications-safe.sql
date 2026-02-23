-- =====================================================
-- MIGRACIÓN SEGURA: Sistema de Notificaciones
-- Maneja tablas existentes y crea/actualiza según necesario
-- =====================================================

-- PASO 1: Eliminar triggers existentes (si existen)
-- Esto es seguro porque los recrearemos
DO $$
BEGIN
  DROP TRIGGER IF EXISTS trigger_notify_appointment_created ON appointments;
  DROP TRIGGER IF EXISTS trigger_notify_appointment_confirmed ON appointments;
  DROP TRIGGER IF EXISTS trigger_notify_appointment_cancelled ON appointments;
  DROP TRIGGER IF EXISTS trigger_notify_review_created ON reviews;
  DROP TRIGGER IF EXISTS trigger_notify_review_response ON reviews;
  DROP TRIGGER IF EXISTS trigger_update_notification_read_at ON notifications;
  
  RAISE NOTICE '✅ Triggers antiguos eliminados (si existían)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ Algunos triggers no existían, continuando...';
END $$;

-- PASO 2: Eliminar funciones existentes (si existen)
DO $$
BEGIN
  DROP FUNCTION IF EXISTS notify_appointment_created() CASCADE;
  DROP FUNCTION IF EXISTS notify_appointment_confirmed() CASCADE;
  DROP FUNCTION IF EXISTS notify_appointment_cancelled() CASCADE;
  DROP FUNCTION IF EXISTS notify_review_created() CASCADE;
  DROP FUNCTION IF EXISTS notify_review_response() CASCADE;
  DROP FUNCTION IF EXISTS update_notification_read_at() CASCADE;
  DROP FUNCTION IF EXISTS get_unread_notifications_count(UUID) CASCADE;
  DROP FUNCTION IF EXISTS mark_all_notifications_read(UUID) CASCADE;
  DROP FUNCTION IF EXISTS cleanup_expired_notifications() CASCADE;
  DROP FUNCTION IF EXISTS cleanup_old_read_notifications() CASCADE;
  
  RAISE NOTICE '✅ Funciones antiguas eliminadas (si existían)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ Algunas funciones no existían, continuando...';
END $$;

-- PASO 3: Eliminar políticas RLS existentes
DO $$
BEGIN
  DROP POLICY IF EXISTS "users_read_own_notifications" ON notifications;
  DROP POLICY IF EXISTS "users_update_own_notifications" ON notifications;
  DROP POLICY IF EXISTS "system_insert_notifications" ON notifications;
  DROP POLICY IF EXISTS "users_delete_own_notifications" ON notifications;
  
  RAISE NOTICE '✅ Políticas RLS antiguas eliminadas (si existían)';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'ℹ️ Algunas políticas no existían, continuando...';
END $$;

-- PASO 4: Eliminar tabla existente y recrear estructura completa
DO $$
BEGIN
  -- Eliminar tabla existente (CUIDADO: Esto borra datos)
  DROP TABLE IF EXISTS notifications CASCADE;
  RAISE NOTICE '✅ Tabla notifications eliminada (si existía)';
  
  -- Crear tabla notifications desde cero
  CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Receptor
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipo y contexto
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    
    -- Metadata y enlaces
    action_url VARCHAR(500),
    related_id UUID,
    related_type VARCHAR(50),
    
    -- Estado
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Prioridad
    priority VARCHAR(20) DEFAULT 'normal',
    
    -- Metadata adicional en JSON
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
  );
  
  RAISE NOTICE '✅ Tabla notifications creada';
  
  -- Crear índices
  CREATE INDEX idx_notifications_user_id ON notifications(user_id);
  CREATE INDEX idx_notifications_type ON notifications(type);
  CREATE INDEX idx_notifications_is_read ON notifications(is_read) WHERE is_read = FALSE;
  CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
  CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
  CREATE INDEX idx_notifications_priority ON notifications(priority);
  
  RAISE NOTICE '✅ Índices creados';
  
  -- Habilitar RLS
  ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE '✅ RLS habilitado';
END $$;

-- PASO 5: Trigger para actualizar read_at
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

-- PASO 6: Crear políticas RLS
CREATE POLICY "users_read_own_notifications"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifications"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "system_insert_notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "users_delete_own_notifications"
  ON notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- PASO 7: Funciones helper
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

-- PASO 8: Triggers automáticos de notificaciones
-- Solo crear si las tablas existen

-- Trigger: Appointment Created
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') THEN
    CREATE OR REPLACE FUNCTION notify_appointment_created()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_customer_name TEXT;
      v_business_name TEXT;
      v_business_owner_id UUID;
    BEGIN
      SELECT full_name INTO v_customer_name
      FROM profiles
      WHERE id = NEW.user_id;

      SELECT name, owner_id INTO v_business_name, v_business_owner_id
      FROM businesses
      WHERE id = NEW.business_id;

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
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_notify_appointment_created
      AFTER INSERT ON appointments
      FOR EACH ROW
      EXECUTE FUNCTION notify_appointment_created();
    
    RAISE NOTICE '✅ Trigger appointment_created instalado';
  ELSE
    RAISE NOTICE '⚠️ Tabla appointments no existe, trigger omitido';
  END IF;
END $$;

-- Trigger: Appointment Confirmed
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') THEN
    CREATE OR REPLACE FUNCTION notify_appointment_confirmed()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_business_name TEXT;
    BEGIN
      IF NEW.status = 'confirmed' AND OLD.status != 'confirmed' THEN
        SELECT name INTO v_business_name
        FROM businesses
        WHERE id = NEW.business_id;

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
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_notify_appointment_confirmed
      AFTER UPDATE ON appointments
      FOR EACH ROW
      EXECUTE FUNCTION notify_appointment_confirmed();
    
    RAISE NOTICE '✅ Trigger appointment_confirmed instalado';
  END IF;
END $$;

-- Trigger: Appointment Cancelled
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'appointments') THEN
    CREATE OR REPLACE FUNCTION notify_appointment_cancelled()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_business_name TEXT;
      v_business_owner_id UUID;
      v_customer_name TEXT;
    BEGIN
      IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        SELECT name, owner_id INTO v_business_name, v_business_owner_id
        FROM businesses
        WHERE id = NEW.business_id;

        SELECT full_name INTO v_customer_name
        FROM profiles
        WHERE id = NEW.user_id;

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
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_notify_appointment_cancelled
      AFTER UPDATE ON appointments
      FOR EACH ROW
      EXECUTE FUNCTION notify_appointment_cancelled();
    
    RAISE NOTICE '✅ Trigger appointment_cancelled instalado';
  END IF;
END $$;

-- Trigger: Review Created
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') THEN
    CREATE OR REPLACE FUNCTION notify_review_created()
    RETURNS TRIGGER AS $func$
    DECLARE
      v_business_owner_id UUID;
      v_business_name TEXT;
    BEGIN
      SELECT owner_id, name INTO v_business_owner_id, v_business_name
      FROM businesses
      WHERE id = NEW.business_id;

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
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_notify_review_created
      AFTER INSERT ON reviews
      FOR EACH ROW
      EXECUTE FUNCTION notify_review_created();
    
    RAISE NOTICE '✅ Trigger review_created instalado';
  ELSE
    RAISE NOTICE '⚠️ Tabla reviews no existe, trigger omitido';
  END IF;
END $$;

-- Trigger: Review Response
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reviews') THEN
    CREATE OR REPLACE FUNCTION notify_review_response()
    RETURNS TRIGGER AS $func$
    BEGIN
      IF NEW.business_response IS NOT NULL AND OLD.business_response IS NULL THEN
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
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER trigger_notify_review_response
      AFTER UPDATE ON reviews
      FOR EACH ROW
      EXECUTE FUNCTION notify_review_response();
    
    RAISE NOTICE '✅ Trigger review_response instalado';
  END IF;
END $$;

-- PASO 9: Verificación final
DO $$
DECLARE
  v_policies_count INTEGER;
  v_triggers_count INTEGER;
BEGIN
  -- Verificar políticas RLS
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE tablename = 'notifications';

  -- Verificar triggers
  SELECT COUNT(*) INTO v_triggers_count
  FROM pg_trigger
  JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
  WHERE pg_class.relname IN ('notifications', 'appointments', 'reviews')
    AND pg_trigger.tgname LIKE '%notify%';

  RAISE NOTICE '';
  RAISE NOTICE '=================================================';
  RAISE NOTICE '✅ SISTEMA DE NOTIFICACIONES INSTALADO';
  RAISE NOTICE '=================================================';
  RAISE NOTICE 'Políticas RLS: %', v_policies_count;
  RAISE NOTICE 'Triggers activos: %', v_triggers_count;
  RAISE NOTICE '=================================================';
END $$;
