/**
 * NOTIFICATION BELL COMPONENT
 * Componente de notificaciones con dropdown y real-time updates
 * Soporta 3 contextos PWA: Super Admin, Business Owner, Cliente
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { Bell, Check, CheckCheck, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import NotificationService, {
  type Notification as NotificationData,
  getNotificationIcon,
} from '@/lib/services/notifications'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

export default function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationData[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const service = new NotificationService()

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Cargar notificaciones y suscribirse a cambios en tiempo real
  useEffect(() => {
    if (!user) return

    loadNotifications()
    loadUnreadCount()

    // Suscripción en tiempo real
    const unsubscribe = service.subscribeToNotifications(user.id, (notification) => {
      setNotifications((prev) => [notification, ...prev])
      setUnreadCount((prev) => prev + 1)

      // Mostrar notificación del navegador si está permitido
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: notification.id,
        })
      }
    })

    return () => {
      unsubscribe()
    }
  }, [user])

  async function loadNotifications() {
    if (!user) return

    setLoading(true)
    try {
      const { notifications: data } = await service.getUserNotifications(user.id, {
        limit: 20,
        offset: 0,
      })

      setNotifications(data)
      setHasMore(data.length === 20)
    } catch (error) {
      console.error('Error loading notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadUnreadCount() {
    if (!user) return

    try {
      const count = await service.getUnreadCount(user.id)
      setUnreadCount(count)
    } catch (error) {
      console.error('Error loading unread count:', error)
    }
  }

  async function handleMarkAsRead(notificationId: string, actionUrl?: string) {
    try {
      await service.markAsRead(notificationId)

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      )

      setUnreadCount((prev) => Math.max(0, prev - 1))

      if (actionUrl) {
        setIsOpen(false)
        router.push(actionUrl)
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }

  async function handleMarkAllAsRead() {
    if (!user) return

    try {
      await service.markAllAsRead(user.id)

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Error marking all as read:', error)
    }
  }

  async function handleDeleteNotification(notificationId: string) {
    try {
      await service.deleteNotification(notificationId)

      setNotifications((prev) => {
        const notification = prev.find((n) => n.id === notificationId)
        const newNotifications = prev.filter((n) => n.id !== notificationId)

        if (notification && !notification.is_read) {
          setUnreadCount((count) => Math.max(0, count - 1))
        }

        return newNotifications
      })
    } catch (error) {
      console.error('Error deleting notification:', error)
    }
  }

  async function handleDeleteAllRead() {
    if (!user) return

    try {
      await service.deleteAllRead(user.id)
      setNotifications((prev) => prev.filter((n) => !n.is_read))
    } catch (error) {
      console.error('Error deleting read notifications:', error)
    }
  }

  // Solicitar permisos de notificaciones del navegador
  async function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          requestNotificationPermission()
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-6 w-6" />

        {/* Badge con conteo */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white rounded-t-lg">
            <h3 className="font-semibold text-gray-900">Notificaciones</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  title="Marcar todas como leídas"
                >
                  <CheckCheck className="h-3 w-3" />
                  Marcar todas
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Lista de notificaciones */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-sm">No tienes notificaciones</p>
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() =>
                      handleMarkAsRead(notification.id, notification.action_url)
                    }
                  >
                    <div className="flex items-start gap-3">
                      {/* Icono */}
                      <div className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4
                            className={`text-sm font-medium ${
                              !notification.is_read
                                ? 'text-gray-900'
                                : 'text-gray-700'
                            }`}
                          >
                            {notification.title}
                          </h4>

                          {!notification.is_read && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                          )}
                        </div>

                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>

                        <p className="text-xs text-gray-500 mt-2">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </p>
                      </div>

                      {/* Acciones */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {!notification.is_read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMarkAsRead(notification.id)
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 rounded"
                            title="Marcar como leída"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteNotification(notification.id)
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 rounded"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 rounded-b-lg flex items-center justify-between">
              <button
                onClick={handleDeleteAllRead}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                Eliminar leídas
              </button>

              {hasMore && (
                <button
                  onClick={loadNotifications}
                  className="text-xs text-blue-600 hover:text-blue-700"
                >
                  Ver más
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
