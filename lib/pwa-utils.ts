/**
 * PWA UTILITIES
 * Helpers para gestión de Service Workers y notificaciones push
 */

// =====================================================
// SERVICE WORKER REGISTRATION
// =====================================================

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers not supported')
    return null
  }

  return navigator.serviceWorker
    .register('/sw.js', { scope: '/' })
    .then((registration) => {
      console.log('[PWA] Service Worker registered:', registration.scope)

      // Actualizar automáticamente
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Nuevo SW instalado, preguntar si recargar
            if (confirm('Nueva versión disponible. ¿Actualizar ahora?')) {
              newWorker.postMessage({ type: 'SKIP_WAITING' })
              window.location.reload()
            }
          }
        })
      })

      return registration
    })
    .catch((error) => {
      console.error('[PWA] Service Worker registration failed:', error)
      return null
    })
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return Promise.resolve()
  }

  return navigator.serviceWorker
    .getRegistration()
    .then((registration) => {
      if (registration) {
        return registration.unregister()
      }
      return undefined
    })
    .catch((error) => {
      console.error('[PWA] Service Worker unregistration failed:', error)
      return undefined
    })
}

// =====================================================
// NOTIFICACIONES PUSH
// =====================================================

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[PWA] Notifications not supported')
    return 'denied'
  }

  if (Notification.permission === 'granted') {
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    return await Notification.requestPermission()
  }

  return 'denied'
}

export function checkNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied'
  }

  return Notification.permission
}

export async function subscribeToPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('[PWA] Push notifications not supported')
    return null
  }

  try {
    const permission = await requestNotificationPermission()

    if (permission !== 'granted') {
      console.log('[PWA] Notification permission denied')
      return null
    }

    const registration = await navigator.serviceWorker.ready

    // VAPID public key - REEMPLAZAR con tu clave real
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''

    if (!vapidPublicKey) {
      console.warn('[PWA] VAPID public key not configured')
      return null
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    })

    console.log('[PWA] Push subscription:', subscription)

    return subscription
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error)
    return null
  }
}

export async function unsubscribeFromPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (subscription) {
      await subscription.unsubscribe()
      console.log('[PWA] Push unsubscribed')
    }
  } catch (error) {
    console.error('[PWA] Push unsubscription failed:', error)
  }
}

// =====================================================
// INSTALACIÓN PWA
// =====================================================

let deferredPrompt: any = null

export function initPWAInstallPrompt() {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    console.log('[PWA] Install prompt ready')

    // Disparar evento personalizado para mostrar botón de instalación
    window.dispatchEvent(new CustomEvent('pwa-install-available'))
  })

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed')
    deferredPrompt = null

    // Disparar evento personalizado
    window.dispatchEvent(new CustomEvent('pwa-installed'))
  })
}

export async function promptPWAInstall(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('[PWA] No install prompt available')
    return false
  }

  deferredPrompt.prompt()

  const { outcome } = await deferredPrompt.userChoice

  console.log('[PWA] Install outcome:', outcome)

  deferredPrompt = null

  return outcome === 'accepted'
}

export function isPWAInstalled(): boolean {
  if (typeof window === 'undefined') return false

  // Detectar si está instalada
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  )
}

export function getPWADisplayMode(): 'standalone' | 'browser' {
  if (typeof window === 'undefined') return 'browser'

  return window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
}

// =====================================================
// CACHE CONTROL
// =====================================================

export async function clearAllCaches() {
  if (!('caches' in window)) return

  const cacheNames = await caches.keys()

  await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)))

  console.log('[PWA] All caches cleared')
}

export async function cacheURLs(urls: string[]) {
  if (!('caches' in window)) return

  const cache = await caches.open('dynamic-cache')
  await cache.addAll(urls)

  console.log('[PWA] URLs cached:', urls)
}

// =====================================================
// HELPERS
// =====================================================

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

// =====================================================
// PWA CONTEXT DETECTION
// =====================================================

export function getPWAContext(pathname: string): 'super-admin' | 'business' | 'customer' {
  if (pathname.startsWith('/super-admin')) return 'super-admin'
  if (pathname.startsWith('/admin')) return 'business'
  return 'customer'
}

export function getManifestForContext(context: 'super-admin' | 'business' | 'customer'): string {
  const manifests = {
    'super-admin': '/manifest-superadmin.json',
    business: '/manifest-business.json',
    customer: '/manifest-customer.json',
  }

  return manifests[context]
}
