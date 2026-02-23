# 🔧 Configuración de GitHub Actions para OnTurn

Este proyecto usa GitHub Actions para deployment automático a VPS usando Docker Hub.

---

## 📋 Secretos Requeridos en GitHub

Ve a tu repositorio → **Settings → Secrets and variables → Actions → Repository secrets**

### Secretos de Docker Hub (ya configurados)
- ✅ `DOCKERHUB_USERNAME` - Tu usuario de Docker Hub
- ✅ `DOCKERHUB_TOKEN` - Token de acceso de Docker Hub

### Secretos del VPS (ya configurados)
- ✅ `VPS_HOST` - IP o dominio del VPS (72.62.138.112)
- ✅ `VPS_USERNAME` - Usuario SSH (probablemente `root`)
- ✅ `VPS_SSH_KEY` - Clave privada SSH para acceso al VPS
- ✅ `VPS_PORT` - Puerto SSH (22 por defecto, opcional)

### Secretos de OnTurn (nuevos - necesitas configurar)
- ⚠️ `NEXT_PUBLIC_SUPABASE_URL` - https://atxldtjknfbcwnnqxkov.supabase.co
- ⚠️ `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Tu Supabase anon key
- ⚠️ `NEXT_PUBLIC_VAPID_PUBLIC_KEY` - BIxlhQZEvRSKHNZXqber4yt80BgrXKleuP9LTgeGYAUGy4q5xJFy_gnCtLu5sR9NSuTghFm40OG5oVG2Y0TAWVU
- ⚠️ `VAPID_PRIVATE_KEY` - fwln1X8k7JpLSz66cZtNFYHEb-C1AcsmN5NrAKpgffQ

---

## 🚀 Flujo de Deployment

### Trigger
Cada vez que haces **push a `main`** o `production`:

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

### Proceso Automático

**Job 1: Build and Push** (4-6 minutos)
1. ✅ Checkout del código
2. ✅ Setup Docker Buildx
3. ✅ Login a Docker Hub
4. ✅ Build de la imagen Next.js
5. ✅ Push a Docker Hub con 2 tags:
   - `tu-usuario/onturn-app:latest`
   - `tu-usuario/onturn-app:[commit-sha]`
6. ✅ Cache de layers para builds rápidos

**Job 2: Deploy** (2-4 minutos)
1. ✅ SSH al VPS (72.62.138.112)
2. ✅ Pull del código (para configs)
3. ✅ Actualizar archivo `.env`
4. ✅ Login a Docker Hub desde VPS
5. ✅ Pull de la imagen desde Docker Hub
6. ✅ Stop contenedor anterior
7. ✅ Limpiar imágenes viejas
8. ✅ Start nuevo contenedor
9. ✅ Health check
10. ✅ Cleanup y logout

**Total: ~8-10 minutos**

---

## 🔍 Verificar Deployment

### En GitHub
1. Ve a tu repo → **Actions**
2. Verás el workflow "Deploy OnTurn to VPS"
3. Click para ver logs en tiempo real
4. Verde ✅ = éxito, Rojo ❌ = error

### En tu VPS
```bash
ssh root@72.62.138.112
docker ps  # Ver contenedor corriendo
docker logs -f onturn-app  # Ver logs en tiempo real
```

### En el navegador
- Abre https://onturn.app
- Debe cargar la última versión
- Verifica cambios recientes

---

## 🎨 Personalizar el Workflow

### Cambiar rama de deployment
Edita `.github/workflows/deploy.yml`:

```yaml
on:
  push:
    branches:
      - main       # Deployment automático
      - production # También en production
      - develop    # Agregar más ramas
```

### Deployment manual
Puedes disparar el workflow manualmente:
1. GitHub → Actions
2. "Deploy OnTurn to VPS"
3. Run workflow
4. Selecciona rama
5. Run

### Agregar notificaciones
Puedes agregar notificaciones a Slack/Discord/Email al final del workflow.

---

## 🐛 Troubleshooting

### Error: "Docker image not found"
**Problema:** GitHub Actions no puede pushear a Docker Hub

**Solución:**
```bash
# Verifica que DOCKERHUB_USERNAME y DOCKERHUB_TOKEN estén configurados
# El token debe tener permisos de read/write
```

### Error: "Permission denied (publickey)"
**Problema:** SSH al VPS falla

**Solución:**
```bash
# Verifica VPS_SSH_KEY
# Debe ser la clave PRIVADA completa incluyendo:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

### Error: "Container failed to start"
**Problema:** Contenedor no inicia en VPS

**Solución:**
```bash
# SSH al VPS
ssh root@72.62.138.112

# Ver logs
docker logs onturn-app

# Verificar .env
cat /var/www/onturn-app/.env

# Verificar imagen
docker images | grep onturn-app
```

### Error: "Health check failed"
**Problema:** App no responde después de deployment

**Solución:**
```bash
# En el VPS
docker logs -f onturn-app

# Busca errores de build o variables faltantes
# Verifica que puerto 3000 esté disponible
netstat -tuln | grep 3000
```

### Build muy lento
**Problema:** El build toma más de 10 minutos

**Solución:**
El workflow usa cache de Docker layers. El primer build será lento (~8-10 min), pero builds subsecuentes serán rápidos (~3-5 min).

---

## 📊 Optimizaciones

### Cache de Docker
El workflow usa cache avanzado:
```yaml
cache-from: type=registry,ref=${{ env.DOCKER_IMAGE }}:buildcache
cache-to: type=registry,ref=${{ env.DOCKER_IMAGE }}:buildcache,mode=max
```

Esto hace que builds subsecuentes sean 2-3x más rápidos.

### Limpieza automática
El VPS limpia imágenes antiguas automáticamente:
```bash
docker image prune -af --filter "until=24h"
```

Solo mantiene imágenes de las últimas 24 horas.

---

## 🎯 Próximos Pasos

### 1. Configurar secretos faltantes
En GitHub → Settings → Secrets → Actions:

```
NEXT_PUBLIC_SUPABASE_URL = https://atxldtjknfbcwnnqxkov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = [tu-anon-key]
NEXT_PUBLIC_VAPID_PUBLIC_KEY = BIxlhQZEvRSKHNZXqber4yt80BgrXKleuP9LTgeGYAUGy4q5xJFy_gnCtLu5sR9NSuTghFm40OG5oVG2Y0TAWVU
VAPID_PRIVATE_KEY = fwln1X8k7JpLSz66cZtNFYHEb-C1AcsmN5NrAKpgffQ
```

### 2. Primera prueba
```bash
# Hacer un cambio mínimo
echo "# Test deployment" >> README.md

# Commit y push
git add README.md
git commit -m "test: GitHub Actions deployment"
git push origin main

# Ver en GitHub → Actions
```

### 3. Verificar en producción
- Espera ~8-10 minutos
- Abre https://onturn.app
- Verifica que el deployment fue exitoso

---

## ✅ Checklist

Antes de hacer el primer deployment automático:

- [ ] `DOCKERHUB_USERNAME` configurado en GitHub Secrets
- [ ] `DOCKERHUB_TOKEN` configurado en GitHub Secrets
- [ ] `VPS_HOST` = 72.62.138.112
- [ ] `VPS_USERNAME` configurado (root o github-deploy)
- [ ] `VPS_SSH_KEY` configurado con clave privada completa
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurado
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configurado
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` configurado
- [ ] `VAPID_PRIVATE_KEY` configurado
- [ ] VPS tiene Docker y Docker Compose instalados
- [ ] VPS tiene el proyecto en `/var/www/onturn-app`
- [ ] VPS puede hacer pull de Docker Hub
- [ ] Nginx configurado y funcionando

---

## 🎉 ¡Listo!

Una vez configurados los secretos, cada push a `main` desplegará automáticamente a producción.

**Ventajas:**
- ✅ Zero-downtime deployment
- ✅ Rollback fácil (usando tags de commit)
- ✅ Historial completo en GitHub Actions
- ✅ Build cache para velocidad
- ✅ Health checks automáticos

**Monitoreo:**
- GitHub Actions para logs de deployment
- VPS logs: `docker logs -f onturn-app`
- App: https://onturn.app
