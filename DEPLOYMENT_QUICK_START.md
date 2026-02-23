# 📝 Resumen de Configuración de Deployment

## ✅ Archivos Creados

### 1. GitHub Actions
- `.github/workflows/deploy.yml` - Workflow de CI/CD automático

### 2. Configuración Nginx
- `nginx/onturn.app.conf` - Configuración SSL, proxy, cache, PWA

### 3. Scripts de Deployment
- `scripts/vps-setup.sh` - Configuración inicial del VPS (Docker, Nginx, SSL)
- `scripts/deploy-manual.sh` - Deployment manual sin GitHub Actions

### 4. Configuración Docker
- `Dockerfile` - Actualizado con variables VAPID y PWA
- `docker-compose.yml` - Actualizado con red y variables completas

### 5. Documentación
- `DEPLOYMENT.md` - Guía completa de deployment paso a paso
- `.env.production` - Template de variables para producción

## 🚀 Pasos para Desplegar

### Opción A: Despliegue Rápido (Recomendado)

1. **Configura tu VPS:**
   ```bash
   ssh root@tu-vps-ip
   curl -sL https://raw.githubusercontent.com/tu-repo/main/scripts/vps-setup.sh | bash
   ```

2. **Configura GitHub Secrets** (Settings → Secrets → Actions):
   - `VPS_HOST` = tu-ip-del-vps
   - `VPS_USERNAME` = github-deploy
   - `VPS_SSH_KEY` = clave-privada-ssh
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
   - `VAPID_PRIVATE_KEY`

3. **Haz push a main:**
   ```bash
   git add .
   git commit -m "feat: configurar deployment"
   git push origin main
   ```

### Opción B: Despliegue Manual

1. **Conecta al VPS:**
   ```bash
   ssh root@tu-vps-ip
   ```

2. **Ejecuta setup:**
   ```bash
   cd /var/www/onturn-app
   ./scripts/vps-setup.sh
   ```

3. **Crea .env:**
   ```bash
   cp .env.production .env
   nano .env  # Edita con tus valores reales
   ```

4. **Deploy:**
   ```bash
   chmod +x scripts/deploy-manual.sh
   ./scripts/deploy-manual.sh
   ```

## 🌐 Configuración de Dominio

### DNS (en tu proveedor de dominio)

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| A | @ | IP_VPS | 3600 |
| A | www | IP_VPS | 3600 |

### SSL (en el VPS)

```bash
certbot --nginx -d onturn.app -d www.onturn.app
```

## ✅ Verificación

Después del deployment:

1. **App accesible:**
   ```
   https://onturn.app
   ```

2. **PWA instalable:**
   - Mobile: Debe aparecer banner "Instalar OnTurn"
   - Desktop: Chrome → ⋮ → "Instalar OnTurn"

3. **Push notifications:**
   - Crear una reserva → Debe llegar notificación

4. **Logs:**
   ```bash
   docker logs -f onturn-app
   ```

## 📊 GitHub Actions

Cada push a `main` automáticamente:
1. ✅ Ejecuta tests
2. ✅ Verifica variables
3. ✅ Deploy a VPS
4. ✅ Health check
5. ✅ Reporte de estado

Ver progreso en: **GitHub → Actions → Deploy to VPS**

## 🔧 Comandos Útiles

```bash
# Ver logs en tiempo real
docker logs -f onturn-app

# Reiniciar app
docker-compose restart

# Rebuild completo
docker-compose down
docker-compose up -d --build

# Ver estado
docker ps
docker stats onturn-app

# Logs de Nginx
tail -f /var/log/nginx/onturn.app.access.log
tail -f /var/log/nginx/onturn.app.error.log
```

## 📚 Documentación Completa

Lee **DEPLOYMENT.md** para:
- Guía paso a paso detallada
- Troubleshooting
- Optimizaciones
- Seguridad
- Monitoreo

## ⚠️ IMPORTANTE

Antes de deployar, asegúrate de:
- [ ] Tener un VPS activo (Ubuntu 20.04+)
- [ ] Dominio onturn.app apuntando al VPS
- [ ] Variables de entorno configuradas
- [ ] Iconos PWA generados (72-512px)
- [ ] GitHub Secrets configurados
- [ ] SQL de notificaciones ejecutado en Supabase

---

🎉 **¡Todo listo para deployment!**

Sigue la guía en DEPLOYMENT.md para el proceso completo.
