# 🖥️ Comandos para Actualizar VPS

## 📝 Opción 1: Conexión SSH Manual (Recomendado)

### Paso 1: Conectar al VPS
```bash
ssh root@72.62.138.112
```
*(Te pedirá la contraseña)*

### Paso 2: Navegar al proyecto
```bash
cd /var/www/onturn-app
```

### Paso 3: Verificar puerto (NO modificar)
```bash
grep PORT .env
```

### Paso 4: Actualizar código
```bash
git pull origin main
```

### Paso 5: Rebuild Docker
```bash
# Detener
docker compose down

# Backup (opcional)
docker tag onturn-app onturn-app:backup-$(date +%Y%m%d-%H%M%S)

# Reconstruir
docker compose build --no-cache

# Iniciar
docker compose up -d
```

### Paso 6: Verificar
```bash
# Ver estado
docker compose ps

# Ver logs
docker compose logs --tail=30

# Logs en tiempo real
docker compose logs -f
```

---

## 📝 Opción 2: Script Automático

### En el VPS, crear el script:
```bash
ssh root@72.62.138.112
cd /var/www/onturn-app
nano update.sh
```

### Copiar este contenido:
```bash
#!/bin/bash
cd /var/www/onturn-app
echo "🚀 Actualizando..."
git pull origin main
docker compose down
docker compose build --no-cache
docker compose up -d
docker compose logs --tail=30
```

### Dar permisos y ejecutar:
```bash
chmod +x update.sh
./update.sh
```

---

## 📝 Opción 3: Comando SSH Único (desde Windows)

```powershell
ssh root@72.62.138.112 "cd /var/www/onturn-app && git pull origin main && docker compose down && docker compose build --no-cache && docker compose up -d && docker compose ps"
```

---

## ✅ Verificación Post-Update

```bash
# 1. Contenedor corriendo
docker compose ps
# Debe mostrar: Up

# 2. Sin errores en logs
docker compose logs --tail=50
# No debe haber errores críticos

# 3. Puerto correcto
docker compose port app 3000
# Debe mostrar el puerto asignado

# 4. Acceso web
curl http://localhost:3000
# Debe responder HTML
```

---

## 🐛 Si Hay Problemas

### Rollback a versión anterior
```bash
docker compose down
docker tag onturn-app:backup-FECHA onturn-app:latest
docker compose up -d
```

### Limpiar y reinstalar
```bash
docker compose down
docker system prune -a
git pull origin main
docker compose build --no-cache
docker compose up -d
```

### Ver logs detallados
```bash
docker compose logs -f
```

---

## 📊 Datos de Conexión

- **IP**: 72.62.138.112
- **Usuario**: root
- **Directorio**: /var/www/onturn-app
- **Puerto App**: Ver con `grep PORT .env`
- **Método**: Docker Compose

---

## ⚠️ Recordatorios

1. **NO modificar puerto** en `.env` o `docker-compose.yml`
2. **Verificar** que `.env` existe en el VPS
3. **Hacer backup** antes de cambios importantes
4. **Ver logs** después de cada deployment

---

**Última actualización**: Febrero 2026
