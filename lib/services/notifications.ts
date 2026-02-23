/**
 * NOTIFICATIONS SERVICE
 * Servicio completo para gestión de notificaciones push in-app
 * Soporta 3 contextos PWA: Super Admin, Business Owner, Cliente
 */

import { createClient } from '@/lib/supabase/client'

// =====================================================
// TIPOS Y INTERFACES
// =====================================================

export type NotificationType =
  // Cliente
  | 'appointment_created'
  | 'appointment_confirmed'
  | 'appointment_cancelled'
  | 'appointment_reminder'
  | 'appointment_completed'
  | 'review_request'
  | 'review_response'
  // Business Owner
  | 'new_appointment'
  | 'appointment_cancelled_by_customer'
  | 'new_review'
  | 'specialist_assigned'
  | 'low_availability'
  // Super Admin
  | 'new_business_request'
  | 'business_approved'
  | 'business_rejected'
  | 'system_alert'

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

export interface Notification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  message: string
  action_url?: string
  related_id?: string
  related_type?: string
  is_read: boolean
  read_at?: string
  priority: NotificationPriority
  metadata?: Record<string, any>
  created_at: string
  expires_at?: string
}

export interface NotificationCreateInput {
  user_id: string
  type: NotificationType
  title: string
  message: string
  action_url?: string
  related_id?: string
  related_type?: string
  priority?: NotificationPriority
  metadata?: Record<string, any>
  expires_at?: string
}

export interface NotificationFilters {
  is_read?: boolean
  type?: NotificationType
  priority?: NotificationPriority
  limit?: number
  offset?: number
}

// =====================================================
// SERVICIO DE NOTIFICACIONES
// =====================================================

export class NotificationService {
  private supabase: ReturnType<typeof createClient>

  constructor(supabase?: ReturnType<typeof createClient>) {
    this.supabase = supabase || createClient()
  }

  /**
   * Obtener notificaciones del usuario actual
   */
  async getUserNotifications(
    userId: string,
    filters?: NotificationFilters
  ): Promise<{ notifications: Notification[]; total: number }> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Aplicar filtros
      if (filters?.is_read !== undefined) {
        query = query.eq('is_read', filters.is_read)
      }

      if (filters?.type) {
        query = query.eq('type', filters.type)
      }

      if (filters?.priority) {
        query = query.eq('priority', filters.priority)
      }

      // Paginación
      const limit = filters?.limit || 20
      const offset = filters?.offset || 0
      query = query.range(offset, offset + limit - 1)

      const { data, error, count } = await query

      if (error) throw error

      return {
        notifications: data || [],
        total: count || 0,
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      throw error
    }
  }

  /**
   * Obtener conteo de notificaciones no leídas
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error

      return count || 0
    } catch (error) {
      console.error('Error fetching unread count:', error)
      return 0
    }
  }

  /**
   * Marcar notificación como leída
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error marking notification as read:', error)
      throw error
    }
  }

  /**
   * Marcar múltiples notificaciones como leídas
   */
  async markMultipleAsRead(notificationIds: string[]): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .in('id', notificationIds)

      if (error) throw error
    } catch (error) {
      console.error('Error marking notifications as read:', error)
      throw error
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)

      if (error) throw error
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      throw error
    }
  }

  /**
   * Eliminar notificación
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting notification:', error)
      throw error
    }
  }

  /**
   * Eliminar todas las notificaciones leídas
   */
  async deleteAllRead(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .eq('is_read', true)

      if (error) throw error
    } catch (error) {
      console.error('Error deleting read notifications:', error)
      throw error
    }
  }

  /**
   * Crear notificación (normalmente desde el backend)
   */
  async createNotification(input: NotificationCreateInput): Promise<Notification | null> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: input.user_id,
          type: input.type,
          title: input.title,
          message: input.message,
          action_url: input.action_url,
          related_id: input.related_id,
          related_type: input.related_type,
          priority: input.priority || 'normal',
          metadata: input.metadata || {},
          expires_at: input.expires_at,
        })
        .select()
        .single()

      if (error) throw error

      return data
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  /**
   * Suscribirse a notificaciones en tiempo real
   */
  subscribeToNotifications(
    userId: string,
    callback: (notification: Notification) => void
  ) {
    const channel = this.supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          callback(payload.new as Notification)
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }
}

// =====================================================
// FUNCIONES HELPER PARA CREAR NOTIFICACIONES
// =====================================================

/**
 * Notificación de cita creada (para el cliente)
 */
export async function notifyAppointmentCreated(
  userId: string,
  appointmentId: string,
  businessName: string,
  date: string,
  time: string
): Promise<void> {
  const service = new NotificationService()
  await service.createNotification({
    user_id: userId,
    type: 'appointment_created',
    title: 'Reserva creada',
    message: `Tu reserva en ${businessName} para el ${date} a las ${time} está pendiente de confirmación.`,
    action_url: `/mis-reservas/${appointmentId}`,
    related_id: appointmentId,
    related_type: 'appointment',
    priority: 'normal',
  })
}

/**
 * Notificación de cita confirmada (para el cliente)
 */
export async function notifyAppointmentConfirmed(
  userId: string,
  appointmentId: string,
  businessName: string,
  date: string,
  time: string
): Promise<void> {
  const service = new NotificationService()
  await service.createNotification({
    user_id: userId,
    type: 'appointment_confirmed',
    title: '✅ Reserva confirmada',
    message: `Tu reserva en ${businessName} para el ${date} a las ${time} ha sido confirmada.`,
    action_url: `/mis-reservas/${appointmentId}`,
    related_id: appointmentId,
    related_type: 'appointment',
    priority: 'high',
  })
}

/**
 * Notificación de nueva cita (para el business owner)
 */
export async function notifyNewAppointment(
  ownerId: string,
  appointmentId: string,
  customerName: string,
  date: string,
  time: string
): Promise<void> {
  const service = new NotificationService()
  await service.createNotification({
    user_id: ownerId,
    type: 'new_appointment',
    title: 'Nueva reserva',
    message: `Nueva reserva de ${customerName} para el ${date} a las ${time}`,
    action_url: `/admin/reservas/${appointmentId}`,
    related_id: appointmentId,
    related_type: 'appointment',
    priority: 'high',
  })
}

/**
 * Notificación de nueva review (para el business owner)
 */
export async function notifyNewReview(
  ownerId: string,
  reviewId: string,
  customerName: string,
  rating: number,
  businessName: string
): Promise<void> {
  const service = new NotificationService()
  await service.createNotification({
    user_id: ownerId,
    type: 'new_review',
    title: '⭐ Nueva opinión',
    message: `${customerName} dejó una opinión de ${rating} estrellas en ${businessName}`,
    action_url: `/admin/reviews`,
    related_id: reviewId,
    related_type: 'review',
    priority: 'high',
  })
}

/**
 * Notificación de nueva solicitud de negocio (para super admin)
 */
export async function notifyNewBusinessRequest(
  superAdminId: string,
  requestId: string,
  businessName: string,
  ownerName: string
): Promise<void> {
  const service = new NotificationService()
  await service.createNotification({
    user_id: superAdminId,
    type: 'new_business_request',
    title: '🏢 Nueva solicitud',
    message: `${ownerName} solicitó crear el negocio "${businessName}"`,
    action_url: `/super-admin/solicitudes`,
    related_id: requestId,
    related_type: 'business_request',
    priority: 'high',
  })
}

/**
 * Notificación de aprobación de negocio (para el owner)
 */
export async function notifyBusinessApproved(
  ownerId: string,
  businessId: string,
  businessName: string
): Promise<void> {
  const service = new NotificationService()
  await service.createNotification({
    user_id: ownerId,
    type: 'business_approved',
    title: '🎉 Negocio aprobado',
    message: `¡Felicidades! Tu negocio "${businessName}" ha sido aprobado y ya está activo.`,
    action_url: `/admin/dashboard`,
    related_id: businessId,
    related_type: 'business',
    priority: 'urgent',
  })
}

/**
 * Notificación de recordatorio de cita (24h antes)
 */
export async function notifyAppointmentReminder(
  userId: string,
  appointmentId: string,
  businessName: string,
  _date: string,
  time: string
): Promise<void> {
  const service = new NotificationService()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)

  await service.createNotification({
    user_id: userId,
    type: 'appointment_reminder',
    title: '⏰ Recordatorio de reserva',
    message: `Mañana tienes una cita en ${businessName} a las ${time}. ¡No lo olvides!`,
    action_url: `/mis-reservas/${appointmentId}`,
    related_id: appointmentId,
    related_type: 'appointment',
    priority: 'high',
  })
}

// =====================================================
// UTILIDADES PARA PWA
// =====================================================

/**
 * Determinar el contexto PWA según la URL
 */
export function getPWAContext(pathname: string): 'super-admin' | 'business' | 'customer' {
  if (pathname.startsWith('/super-admin')) return 'super-admin'
  if (pathname.startsWith('/admin')) return 'business'
  return 'customer'
}

/**
 * Filtrar tipos de notificación según el contexto PWA
 */
export function getNotificationTypesForContext(
  context: 'super-admin' | 'business' | 'customer'
): NotificationType[] {
  switch (context) {
    case 'super-admin':
      return ['new_business_request', 'business_approved', 'business_rejected', 'system_alert']
    case 'business':
      return [
        'new_appointment',
        'appointment_cancelled_by_customer',
        'new_review',
        'specialist_assigned',
        'low_availability',
      ]
    case 'customer':
      return [
        'appointment_created',
        'appointment_confirmed',
        'appointment_cancelled',
        'appointment_reminder',
        'appointment_completed',
        'review_request',
        'review_response',
      ]
  }
}

/**
 * Obtener icono según el tipo de notificación
 */
export function getNotificationIcon(type: NotificationType): string {
  const iconMap: Record<NotificationType, string> = {
    // Cliente
    appointment_created: '📅',
    appointment_confirmed: '✅',
    appointment_cancelled: '❌',
    appointment_reminder: '⏰',
    appointment_completed: '🎉',
    review_request: '⭐',
    review_response: '💬',
    // Business Owner
    new_appointment: '🔔',
    appointment_cancelled_by_customer: '❌',
    new_review: '⭐',
    specialist_assigned: '👤',
    low_availability: '⚠️',
    // Super Admin
    new_business_request: '🏢',
    business_approved: '✅',
    business_rejected: '❌',
    system_alert: '🚨',
  }

  return iconMap[type] || '🔔'
}

/**
 * Obtener color según la prioridad
 */
export function getNotificationColor(priority: NotificationPriority): string {
  const colorMap: Record<NotificationPriority, string> = {
    low: 'text-gray-600',
    normal: 'text-blue-600',
    high: 'text-orange-600',
    urgent: 'text-red-600',
  }

  return colorMap[priority]
}

// =====================================================
// EXPORTACIÓN POR DEFECTO
// =====================================================

export default NotificationService
