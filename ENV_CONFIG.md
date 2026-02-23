# 🔐 Configuración de Variables de Entorno - OnTurn

## ✅ Estado Actual

**Fecha**: Febrero 23, 2026  
**Estado**: ✅ Configuración completa

---

## 📋 Variables Configuradas

### ✅ Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: Configurada
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Configurada

### ✅ VAPID Keys (Web Push)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`: ✅ Generada
- `VAPID_PRIVATE_KEY`: ✅ Generada

### ✅ PWA
- `NEXT_PUBLIC_ENABLE_PWA`: `true`
- `NEXT_PUBLIC_SITE_URL`: `http://localhost:3000`

---

## 🚀 Comandos Disponibles

### Generar nuevas claves VAPID
```bash
npm run generate-vapid
```

### Verificar configuración
```bash
npm run verify
```

### Copiar credenciales de Supabase
```bash
npm run copy-credentials
```

---

## 📁 Archivos

### `.env.local` (NO subirlo a Git)
Contiene las variables de entorno reales. Este archivo está en `.gitignore`.

### `env.example.txt`
Template con variables de ejemplo para nuevos desarrolladores.

---

## 🔄 Desarrollo vs Producción

### Desarrollo (localhost)
```env
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_ENABLE_PWA=true
```

### Producción
```env
NEXT_PUBLIC_SITE_URL=https://onturn.app
NEXT_PUBLIC_ENABLE_PWA=true
```

---

## ⚠️ Seguridad

### ✅ Buenas Prácticas Implementadas

1. **`.env.local` en `.gitignore`** ✅
2. **Private keys solo en servidor** ✅
3. **Variables con prefijo `NEXT_PUBLIC_` son públicas** ✅
4. **`VAPID_PRIVATE_KEY` NO tiene prefijo** ✅ (solo servidor)

### 🔒 Claves Sensibles

Nunca expongas estas variables:
- `VAPID_PRIVATE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (si la agregas)
- API keys de terceros

---

## 📚 Más Información

- [Configuración VAPID](./VAPID_KEYS.md)
- [Notificaciones PWA](./NOTIFICATIONS_PWA.md)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
