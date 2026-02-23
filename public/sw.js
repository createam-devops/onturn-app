/**
 * SERVICE WORKER - OnTurn PWA
 * Maneja cache, notificaciones push y funcionalidad offline
 * Soporta 3 contextos: super-admin, business, customer
 */

const CACHE_VERSION = 'onturn-pwa-v1.0.0'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const IMAGE_CACHE = `${CACHE_VERSION}-images`

// Recursos estáticos a cachear en la instalación
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/icons/customer-icon-192x192.png',
  '/icons/customer-icon-512x512.png',
  '/icons/business-icon-192x192.png',
  '/icons/business-icon-512x512.png',
  '/icons/admin-icon-192x192.png',
  '/icons/admin-icon-512x512.png',
]

// Instalar Service Worker
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...')

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[ServiceWorker] Caching static assets')
      return cache.addAll(STATIC_ASSETS)
    })
  )

  // Activar inmediatamente
  self.skipWaiting()
})

// Activar Service Worker
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...')

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Eliminar caches antiguas
            return cacheName.startsWith('onturn-pwa') && cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== IMAGE_CACHE
          })
          .map((cacheName) => {
            console.log('[ServiceWorker] Deleting old cache:', cacheName)
            return caches.delete(cacheName)
          })
      )
    })
  )

  // Tomar control de todas las páginas inmediatamente
  return self.clients.claim()
})

// Interceptar peticiones
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignorar peticiones a APIs externas
  if (!url.origin.includes(self.location.origin)) {
    return
  }

  // Ignorar peticiones a API routes (se manejan por red)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request))
    return
  }

  // Estrategia Cache-First para imágenes
  if (request.destination === 'image') {
    event.respondWith(cacheFirstStrategy(request, IMAGE_CACHE))
    return
  }

  // Estrategia Network-First para HTML (siempre mostrar contenido actualizado)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request))
    return
  }

  // Estrategia Cache-First para recursos estáticos (JS, CSS, fonts)
  if (request.destination === 'script' || request.destination === 'style' || request.destination === 'font') {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE))
    return
  }

  // Network-First por defecto
  event.respondWith(networkFirstStrategy(request))
})

// Estrategia Cache-First
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[ServiceWorker] Cache-First error:', error)

    // Intentar devolver algo del cache
    const cachedResponse = await caches.match(request)
    if (cachedResponse) {
      return cachedResponse
    }

    // Si es una navegación, mostrar página offline
    if (request.mode === 'navigate') {
      return caches.match('/offline')
    }

    throw error
  }
}

// Estrategia Network-First
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request)

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, networkResponse.clone())
    }

    return networkResponse
  } catch (error) {
    console.error('[ServiceWorker] Network-First error:', error)

    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      return cachedResponse
    }

    // Si es una navegación, mostrar página offline
    if (request.mode === 'navigate') {
      return caches.match('/offline')
    }

    throw error
  }
}

// =====================================================
// NOTIFICACIONES PUSH
// =====================================================

// Recibir notificación push
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received')

  let data = { title: 'OnTurn', body: 'Nueva notificación' }

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: getIconForContext(data.context || 'customer'),
    badge: '/icons/badge-96x96.png',
    image: data.image,
    vibrate: [200, 100, 200],
    tag: data.tag || 'onturn-notification',
    renotify: true,
    requireInteraction: data.priority === 'urgent',
    data: {
      url: data.url || '/',
      context: data.context,
    },
    actions: [
      {
        action: 'open',
        title: 'Ver',
        icon: '/icons/action-view.png',
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icons/action-close.png',
      },
    ],
  }

  event.waitUntil(self.registration.showNotification(data.title, options))
})

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action)

  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const urlToOpen = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus()
        }
      }

      // Si no, abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen)
      }
    })
  )
})

// Cerrar notificación
self.addEventListener('notificationclose', (event) => {
  console.log('[ServiceWorker] Notification closed:', event.notification.tag)
})

// =====================================================
// BACKGROUND SYNC (futuro)
// =====================================================

self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag)

  if (event.tag === 'sync-appointments') {
    event.waitUntil(syncAppointments())
  }
})

async function syncAppointments() {
  // Implementar sincronización de citas offline
  console.log('[ServiceWorker] Syncing appointments...')
}

// =====================================================
// HELPERS
// =====================================================

function getIconForContext(context) {
  const icons = {
    'super-admin': '/icons/admin-icon-192x192.png',
    business: '/icons/business-icon-192x192.png',
    customer: '/icons/customer-icon-192x192.png',
  }

  return icons[context] || icons.customer
}

// =====================================================
// MENSAJES DEL CLIENTE
// =====================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls)
      })
    )
  }
})
