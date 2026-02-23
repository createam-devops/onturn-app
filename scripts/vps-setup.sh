#!/bin/bash
# Script de configuración inicial del VPS para OnTurn
# Ejecutar como root o con sudo

set -e  # Exit on error

echo "🚀 Configurando VPS para OnTurn..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con colores
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# Verificar que es root
if [ "$EUID" -ne 0 ]; then 
    print_error "Por favor ejecuta como root o con sudo"
    exit 1
fi

# Actualizar sistema
print_info "Actualizando sistema..."
apt update && apt upgrade -y
print_success "Sistema actualizado"

# Instalar dependencias básicas
print_info "Instalando dependencias..."
apt install -y curl git ufw fail2ban
print_success "Dependencias instaladas"

# Instalar Docker
if ! command -v docker &> /dev/null; then
    print_info "Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_success "Docker instalado"
else
    print_success "Docker ya está instalado"
fi

# Instalar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_info "Instalando Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose instalado"
else
    print_success "Docker Compose ya está instalado"
fi

# Instalar Nginx
if ! command -v nginx &> /dev/null; then
    print_info "Instalando Nginx..."
    apt install -y nginx
    systemctl enable nginx
    systemctl start nginx
    print_success "Nginx instalado"
else
    print_success "Nginx ya está instalado"
fi

# Instalar Certbot para SSL
if ! command -v certbot &> /dev/null; then
    print_info "Instalando Certbot..."
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot instalado"
else
    print_success "Certbot ya está instalado"
fi

# Configurar firewall
print_info "Configurando firewall..."
ufw --force disable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
print_success "Firewall configurado"

# Crear directorio del proyecto
print_info "Creando directorio del proyecto..."
mkdir -p /var/www/onturn-app
cd /var/www/onturn-app
print_success "Directorio creado"

# Configurar Git (si no existe el repo)
if [ ! -d ".git" ]; then
    print_info "Clona tu repositorio manualmente:"
    print_info "  cd /var/www/onturn-app"
    print_info "  git clone <tu-repo-url> ."
fi

# Crear estructura de logs
mkdir -p /var/log/onturn
chmod 755 /var/log/onturn
print_success "Estructura de logs creada"

# Configurar usuario para GitHub Actions
print_info "Configurando usuario para deployment..."
if ! id "github-deploy" &>/dev/null; then
    useradd -m -s /bin/bash github-deploy
    usermod -aG docker github-deploy
    print_success "Usuario github-deploy creado"
else
    print_success "Usuario github-deploy ya existe"
fi

# Crear directorio SSH para github-deploy
mkdir -p /home/github-deploy/.ssh
chmod 700 /home/github-deploy/.ssh
print_info "Para configurar SSH, añade tu clave pública en:"
print_info "  /home/github-deploy/.ssh/authorized_keys"

# Configurar permisos del proyecto
chown -R github-deploy:github-deploy /var/www/onturn-app
print_success "Permisos configurados"

# Mostrar resumen
echo ""
print_success "==================================================="
print_success "CONFIGURACIÓN INICIAL COMPLETADA"
print_success "==================================================="
echo ""
print_info "Próximos pasos:"
echo "1. Clona tu repositorio:"
echo "   cd /var/www/onturn-app"
echo "   git clone <tu-repo-url> ."
echo ""
echo "2. Copia la configuración de Nginx:"
echo "   cp nginx/onturn.app.conf /etc/nginx/sites-available/"
echo "   ln -s /etc/nginx/sites-available/onturn.app.conf /etc/nginx/sites-enabled/"
echo "   nginx -t"
echo "   systemctl reload nginx"
echo ""
echo "3. Obtén certificado SSL:"
echo "   certbot --nginx -d onturn.app -d www.onturn.app"
echo ""
echo "4. Configura las GitHub Secrets:"
echo "   - VPS_HOST: $(hostname -I | awk '{print $1}')"
echo "   - VPS_USERNAME: github-deploy"
echo "   - VPS_SSH_KEY: (genera con 'ssh-keygen -t ed25519')"
echo "   - VPS_PORT: 22"
echo "   - NEXT_PUBLIC_SUPABASE_URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "   - NEXT_PUBLIC_VAPID_PUBLIC_KEY"
echo "   - VAPID_PRIVATE_KEY"
echo ""
echo "5. Crea archivo .env en /var/www/onturn-app/"
echo ""
print_success "==================================================="
