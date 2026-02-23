#!/bin/bash
# Script para actualizar OnTurn en el VPS
# Ejecutar: bash update-vps.sh

echo "🚀 Actualizando OnTurn en VPS..."
echo "================================"

# 1. Navegar al directorio
cd /var/www/onturn-app || { echo "❌ Error: Directorio no encontrado"; exit 1; }

echo "✅ Directorio: $(pwd)"

# 2. Verificar puerto configurado (NO MODIFICAR)
echo ""
echo "📋 Puerto configurado:"
grep PORT .env || echo "⚠️  Archivo .env no encontrado"

# 3. Hacer backup de imagen actual
echo ""
echo "💾 Creando backup de imagen Docker..."
docker tag onturn-app onturn-app:backup-$(date +%Y%m%d-%H%M%S)

# 4. Actualizar código desde Git
echo ""
echo "📥 Actualizando código desde Git..."
git pull origin main || { echo "❌ Error en git pull"; exit 1; }

# 5. Detener contenedores
echo ""
echo "🛑 Deteniendo contenedores..."
docker compose down

# 6. Reconstruir imagen
echo ""
echo "🔨 Reconstruyendo imagen Docker (esto puede tardar 2-5 minutos)..."
docker compose build --no-cache

# 7. Iniciar contenedores
echo ""
echo "▶️  Iniciando contenedores..."
docker compose up -d

# 8. Esperar 5 segundos
echo ""
echo "⏳ Esperando 5 segundos..."
sleep 5

# 9. Verificar estado
echo ""
echo "🔍 Estado de contenedores:"
docker compose ps

# 10. Ver logs
echo ""
echo "📝 Últimos 30 logs:"
docker compose logs --tail=30

echo ""
echo "================================"
echo "✅ Actualización completada!"
echo ""
echo "📊 Comandos útiles:"
echo "   docker compose logs -f          # Ver logs en tiempo real"
echo "   docker compose ps                # Ver estado"
echo "   docker compose restart           # Reiniciar"
echo ""
