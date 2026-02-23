#!/bin/bash
# Script de deployment manual para OnTurn
# Usar cuando necesites deployar sin GitHub Actions

set -e

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "Ejecuta este script desde la raíz del proyecto"
    exit 1
fi

print_info "🚀 Iniciando deployment manual de OnTurn..."

# 1. Pull latest changes
print_info "Obteniendo últimos cambios de Git..."
git pull origin main
print_success "Código actualizado"

# 2. Verificar archivo .env
if [ ! -f ".env" ]; then
    print_error "Archivo .env no encontrado"
    print_info "Crea un archivo .env con las siguientes variables:"
    cat env.example.txt
    exit 1
fi
print_success "Archivo .env encontrado"

# 3. Backup del .env
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
print_success "Backup de .env creado"

# 4. Stop containers
print_info "Deteniendo contenedores..."
docker-compose down
print_success "Contenedores detenidos"

# 5. Clean up old images
print_info "Limpiando imágenes antiguas..."
docker image prune -af
print_success "Imágenes antiguas eliminadas"

# 6. Build and start
print_info "Construyendo nueva imagen..."
docker-compose build --no-cache
print_success "Imagen construida"

print_info "Iniciando contenedores..."
docker-compose up -d
print_success "Contenedores iniciados"

# 7. Wait and check
print_info "Esperando que la aplicación esté lista..."
sleep 15

# Check container status
if [ "$(docker ps -q -f name=onturn-app)" ]; then
    print_success "Contenedor onturn-app está corriendo"
    
    # Show logs
    print_info "Últimos logs:"
    docker logs --tail 20 onturn-app
    
    # Health check
    print_info "Verificando salud de la aplicación..."
    sleep 5
    
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        print_success "✅ Aplicación respondiendo correctamente"
    else
        print_error "⚠️ Aplicación no responde en localhost:3000"
        docker logs onturn-app
    fi
else
    print_error "Contenedor no está corriendo"
    docker logs onturn-app
    exit 1
fi

print_success "==================================================="
print_success "DEPLOYMENT COMPLETADO EXITOSAMENTE"
print_success "==================================================="
print_info "Aplicación disponible en https://onturn.app"
print_info "Para ver logs en tiempo real: docker logs -f onturn-app"
