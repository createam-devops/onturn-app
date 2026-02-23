# 🔐 Claves VAPID - OnTurn

**Generadas**: Febrero 23, 2026

---

## ✅ Claves Instaladas

Las siguientes claves VAPID han sido generadas y configuradas en `.env.local`:

### Public Key (Cliente)
```
BIxlhQZEvRSKHNZXqber4yt80BgrXKleuP9LTgeGYAUGy4q5xJFy_gnCtLu5sR9NSuTghFm40OG5oVG2Y0TAWVU
```

### Private Key (Servidor)
```
fwln1X8k7JpLSz66cZtNFYHEb-C1AcsmN5NrAKpgffQ
```

---

## 📋 Variables de Entorno Configuradas

### Archivo: `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://atxldtjknfbcwnnqxkov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...

# VAPID Keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIxlhQZEvRSKHNZXqber4yt80BgrXKleuP9LTgeGYAUGy4q5xJFy_gnCtLu5sR9NSuTghFm40OG5oVG2Y0TAWVU
VAPID_PRIVATE_KEY=fwln1X8k7JpLSz66cZtNFYHEb-C1AcsmN5NrAKpgffQ

# PWA
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 🚀 Cómo Usar

### 1. Las claves están listas
El archivo `.env.local` ya contiene las claves VAPID. **No necesitas hacer nada más**.

### 2. Suscribir usuarios a notificaciones push

```typescript
import { subscribeToPushNotifications } from '@/lib/pwa-utils'

// En el cliente
const subscription = await subscribeToPushNotifications()
console.log('Suscrito:', subscription)
```

### 3. Enviar notificaciones push desde el servidor

```typescript
// API Route: /api/send-push
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:admin@onturn.app',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const payload = JSON.stringify({
  title: 'Nueva Reserva',
  body: 'Tienes una nueva cita programada',
  icon: '/icons/customer-icon-192x192.png',
  url: '/mis-reservas'
})

await webpush.sendNotification(subscription, payload)
```

---

## 🔒 Seguridad

### ⚠️ IMPORTANTE

1. **NEVER commit .env.local to Git** - Ya está en `.gitignore`
2. **La Private Key es secreta** - Solo úsala en el servidor
3. **La Public Key es pública** - Se envía al navegador
4. **Regenerar claves** si la Private Key se compromete:
   ```bash
   node scripts/generate-vapid-keys.js
   ```

---

## 🧪 Testing

### Probar notificaciones del navegador

1. Abrir la app en Chrome/Edge
2. Permitir notificaciones cuando se solicite
3. Crear una notificación de prueba:

```javascript
// En la consola del navegador
const service = new NotificationService()
await service.createNotification({
  user_id: 'your-user-id',
  type: 'appointment_confirmed',
  title: 'Test Push',
  message: 'Probando notificaciones',
  priority: 'high'
})
```

4. Deberías ver:
   - ✅ Notificación in-app (dropdown)
   - ✅ Notificación del navegador (si permisos concedidos)

---

## 📱 Producción

Para desplegar en producción:

1. **Actualizar NEXT_PUBLIC_SITE_URL**:
   ```env
   NEXT_PUBLIC_SITE_URL=https://onturn.app
   ```

2. **Copiar variables al servidor**:
   - Todas las variables de `.env.local`
   - Configurarlas en el panel de hosting (Vercel/Netlify/VPS)

3. **Verificar HTTPS**:
   - Web Push solo funciona en HTTPS
   - Localhost está permitido para desarrollo

---

## 🔄 Regenerar Claves

Si necesitas nuevas claves VAPID:

```bash
# Genera nuevas claves
node scripts/generate-vapid-keys.js

# Actualiza manualmente .env.local
# o deja que el script lo haga automáticamente
```

**Nota**: Al regenerar claves, los usuarios que ya estén suscritos necesitarán volver a suscribirse.

---

## 🛠️ Troubleshooting

### Problema: "VAPID public key not configured"

**Solución**: Verifica que `.env.local` contenga `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

### Problema: "Push subscription failed"

**Solución**: 
1. Verifica permisos de notificaciones en el navegador
2. Asegúrate de estar en HTTPS (o localhost)
3. Verifica que la clave pública sea correcta

### Problema: "VAPID private key missing"

**Solución**: Verifica que `VAPID_PRIVATE_KEY` esté en `.env.local` (sin `NEXT_PUBLIC_`)

---

## 📚 Recursos

- [Web Push Protocol](https://developers.google.com/web/fundamentals/push-notifications)
- [VAPID Specification](https://tools.ietf.org/html/rfc8292)
- [web-push Library](https://github.com/web-push-libs/web-push)

---

**✨ Las notificaciones push están listas para usar!**
