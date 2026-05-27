#!/usr/bin/env bash
# =============================================================================
# PEDIACORE — Production deploy script for DigitalOcean Ubuntu 22.04/24.04
# =============================================================================
# Idempotent: safe to re-run for updates.
#
# Usage (first deploy):
#   scp infra/deploy.sh root@<droplet-ip>:/root/deploy.sh
#   ssh root@<droplet-ip> "bash /root/deploy.sh"
#
# Usage (update from server):
#   ssh ubuntu@estefipediatra.com "cd /opt/pediacore && bash infra/deploy.sh --update"
# =============================================================================

set -euo pipefail

# ----------------------------------------------------------------------------
# Configuration
# ----------------------------------------------------------------------------
REPO_URL="https://github.com/SilvanoPuccini/pediacore.git"
APP_DIR="/opt/pediacore"
DOMAIN="estefipediatra.com"
EMAIL="hola@estefipediatra.com"
UPDATE_MODE=false

if [[ "${1:-}" == "--update" ]]; then
    UPDATE_MODE=true
fi

# ----------------------------------------------------------------------------
# Colors
# ----------------------------------------------------------------------------
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ----------------------------------------------------------------------------
# Step 1: Install Docker (idempotent)
# ----------------------------------------------------------------------------
install_docker() {
    if command -v docker &>/dev/null; then
        info "Docker already installed: $(docker --version)"
        return 0
    fi

    info "Installing Docker..."
    apt-get update -qq
    apt-get install -y ca-certificates curl gnupg lsb-release

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
        | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list

    apt-get update -qq
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

    systemctl enable docker
    systemctl start docker
    info "Docker installed: $(docker --version)"
}

# ----------------------------------------------------------------------------
# Step 2: Clone or pull the repo
# ----------------------------------------------------------------------------
setup_repo() {
    if [[ "$UPDATE_MODE" == true ]]; then
        info "Pulling latest changes..."
        cd "$APP_DIR"
        git pull origin main
        return 0
    fi

    if [[ -d "$APP_DIR/.git" ]]; then
        info "Repo already cloned — pulling latest..."
        cd "$APP_DIR"
        git pull origin main
    else
        info "Cloning repo to $APP_DIR..."
        git clone "$REPO_URL" "$APP_DIR"
        cd "$APP_DIR"
    fi
}

# ----------------------------------------------------------------------------
# Step 3: Verify .env files exist
# ----------------------------------------------------------------------------
check_env_files() {
    if [[ ! -f "$APP_DIR/.env" ]]; then
        warn ".env not found at $APP_DIR/.env"
        warn "Copy .env.example to .env and fill in production values:"
        warn "  cp $APP_DIR/.env.example $APP_DIR/.env"
        warn "  nano $APP_DIR/.env"
        error "Aborting — .env is required"
    fi

    if [[ ! -f "$APP_DIR/backend/.env" ]]; then
        warn "backend/.env not found — copying from root .env"
        cp "$APP_DIR/.env" "$APP_DIR/backend/.env"
    fi

    info ".env files present"
}

# ----------------------------------------------------------------------------
# Step 4: Initial SSL setup (HTTP-only nginx + certbot)
# ----------------------------------------------------------------------------
ssl_init() {
    local cert_path="/etc/letsencrypt/live/$DOMAIN/fullchain.pem"
    if [[ -f "$cert_path" ]]; then
        info "SSL certificate already exists — skipping certbot init"
        return 0
    fi

    info "Starting initial SSL setup (HTTP-only nginx)..."
    cd "$APP_DIR"

    # Back up the real nginx.conf and use the HTTP-only init config
    cp infra/nginx/nginx.conf infra/nginx/nginx.conf.bak
    cp infra/nginx/nginx.init.conf infra/nginx/nginx.conf

    # Build nginx image (includes frontend build)
    docker compose -f docker-compose.prod.yml build nginx

    # Start postgres and backend (needed for ACME challenge to complete)
    docker compose -f docker-compose.prod.yml up -d postgres backend nginx

    info "Waiting for nginx to be ready..."
    sleep 5

    info "Running certbot to obtain SSL certificate..."
    docker compose -f docker-compose.prod.yml run --rm certbot \
        certonly --webroot \
        -w /var/lib/letsencrypt \
        -d "$DOMAIN" -d "www.$DOMAIN" \
        --email "$EMAIL" \
        --agree-tos --no-eff-email

    info "SSL certificate obtained — restoring production nginx config"
    mv infra/nginx/nginx.conf.bak infra/nginx/nginx.conf

    # Rebuild nginx with the production config
    docker compose -f docker-compose.prod.yml build nginx
    docker compose -f docker-compose.prod.yml restart nginx
}

# ----------------------------------------------------------------------------
# Step 5: Start all services
# ----------------------------------------------------------------------------
start_services() {
    info "Building and starting production containers..."
    cd "$APP_DIR"
    docker compose -f docker-compose.prod.yml build
    docker compose -f docker-compose.prod.yml up -d
}

# ----------------------------------------------------------------------------
# Step 6: Post-deploy tasks
# ----------------------------------------------------------------------------
post_deploy() {
    info "Running post-deploy tasks..."
    cd "$APP_DIR"

    # Migrations are run inside the backend container startup command,
    # but we also create the cache table here (idempotent)
    info "Creating cache table (if not exists)..."
    docker compose -f docker-compose.prod.yml exec backend \
        python manage.py createcachetable || warn "createcachetable failed — may already exist"

    info "Checking service health..."
    docker compose -f docker-compose.prod.yml ps
}

# ----------------------------------------------------------------------------
# Step 7: Superuser prompt (first deploy only)
# ----------------------------------------------------------------------------
maybe_create_superuser() {
    if [[ "$UPDATE_MODE" == true ]]; then
        return 0
    fi

    echo ""
    read -r -p "Create Django superuser now? [y/N] " CREATE_SU
    if [[ "$CREATE_SU" =~ ^[Yy]$ ]]; then
        docker compose -f docker-compose.prod.yml exec backend \
            python manage.py createsuperuser
    else
        info "Skipped. Run 'make prod-shell' then 'python manage.py createsuperuser' later."
    fi
}

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
main() {
    info "=== PEDIACORE deploy script ==="
    info "Mode: $([ "$UPDATE_MODE" == true ] && echo 'UPDATE' || echo 'INITIAL')"

    install_docker
    setup_repo
    check_env_files

    if [[ "$UPDATE_MODE" == false ]]; then
        ssl_init
    fi

    start_services
    post_deploy
    maybe_create_superuser

    echo ""
    info "=== Deploy complete ==="
    info "Site: https://$DOMAIN"
    info "Admin: https://$DOMAIN/admin/"
    info "Logs: docker compose -f docker-compose.prod.yml logs -f"
}

main "$@"
