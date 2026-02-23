# 📱 SISTEMA DE NOTIFICACIONES PUSH & PWA

Sistema completo de notificaciones push in-app con soporte para **3 PWAs instalables**: Super Admin, Business Owner y Cliente.

---

## 📋 ÍNDICE

1. [Arquitectura del Sistema](#arquitectura-del-sistema)
2. [Base de Datos](#base-de-datos)
3. [Servicio de Notificaciones](#servicio-de-notificaciones)
4. [Componentes UI](#componentes-ui)
5. [PWA - Progressive Web Apps](#pwa---progressive-web-apps)
6. [Tipos de Notificaciones](#tipos-de-notificaciones)
7. [Triggers Automáticos](#triggers-automáticos)
8. [Instalación y Configuración](#instalación-y-configuración)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## 🏗️ ARQUITECTURA DEL SISTEMA

### Componentes Principales

```
┌─────────────────────────────────────────────────┐
│                  FRONTEND                       │
├─────────────────────────────────────────────────┤
│ Components:                                     │
│  - NotificationBell (UI dropdown)               │
│  - PWAInstallPrompt (installation banner)       │
│  - PWAProvider (initialization)                 │
│                                                 │
│ Services:                                       │
│  - NotificationService (CRUD operations)        │
│  - PWA Utils (service worker, push, install)    │
├─────────────────────────────────────────────────┤
│                  BACKEND                        │
├─────────────────────────────────────────────────┤
│ Database:                                       │
│  - notifications table                          │
│  - RLS policies                                 │
│  - Triggers automáticos                         │
│                                                 │
│ Realtime:                                       │
│  - Supabase Realtime subscriptions              │
├─────────────────────────────────────────────────┤
│                  PWA LAYER                      │
├─────────────────────────────────────────────────┤
│ Service Workers:                                │
│  - sw.js (cache, push notifications, offline)   │
│                                                 │
│ Manifests:                                      │
│  - manifest-customer.json                       │
│  - manifest-business.json                       │
│  - manifest-superadmin.json                     │
└─────────────────────────────────────────────────┘
```

### 3 PWAs Instalables

| PWA | Scope | Start URL | Theme Color | Target Users |
|-----|-------|-----------|-------------|--------------|
| **Customer** | `/` | `/reservas` | `#3b82f6` (Blue) | Clientes finales |
| **Business** | `/admin` | `/admin/dashboard` | `#0f172a` (Dark Blue) | Dueños de negocios |
| **Super Admin** | `/super-admin` | `/super-admin/dashboard` | `#6d28d9` (Purple) | Administradores del sistema |

---

## 🗄️ BASE DE DATOS

### Tabla `notifications`

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  action_url VARCHAR(500),
  related_id UUID,
  related_type VARCHAR(50),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  priority VARCHAR(20) DEFAULT 'normal',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);
```

### Campos Importantes

- **user_id**: Receptor de la notificación
- **type**: Tipo específico (ver sección [Tipos de Notificaciones](#tipos-de-notificaciones))
- **priority**: `low` | `normal` | `high` | `urgent`
- **action_url**: URL para navegar al hacer click
- **related_id/related_type**: Referencia al recurso relacionado
- **metadata**: Datos adicionales en JSON

### Políticas RLS

```sql
-- Usuarios solo ven sus notificaciones
CREATE POLICY "users_read_own_notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Usuarios pueden marcar como leídas
CREATE POLICY "users_update_own_notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Sistema inserta notificaciones (service role)
CREATE POLICY "system_insert_notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);
```

---

## 🔧 SERVICIO DE NOTIFICACIONES

### NotificationService Class

Ubicación: `lib/services/notifications.ts`

#### Métodos Principales

**1. Obtener notificaciones del usuario**
```typescript
await service.getUserNotifications(userId, {
  is_read: false,
  limit: 20,
  offset: 0
})
// Returns: { notifications: Notification[], total: number }
```

**2. Conteo de no leídas**
```typescript
const count = await service.getUnreadCount(userId)
```

**3. Marcar como leída**
```typescript
await service.markAsRead(notificationId)
await service.markMultipleAsRead([id1, id2])
await service.markAllAsRead(userId)
```

**4. Eliminar notificaciones**
```typescript
await service.deleteNotification(notificationId)
await service.deleteAllRead(userId)
```

**5. Crear notificación**
```typescript
await service.createNotification({
  user_id: 'uuid',
  type: 'appointment_confirmed',
  title: 'Reserva confirmada',
  message: 'Tu reserva ha sido confirmada',
  action_url: '/mis-reservas/123',
  priority: 'high'
})
```

**6. Suscripción en tiempo real**
```typescript
const unsubscribe = service.subscribeToNotifications(userId, (notification) => {
  console.log('Nueva notificación:', notification)
})

// Cleanup
unsubscribe()
```

### Helper Functions

```typescript
// Cliente
await notifyAppointmentCreated(userId, appointmentId, businessName, date, time)
await notifyAppointmentConfirmed(userId, appointmentId, businessName, date, time)
await notifyAppointmentReminder(userId, appointmentId, businessName, date, time)

// Business Owner
await notifyNewAppointment(ownerId, appointmentId, customerName, date, time)
await notifyNewReview(ownerId, reviewId, customerName, rating, businessName)

// Super Admin
await notifyNewBusinessRequest(superAdminId, requestId, businessName, ownerName)
await notifyBusinessApproved(ownerId, businessId, businessName)
```

---

## 🎨 COMPONENTES UI

### 1. NotificationBell

**Ubicación**: `components/shared/NotificationBell.tsx`

**Features**:
- ✅ Icono de campana con badge de conteo
- ✅ Dropdown con lista de notificaciones
- ✅ Realtime updates vía Supabase
- ✅ Marcar como leída individual o todas
- ✅ Eliminar notificaciones
- ✅ Navegación al hacer click
- ✅ Notificaciones del navegador (Web Push)

**Uso**:
```tsx
import NotificationBell from '@/components/shared/NotificationBell'

<NotificationBell />
```

### 2. PWAInstallPrompt

**Ubicación**: `components/shared/PWAInstallPrompt.tsx`

**Features**:
- ✅ Banner de instalación adaptativo
- ✅ Detección automática de contexto (customer/business/admin)
- ✅ Dismiss persistente (sessionStorage)
- ✅ Animaciones suaves
- ✅ Responsive design

**Uso**:
```tsx
import PWAInstallPrompt from '@/components/shared/PWAInstallPrompt'

<PWAInstallPrompt context="customer" />
```

### 3. PWAProvider

**Ubicación**: `components/shared/PWAProvider.tsx`

**Features**:
- ✅ Registra Service Worker
- ✅ Inyecta manifest dinámicamente según ruta
- ✅ Actualiza theme-color
- ✅ Inicializa install prompt
- ✅ Detecta modo standalone

**Uso**: Ya integrado en `app/layout.tsx`

---

## 📱 PWA - PROGRESSIVE WEB APPS

### Service Worker

**Ubicación**: `public/sw.js`

#### Estrategias de Cache

1. **Cache-First** (Imágenes, CSS, JS, Fonts)
   - Busca en cache primero
   - Si no existe, fetch de red y cachea
   - Ideal para recursos estáticos

2. **Network-First** (HTML, API data)
   - Intenta fetch de red primero
   - Si falla, usa cache
   - Siempre contenido actualizado

3. **Stale-While-Revalidate** (Futuro)
   - Devuelve cache inmediatamente
   - Actualiza en segundo plano

#### Funcionalidades

**Cache Management**:
```javascript
// Versión del cache
const CACHE_VERSION = 'onturn-pwa-v1.0.0'

// Caches separados
STATIC_CACHE  // HTML, CSS, JS
DYNAMIC_CACHE // Páginas dinámicas
IMAGE_CACHE   // Imágenes
```

**Push Notifications**:
```javascript
// Listener de push
self.addEventListener('push', (event) => {
  const data = event.data.json()
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: getIconForContext(data.context),
    badge: '/icons/badge-96x96.png',
    vibrate: [200, 100, 200],
    tag: data.tag,
    data: { url: data.url }
  })
})

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  clients.openWindow(event.notification.data.url)
})
```

### PWA Utils

**Ubicación**: `lib/pwa-utils.ts`

#### Funciones Principales

**Service Worker**:
```typescript
registerServiceWorker()         // Registra SW
unregisterServiceWorker()        // Desregistra SW
```

**Push Notifications**:
```typescript
requestNotificationPermission()  // Pide permisos
checkNotificationPermission()    // Verifica estado
subscribeToPushNotifications()   // Suscribe a push
unsubscribeFromPushNotifications() // Cancela suscripción
```

**Instalación PWA**:
```typescript
initPWAInstallPrompt()    // Inicializa evento beforeinstallprompt
promptPWAInstall()        // Muestra prompt de instalación
isPWAInstalled()          // Detecta si está instalada
getPWADisplayMode()       // 'standalone' | 'browser'
```

**Cache**:
```typescript
clearAllCaches()          // Limpia todos los caches
cacheURLs(['/', '/about']) // Cachea URLs específicas
```

**Context Detection**:
```typescript
getPWAContext(pathname)           // Detecta contexto según ruta
getManifestForContext(context)    // Devuelve manifest correcto
```

---

## 📬 TIPOS DE NOTIFICACIONES

### Cliente (Customer PWA)

| Tipo | Título | Prioridad | Trigger |
|------|--------|-----------|---------|
| `appointment_created` | Reserva creada | normal | Insert en appointments |
| `appointment_confirmed` | ✅ Reserva confirmada | high | Status → confirmed |
| `appointment_cancelled` | ❌ Reserva cancelada | normal | Status → cancelled |
| `appointment_reminder` | ⏰ Recordatorio | high | Cron 24h antes |
| `appointment_completed` | 🎉 Cita completada | normal | Status → completed |
| `review_request` | ⭐ Deja tu opinión | low | Cron después de completar |
| `review_response` | 💬 Respuesta | normal | business_response != null |

### Business Owner (Business PWA)

| Tipo | Título | Prioridad | Trigger |
|------|--------|-----------|---------|
| `new_appointment` | Nueva reserva | high | Insert en appointments |
| `appointment_cancelled_by_customer` | Reserva cancelada | normal | Status → cancelled |
| `new_review` | ⭐ Nueva opinión | high | Insert en reviews |
| `specialist_assigned` | Especialista asignado | normal | Manual |
| `low_availability` | ⚠️ Baja disponibilidad | high | Cron verifica slots |

### Super Admin (SuperAdmin PWA)

| Tipo | Título | Prioridad | Trigger |
|------|--------|-----------|---------|
| `new_business_request` | 🏢 Nueva solicitud | high | Insert en business_requests |
| `business_approved` | ✅ Negocio aprobado | urgent | Status → approved |
| `business_rejected` | ❌ Negocio rechazado | normal | Status → rejected |
| `system_alert` | 🚨 Alerta del sistema | urgent | Manual |

---

## ⚙️ TRIGGERS AUTOMÁTICOS

### Implementados en PostgreSQL

**1. Cita creada**
```sql
CREATE TRIGGER trigger_notify_appointment_created
  AFTER INSERT ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_created();
```
Notifica a:
- Cliente: "Reserva creada, pendiente de confirmación"
- Business Owner: "Nueva reserva de [cliente] para [fecha]"

**2. Cita confirmada**
```sql
CREATE TRIGGER trigger_notify_appointment_confirmed
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_confirmed();
```
Notifica a:
- Cliente: "✅ Reserva confirmada"

**3. Cita cancelada**
```sql
CREATE TRIGGER trigger_notify_appointment_cancelled
  AFTER UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION notify_appointment_cancelled();
```
Notifica a:
- Cliente: "❌ Reserva cancelada"
- Business Owner: "Reserva cancelada"

**4. Review creada**
```sql
CREATE TRIGGER trigger_notify_review_created
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_created();
```
Notifica a:
- Business Owner: "⭐ [cliente] dejó una opinión de X estrellas"

**5. Respuesta a review**
```sql
CREATE TRIGGER trigger_notify_review_response
  AFTER UPDATE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION notify_review_response();
```
Notifica a:
- Cliente: "💬 El negocio respondió a tu opinión"

---

## 🚀 INSTALACIÓN Y CONFIGURACIÓN

### 1. Ejecutar Script SQL

```bash
# Conectar a Supabase y ejecutar
psql -U postgres -d onturn < scripts/create-notifications-system.sql
```

O desde Supabase Dashboard → SQL Editor:
```sql
-- Copiar y pegar contenido de create-notifications-system.sql
-- Ejecutar
```

### 2. Variables de Entorno

Agregar a `.env.local`:

```env
# PWA
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_SITE_URL=https://onturn.app

# Web Push (VAPID Keys) - Opcional
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
```

**Generar VAPID Keys** (para Web Push real):
```bash
npm install web-push -g
web-push generate-vapid-keys
```

### 3. Crear Iconos PWA

Generar iconos para cada contexto:

**Customer Icons** (Blue):
- `/public/icons/customer-icon-192x192.png`
- `/public/icons/customer-icon-512x512.png`

**Business Icons** (Dark Blue):
- `/public/icons/business-icon-192x192.png`
- `/public/icons/business-icon-512x512.png`

**Admin Icons** (Purple):
- `/public/icons/admin-icon-192x192.png`
- `/public/icons/admin-icon-512x512.png`

Herramientas recomendadas:
- [PWA Asset Generator](https://www.pwabuilder.com/)
- [RealFaviconGenerator](https://realfavicongenerator.net/)

### 4. Integración en Layouts

Ya integrado en:
- `app/layout.tsx` → PWAProvider
- `components/shared/Header.tsx` → NotificationBell
- `components/admin/Sidebar.tsx` → NotificationBell

### 5. Habilitar Supabase Realtime

En Supabase Dashboard:
1. Database → Replication
2. Habilitar realtime para tabla `notifications`
3. Eventos: INSERT, UPDATE, DELETE

---

## 🧪 TESTING

### Test de Notificaciones

**1. Crear notificación de prueba**:
```typescript
import NotificationService from '@/lib/services/notifications'

const service = new NotificationService()

await service.createNotification({
  user_id: 'your-user-id',
  type: 'appointment_confirmed',
  title: 'Test de notificación',
  message: 'Esta es una notificación de prueba',
  action_url: '/mis-reservas',
  priority: 'high'
})
```

**2. Verificar realtime**:
- Abrir 2 tabs con la misma sesión
- Crear notificación en Tab 1
- Verificar que aparece en Tab 2 sin refresh

**3. Test de triggers**:
```sql
-- Crear cita de prueba
INSERT INTO appointments (user_id, business_id, appointment_date, appointment_time, status)
VALUES ('user-uuid', 'business-uuid', '2026-03-01', '10:00', 'pending');

-- Verificar notificaciones creadas
SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5;
```

### Test de PWA

**1. Service Worker**:
```javascript
// En DevTools Console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW registered:', reg)
})
```

**2. Cache**:
```javascript
// Listar caches
caches.keys().then(keys => console.log('Caches:', keys))

// Ver contenido
caches.open('onturn-pwa-v1.0.0-static').then(cache => {
  cache.keys().then(keys => console.log(keys))
})
```

**3. Instalación**:
- Abrir en Chrome/Edge
- DevTools → Application → Manifest
- Verificar manifest correcto según ruta
- Click "Install" en address bar

**4. Notificaciones del navegador**:
```javascript
// Pedir permisos
Notification.requestPermission().then(permission => {
  console.log('Permission:', permission)
})

// Enviar notificación de prueba
new Notification('Test', {
  body: 'Notificación de prueba',
  icon: '/icons/customer-icon-192x192.png'
})
```

### Test de Manifests Dinámicos

**1. Cliente** (ruta: `/reservas`):
```bash
# Verificar manifest
curl http://localhost:3000/manifest-customer.json
```

**2. Business** (ruta: `/admin/dashboard`):
```bash
curl http://localhost:3000/manifest-business.json
```

**3. Super Admin** (ruta: `/super-admin/dashboard`):
```bash
curl http://localhost:3000/manifest-superadmin.json
```

---

## 🔍 TROUBLESHOOTING

### Problema: Notificaciones no aparecen

**Solución 1**: Verificar RLS policies
```sql
-- Verificar si el usuario puede leer notificaciones
SELECT * FROM notifications WHERE user_id = 'your-user-id';
```

**Solución 2**: Verificar Realtime
```javascript
// En cliente
const { data, error } = await supabase
  .from('notifications')
  .select('*')
  .eq('user_id', user.id)

console.log('Notifications:', data, 'Error:', error)
```

**Solución 3**: Revisar triggers
```sql
-- Listar triggers
SELECT * FROM pg_trigger WHERE tgname LIKE '%notify%';
```

### Problema: Service Worker no registra

**Solución 1**: Verificar HTTPS
- SW solo funciona en `https://` o `localhost`
- En producción, asegurar certificado SSL válido

**Solución 2**: Limpiar cache
```javascript
// Desregistrar SW
navigator.serviceWorker.getRegistration().then(reg => {
  reg?.unregister()
})

// Limpiar caches
caches.keys().then(keys => {
  keys.forEach(key => caches.delete(key))
})

// Recargar
location.reload()
```

**Solución 3**: Verificar scope
```javascript
// SW debe estar en /public/sw.js
// Scope debe ser '/'
navigator.serviceWorker.register('/sw.js', { scope: '/' })
```

### Problema: PWA no se instala

**Solución 1**: Verificar manifest válido
- Usar [PWA Builder](https://www.pwabuilder.com) para validar
- Asegurar que todos los iconos existen

**Solución 2**: Verificar criterios de instalación
- ✅ Manifest válido con name, short_name, icons
- ✅ Service Worker registrado
- ✅ Servido vía HTTPS
- ✅ Al menos un icono 192x192 y 512x512

**Solución 3**: DevTools
```
Chrome DevTools → Application → Manifest
- Ver errores en consola
- Verificar "Installability"
```

### Problema: Notificaciones del navegador no funcionan

**Solución 1**: Verificar permisos
```javascript
console.log('Notification permission:', Notification.permission)

// Si es 'denied', usuario debe habilitarlo manualmente en:
// Chrome: Settings → Privacy → Site Settings → Notifications
```

**Solución 2**: Verificar Web Push setup
```javascript
// Verif VAPID key configurado
console.log('VAPID Public Key:', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
```

**Solución 3**: Test en incógnito
- Las notificaciones pueden estar bloqueadas en perfil normal
- Probar en modo incógnito

### Problema: Manifest incorrecto según ruta

**Solución**: Verificar PWAProvider
```tsx
// En componente, verificar contexto
import { getPWAContext } from '@/lib/pwa-utils'

const context = getPWAContext(window.location.pathname)
console.log('PWA Context:', context) // 'customer' | 'business' | 'super-admin'
```

---

## 📊 MÉTRICAS Y ANÁLISIS

### KPIs a Monitorear

1. **Engagement**:
   - Tasa de apertura de notificaciones
   - Tiempo promedio de respuesta
   - Notificaciones leídas vs no leídas

2. **PWA**:
   - Tasa de instalación (installs / visits)
   - Usuarios en modo standalone
   - Retention de usuarios PWA vs web

3. **Performance**:
   - Tiempo de carga offline
   - Hit rate del cache
   - Tiempo de respuesta de notificaciones

### Queries de Análisis

```sql
-- Notificaciones más efectivas (mayor tasa de click)
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN is_read THEN 1 END) as leidas,
  ROUND(COUNT(CASE WHEN is_read THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as tasa_lectura
FROM notifications
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY type
ORDER BY tasa_lectura DESC;

-- Tiempo promedio de respuesta
SELECT 
  type,
  AVG(EXTRACT(EPOCH FROM (read_at - created_at))) / 60 as minutos_promedio
FROM notifications
WHERE is_read = true
GROUP BY type
ORDER BY minutos_promedio;

-- Usuarios más activos
SELECT 
  user_id,
  COUNT(*) as total_notificaciones,
  COUNT(CASE WHEN is_read THEN 1 END) as leidas
FROM notifications
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY user_id
ORDER BY total_notificaciones DESC
LIMIT 10;
```

---

## 🎯 MEJORAS FUTURAS

### Corto Plazo (1-2 semanas)

- [ ] **Web Push real** con VAPID keys
- [ ] **Badges de app** (iOS/Android) con conteo
- [ ] **Sonidos personalizados** por tipo de notificación
- [ ] **Notificaciones agrupadas** (múltiples reservas → 1 notificación)
- [ ] **Preferencias de usuario** (qué notificaciones recibir)

### Mediano Plazo (1 mes)

- [ ] **Background Sync** para citas offline
- [ ] **Periodic Background Sync** para recordatorios
- [ ] **Rich notifications** con botones de acción
- [ ] **Analytics dashboard** de notificaciones
- [ ] **A/B testing** de mensajes

### Largo Plazo (3+ meses)

- [ ] **Push vía FCM** (Firebase Cloud Messaging)
- [ ] **Notificaciones programadas** (no realtime)
- [ ] **Plantillas personalizables** por negocio
- [ ] **Segmentación avanzada** de usuarios
- [ ] **Machine Learning** para timing óptimo

---

## 📝 CHANGELOG

### v1.0.0 (2026-02-23)

**Features**:
- ✅ Sistema completo de notificaciones in-app
- ✅ 3 PWAs instalables (Customer, Business, SuperAdmin)
- ✅ Service Worker con cache strategies
- ✅ Realtime updates vía Supabase
- ✅ 17 tipos de notificaciones
- ✅ 5 triggers automáticos en PostgreSQL
- ✅ Componentes UI (NotificationBell, PWAInstallPrompt)
- ✅ Manifests dinámicos según contexto
- ✅ Página offline
- ✅ Documentación completa

**Database**:
- ✅ Tabla `notifications` con RLS
- ✅ Índices optimizados
- ✅ Funciones helper (mark_all_read, cleanup, etc)

**Components**:
- ✅ NotificationBell con dropdown
- ✅ PWAInstallPrompt adaptativo
- ✅ PWAProvider para inicialización

**Services**:
- ✅ NotificationService (CRUD + Realtime)
- ✅ PWA Utils (SW, Push, Install)

---

## 🤝 CONTRIBUIR

Para agregar nuevos tipos de notificaciones:

1. **Actualizar TypeScript types**:
```typescript
// lib/services/notifications.ts
export type NotificationType = 
  | 'existing_type'
  | 'new_notification_type' // Agregar aquí
```

2. **Crear helper function**:
```typescript
export async function notifyNewFeature(
  userId: string,
  featureId: string
): Promise<void> {
  const service = new NotificationService()
  await service.createNotification({
    user_id: userId,
    type: 'new_notification_type',
    title: 'Título',
    message: 'Mensaje descriptivo',
    action_url: `/feature/${featureId}`,
    priority: 'normal'
  })
}
```

3. **Agregar trigger (opcional)**:
```sql
CREATE TRIGGER trigger_notify_new_feature
  AFTER INSERT ON features
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_feature();
```

4. **Actualizar getNotificationIcon**:
```typescript
const iconMap: Record<NotificationType, string> = {
  // ...existing
  new_notification_type: '🎉'
}
```

---

## 📞 SOPORTE

Para dudas o problemas:
- 📧 Email: dev@onturn.app
- 💬 Discord: [OnTurn Dev Community]
- 📚 Docs: https://docs.onturn.app/notifications

---

**Desarrollado con ❤️ para OnTurn**
*Sistema de Notificaciones Push & PWA - v1.0.0*
