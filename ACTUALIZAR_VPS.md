# 🔄 Actualizar OnTurn en VPS Existente

**VPS IP:** 72.62.138.112  
**Usuario:** root  
**Dominio:** onturn.app

---

## 📋 Resumen de Cambios Nuevos

Has agregado:
- ✅ Sistema de notificaciones push (base de datos ya configurada)
- ✅ 3 PWA instalables (customer, business, super-admin)
- ✅ Service Worker con cache estratégico
- ✅ VAPID keys para Web Push
- ✅ NotificationBell component en Header y Sidebar

---

## 🚀 Actualización Rápida (5 minutos)

### PASO 1: Conectar al VPS

```bash
ssh root@72.62.138.112
cd /var/www/onturn-app  # o donde tengas el proyecto
```

### PASO 2: Actualizar variables de entorno

```bash
# Backup del .env actual
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Editar .env
nano .env
```

**Agregar estas nuevas variables al final del archivo:**

```env
# VAPID Keys para Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIxlhQZEvRSKHNZXqber4yt80BgrXKleuP9LTgeGYAUGy4q5xJFy_gnCtLu5sR9NSuTghFm40OG5oVG2Y0TAWVU
VAPID_PRIVATE_KEY=fwln1X8k7JpLSz66cZtNFYHEb-C1AcsmN5NrAKpgffQ

# PWA
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_SITE_URL=https://onturn.app
```

Guarda con `Ctrl+O`, `Enter`, `Ctrl+X`

### PASO 3: Pull del código actualizado

```bash
# Asegúrate de estar en la rama correcta
git status

# Pull de los cambios
git pull origin main  # o la rama que uses
```

### PASO 4: Rebuild y restart

```bash
# Detener contenedor actual
docker-compose down

# Limpiar imágenes antiguas (opcional pero recomendado)
docker image prune -af

# Rebuild con las nuevas variables
docker-compose up -d --build

# Ver logs para verificar
docker logs -f onturn-app
```

Presiona `Ctrl+C` cuando veas que está corriendo bien.

### PASO 5: Verificar que funciona

```bash
# Esperar unos segundos
sleep 10

# Test local
curl http://localhost:3000

# Test con dominio (si ya tienes SSL configurado)
curl https://onturn.app
```

Si ves HTML, ¡funciona! ✅

---

## 🌐 Actualizar Nginx (si es necesario)

### Verificar configuración actual

```bash
# Ver tu configuración actual
cat /etc/nginx/sites-available/onturn.app
# o
cat /etc/nginx/sites-enabled/onturn.app
```

### Agregar headers para PWA

Si tu configuración NO tiene estos headers, agrégalos:

```bash
nano /etc/nginx/sites-available/onturn.app
```

Dentro del bloque `server` para HTTPS (puerto 443), agrega:

```nginx
# PWA Required Headers
add_header Service-Worker-Allowed "/" always;

# Service Worker (no cache)
location = /sw.js {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    add_header Service-Worker-Allowed "/" always;
}

# PWA Manifest files (no cache para manifests dinámicos)
location ~* /manifest.*\.json$ {
    proxy_pass http://localhost:3000;
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    add_header Content-Type "application/manifest+json";
}
```

Luego:

```bash
# Test configuración
nginx -t

# Si todo OK, reload
systemctl reload nginx
```

---

## 🔧 Verificaciones Post-Deployment

### 1. Verificar que el contenedor corre

```bash
docker ps
```

Deberías ver `onturn-app` en estado `Up`.

### 2. Ver logs en tiempo real

```bash
docker logs -f onturn-app
```

Busca errores en rojo. Si ves requests normales, está bien.

### 3. Probar desde el navegador

Abre: **https://onturn.app**

Deberías ver:
- ✅ App carga normalmente
- ✅ Banner de "Instalar OnTurn" (en Chrome móvil)
- ✅ Notificación bell en el header (si estás logueado)

### 4. Probar notificaciones

1. Inicia sesión
2. Crea una reserva
3. Deberías ver una notificación en el bell 🔔

### 5. Probar PWA

**En móvil (Chrome/Safari):**
- Abre https://onturn.app
- Verás banner "Agregar a pantalla de inicio"
- Click → La app se instala

**En desktop (Chrome):**
- Icono de + en la barra de direcciones
- O menú → "Instalar OnTurn"

---

## 📱 Generar Iconos PWA (PENDIENTE)

Actualmente faltan los iconos. Necesitas crear:

```
public/icons/
  icon-72x72.png
  icon-96x96.png
  icon-128x128.png
  icon-144x144.png
  icon-152x152.png
  icon-192x192.png
  icon-384x384.png
  icon-512x512.png
```

**Opción fácil:**
1. Ve a https://www.pwabuilder.com/imageGenerator
2. Sube tu logo
3. Descarga el paquete ZIP
4. Extraer y copiar al VPS:

```bash
# Desde tu PC local
scp -r public/icons root@72.62.138.112:/var/www/onturn-app/public/

# Luego en el VPS, rebuild
docker-compose restart
```

---

## 🎯 GitHub Actions (Opcional - Para automatizar futuros deploys)

Si quieres que los próximos deployments sean automáticos:

### 1. En tu VPS, crear usuario para GitHub

```bash
# Crear usuario
useradd -m -s /bin/bash github-deploy
usermod -aG docker github-deploy

# Generar SSH key
su - github-deploy
ssh-keygen -t ed25519 -C "github-deploy@onturn.app"

# Mostrar clave pública
cat ~/.ssh/id_ed25519.pub

# Agregar a authorized_keys
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# Mostrar clave PRIVADA (para GitHub Secrets)
cat ~/.ssh/id_ed25519
```

Copia la clave PRIVADA completa.

### 2. Dar permisos a github-deploy

```bash
# Como root
chown -R github-deploy:github-deploy /var/www/onturn-app
usermod -aG docker github-deploy

# Permitir docker sin sudo
echo "github-deploy ALL=(ALL) NOPASSWD: /usr/bin/docker, /usr/local/bin/docker-compose" | sudo tee /etc/sudoers.d/github-deploy
```

### 3. Configurar GitHub Secrets

En tu repo GitHub → Settings → Secrets → Actions → New secret:

| Secret | Valor |
|--------|-------|
| `VPS_HOST` | `72.62.138.112` |
| `VPS_USERNAME` | `github-deploy` |
| `VPS_SSH_KEY` | Clave privada SSH de arriba |
| `NEXT_PUBLIC_SUPABASE_URL` | Tu URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tu anon key |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BIxlhQZEvRSKHNZXqber4yt80BgrXKleuP9LTgeGYAUGy4q5xJFy_gnCtLu5sR9NSuTghFm40OG5oVG2Y0TAWVU` |
| `VAPID_PRIVATE_KEY` | `fwln1X8k7JpLSz66cZtNFYHEb-C1AcsmN5NrAKpgffQ` |

### 4. A partir de ahora

Cada push a `main`:

```bash
git push origin main
```

→ GitHub Actions automáticamente despliega al VPS 🚀

Puedes ver el progreso en: **GitHub → Actions**

---

## ⚡ Comandos Útiles

```bash
# Ver logs en vivo
docker logs -f onturn-app

# Reiniciar app
docker-compose restart

# Rebuild completo
docker-compose down
docker-compose up -d --build

# Ver uso de recursos
docker stats onturn-app

# Limpiar espacio
docker system prune -af

# Ver variables de entorno del contenedor
docker exec onturn-app env | grep NEXT_PUBLIC

# Entrar al contenedor
docker exec -it onturn-app sh
```

---

## 🐛 Troubleshooting

### Contenedor no inicia

```bash
# Ver logs de error
docker logs onturn-app

# Verificar .env
cat .env | grep VAPID

# Rebuild sin cache
docker-compose build --no-cache
docker-compose up -d
```

### Notificaciones no funcionan

1. Verifica que el SQL fue ejecutado en Supabase
2. Verifica VAPID keys en .env
3. Revisa logs: `docker logs onturn-app | grep notification`

### PWA no se puede instalar

1. Verifica HTTPS (debe ser https://)
2. Verifica que sw.js carga: https://onturn.app/sw.js
3. Verifica manifest: https://onturn.app/manifest-customer.json
4. Chrome DevTools → Application → Manifest

### App lenta después de actualizar

```bash
# Limpiar cache de Docker
docker system prune -af

# Reiniciar Nginx
systemctl restart nginx

# Verificar recursos del servidor
htop
df -h
```

---

## 📊 Checklist de Actualización

- [ ] Conectado al VPS (ssh root@72.62.138.112)
- [ ] Variables VAPID agregadas al .env
- [ ] Git pull ejecutado
- [ ] Docker rebuild completado
- [ ] Contenedor corriendo (docker ps)
- [ ] App accesible en https://onturn.app
- [ ] Notificaciones funcionando (test creando reserva)
- [ ] PWA instalable (verificar en móvil)
- [ ] Service Worker activo (DevTools → Application)
- [ ] Nginx headers PWA configurados
- [ ] Logs sin errores críticos

---

## 🎉 ¡Listo!

Tu app ahora tiene:
- ✅ Notificaciones push en tiempo real
- ✅ 3 PWAs instalables
- ✅ Cache inteligente offline-first
- ✅ Mejor rendimiento y UX

**URLs para verificar:**
- App: https://onturn.app
- Service Worker: https://onturn.app/sw.js
- Manifest Customer: https://onturn.app/manifest-customer.json
- Manifest Business: https://onturn.app/manifest-business.json
- Manifest Super Admin: https://onturn.app/manifest-superadmin.json

Cualquier problema, revisa logs: `docker logs -f onturn-app`
