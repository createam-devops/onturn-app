#!/bin/bash
# Script para actualizar OnTurn en el VPS existente (72.62.138.112)
# Este script debe ejecutarse DENTRO del VPS

set -e  # Exit on error

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_step() { echo -e "${BLUE}🔹 $1${NC}"; }

echo ""
print_step "==================================================="
print_step "ACTUALIZACIÓN DE ONTURN - VPS 72.62.138.112"
print_step "==================================================="
echo ""

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "Ejecuta este script desde /var/www/onturn-app"
    exit 1
fi

# PASO 1: Backup del .env actual
print_step "PASO 1: Backup de archivo .env..."
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    print_success "Backup creado"
else
    print_error "No se encontró archivo .env"
    exit 1
fi

# PASO 2: Verificar variables VAPID
print_step "PASO 2: Verificando variables VAPID en .env..."
if grep -q "NEXT_PUBLIC_VAPID_PUBLIC_KEY" .env && grep -q "VAPID_PRIVATE_KEY" .env; then
    print_success "Variables VAPID ya configuradas"
else
    print_info "Agregando variables VAPID al .env..."
    cat >> .env << 'EOF'

# VAPID Keys para Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BIxlhQZEvRSKHNZXqber4yt80BgrXKleuP9LTgeGYAUGy4q5xJFy_gnCtLu5sR9NSuTghFm40OG5oVG2Y0TAWVU
VAPID_PRIVATE_KEY=fwln1X8k7JpLSz66cZtNFYHEb-C1AcsmN5NrAKpgffQ

# PWA Configuration
NEXT_PUBLIC_ENABLE_PWA=true
NEXT_PUBLIC_SITE_URL=https://onturn.app
EOF
    print_success "Variables VAPID agregadas"
fi

# PASO 3: Git pull
print_step "PASO 3: Obteniendo últimos cambios de Git..."
git fetch origin
BRANCH=$(git rev-parse --abbrev-ref HEAD)
print_info "Rama actual: $BRANCH"
git pull origin $BRANCH
print_success "Código actualizado"

# PASO 4: Detener contenedor
print_step "PASO 4: Deteniendo contenedor actual..."
docker-compose down
print_success "Contenedor detenido"

# PASO 5: Limpiar imágenes antiguas
print_step "PASO 5: Limpiando imágenes Docker antiguas..."
docker image prune -af > /dev/null 2>&1
print_success "Imágenes antiguas eliminadas"

# PASO 6: Rebuild
print_step "PASO 6: Reconstruyendo imagen Docker..."
docker-compose build --no-cache
print_success "Imagen reconstruida"

# PASO 7: Iniciar
print_step "PASO 7: Iniciando contenedor..."
docker-compose up -d
print_success "Contenedor iniciado"

# PASO 8: Esperar y verificar
print_step "PASO 8: Esperando que la aplicación esté lista..."
sleep 15

# Verificar que el contenedor está corriendo
if [ "$(docker ps -q -f name=onturn-app)" ]; then
    print_success "Contenedor onturn-app está corriendo"
    
    # Mostrar últimos logs
    print_info "Últimos logs del contenedor:"
    docker logs --tail 20 onturn-app
    
    echo ""
    
    # Health check local
    print_step "PASO 9: Verificando salud de la aplicación..."
    sleep 5
    
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "✅ Aplicación respondiendo en localhost:3000"
    else
        print_error "⚠️ Aplicación no responde en localhost:3000"
        print_info "Revisa los logs: docker logs onturn-app"
    fi
    
    # Test HTTPS
    if curl -f https://onturn.app > /dev/null 2>&1; then
        print_success "✅ Aplicación accesible en https://onturn.app"
    else
        print_error "⚠️ No se pudo acceder a https://onturn.app"
        print_info "Verifica configuración de Nginx"
    fi
    
else
    print_error "Contenedor no está corriendo"
    docker logs onturn-app
    exit 1
fi

echo ""
print_success "==================================================="
print_success "✅ ACTUALIZACIÓN COMPLETADA EXITOSAMENTE"
print_success "==================================================="
echo ""

print_info "Nuevas características disponibles:"
echo "  🔔 Notificaciones push en tiempo real"
echo "  📱 3 PWAs instalables (customer, business, super-admin)"
echo "  💾 Service Worker con cache offline"
echo "  🚀 Mejor rendimiento y UX"
echo ""

print_info "URLs para verificar:"
echo "  • App: https://onturn.app"
echo "  • Service Worker: https://onturn.app/sw.js"
echo "  • Manifest Customer: https://onturn.app/manifest-customer.json"
echo ""

print_info "Próximos pasos:"
echo "  1. Verificar notificaciones (crear una reserva)"
echo "  2. Instalar PWA en móvil (Chrome → Agregar a inicio)"
echo "  3. Generar iconos PWA (ver ACTUALIZAR_VPS.md)"
echo ""

print_info "Para ver logs en tiempo real:"
echo "  docker logs -f onturn-app"
echo ""

print_success "¡Disfruta las nuevas funcionalidades! 🎉"
