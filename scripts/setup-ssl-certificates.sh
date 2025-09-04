#!/bin/bash

# =============================================================================
# SSL Certificate Setup Script for Intel NUC Production Deployment
# =============================================================================
# This script sets up Let's Encrypt SSL certificates and security configuration
# for the AI Crypto Trading Agent dashboard
# =============================================================================

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRADING_AGENT_DIR="/opt/trading-agent"
SSL_DIR="${TRADING_AGENT_DIR}/ssl"
NGINX_AVAILABLE="/etc/nginx/sites-available"
NGINX_ENABLED="/etc/nginx/sites-enabled"
CERTBOT_DIR="/etc/letsencrypt"

# Default values (can be overridden by environment variables)
DOMAIN="${LETSENCRYPT_DOMAIN:-localhost}"
EMAIL="${LETSENCRYPT_EMAIL:-admin@localhost}"
ENABLE_LETSENCRYPT="${LETSENCRYPT_ENABLED:-false}"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Install required packages
install_dependencies() {
    log "Installing SSL and security dependencies..."
    
    apt-get update
    apt-get install -y \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        openssl \
        curl \
        wget
    
    success "Dependencies installed successfully"
}

# Create SSL directory structure
create_ssl_directories() {
    log "Creating SSL directory structure..."
    
    mkdir -p "${SSL_DIR}"
    mkdir -p "${SSL_DIR}/certs"
    mkdir -p "${SSL_DIR}/private"
    mkdir -p "${SSL_DIR}/dhparam"
    
    # Set proper permissions
    chmod 755 "${SSL_DIR}"
    chmod 700 "${SSL_DIR}/private"
    chmod 755 "${SSL_DIR}/certs"
    
    success "SSL directories created"
}

# Generate self-signed certificate for development/local use
generate_self_signed_certificate() {
    log "Generating self-signed SSL certificate..."
    
    local cert_file="${SSL_DIR}/certs/selfsigned.crt"
    local key_file="${SSL_DIR}/private/selfsigned.key"
    
    # Generate private key
    openssl genrsa -out "${key_file}" 2048
    
    # Generate certificate
    openssl req -new -x509 -key "${key_file}" -out "${cert_file}" -days 365 -subj "/C=US/ST=State/L=City/O=Organization/CN=${DOMAIN}"
    
    # Set permissions
    chmod 600 "${key_file}"
    chmod 644 "${cert_file}"
    
    success "Self-signed certificate generated"
    log "Certificate: ${cert_file}"
    log "Private key: ${key_file}"
}

# Generate DH parameters for enhanced security
generate_dhparam() {
    log "Generating DH parameters (this may take a while)..."
    
    local dhparam_file="${SSL_DIR}/dhparam/dhparam.pem"
    
    if [[ ! -f "${dhparam_file}" ]]; then
        openssl dhparam -out "${dhparam_file}" 2048
        chmod 644 "${dhparam_file}"
        success "DH parameters generated"
    else
        log "DH parameters already exist, skipping..."
    fi
}

# Setup Let's Encrypt certificate
setup_letsencrypt() {
    if [[ "${ENABLE_LETSENCRYPT}" != "true" ]]; then
        warning "Let's Encrypt disabled, skipping..."
        return 0
    fi
    
    if [[ "${DOMAIN}" == "localhost" ]] || [[ "${EMAIL}" == "admin@localhost" ]]; then
        warning "Let's Encrypt requires valid domain and email, skipping..."
        return 0
    fi
    
    log "Setting up Let's Encrypt certificate for domain: ${DOMAIN}"
    
    # Stop nginx temporarily
    systemctl stop nginx 2>/dev/null || true
    
    # Obtain certificate
    certbot certonly \
        --standalone \
        --non-interactive \
        --agree-tos \
        --email "${EMAIL}" \
        -d "${DOMAIN}"
    
    if [[ $? -eq 0 ]]; then
        success "Let's Encrypt certificate obtained successfully"
        
        # Create symlinks for easier access
        ln -sf "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${SSL_DIR}/certs/letsencrypt.crt"
        ln -sf "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${SSL_DIR}/private/letsencrypt.key"
        
        # Setup auto-renewal
        setup_certificate_renewal
    else
        error "Failed to obtain Let's Encrypt certificate"
        return 1
    fi
}

# Setup automatic certificate renewal
setup_certificate_renewal() {
    log "Setting up automatic certificate renewal..."
    
    # Create renewal script
    cat > /etc/cron.daily/certbot-renewal << 'EOF'
#!/bin/bash
# Automatic SSL certificate renewal script

/usr/bin/certbot renew --quiet --no-self-upgrade

# Reload nginx if certificates were renewed
if [[ $? -eq 0 ]]; then
    systemctl reload nginx
fi
EOF
    
    chmod +x /etc/cron.daily/certbot-renewal
    
    # Test renewal (dry run)
    certbot renew --dry-run
    
    success "Automatic certificate renewal configured"
}

# Create nginx configuration for trading agent
create_nginx_config() {
    log "Creating nginx configuration..."
    
    local config_file="${NGINX_AVAILABLE}/trading-agent"
    
    # Determine which certificate to use
    local cert_file="${SSL_DIR}/certs/selfsigned.crt"
    local key_file="${SSL_DIR}/private/selfsigned.key"
    
    if [[ -f "${SSL_DIR}/certs/letsencrypt.crt" ]]; then
        cert_file="${SSL_DIR}/certs/letsencrypt.crt"
        key_file="${SSL_DIR}/private/letsencrypt.key"
    fi
    
    cat > "${config_file}" << EOF
# AI Crypto Trading Agent - Nginx Configuration
# Optimized for Intel NUC deployment with SSL/TLS security

# Rate limiting zones
limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=dashboard:10m rate=30r/s;

# Upstream servers
upstream trading_api {
    server 127.0.0.1:3001;
    keepalive 32;
}

upstream trading_dashboard {
    server 127.0.0.1:3000;
    keepalive 32;
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name ${DOMAIN} _;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Redirect all HTTP traffic to HTTPS
    return 301 https://\$server_name\$request_uri;
}

# HTTPS server for dashboard
server {
    listen 443 ssl http2;
    server_name ${DOMAIN} _;
    
    # SSL Configuration
    ssl_certificate ${cert_file};
    ssl_certificate_key ${key_file};
    ssl_dhparam ${SSL_DIR}/dhparam/dhparam.pem;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-CHACHA20-POLY1305;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;
    
    # OCSP Stapling
    ssl_stapling on;
    ssl_stapling_verify on;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' ws: wss:;" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Dashboard location
    location / {
        limit_req zone=dashboard burst=50 nodelay;
        
        proxy_pass http://trading_dashboard;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API location
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        
        proxy_pass http://trading_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
    
    # WebSocket support for real-time updates
    location /socket.io/ {
        proxy_pass http://trading_dashboard;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
    
    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|log|conf)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}
EOF
    
    # Enable the site
    ln -sf "${config_file}" "${NGINX_ENABLED}/"
    
    # Remove default nginx site
    rm -f "${NGINX_ENABLED}/default"
    
    success "Nginx configuration created and enabled"
}

# Configure firewall (UFW)
configure_firewall() {
    log "Configuring firewall (UFW)..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (be careful not to lock yourself out)
    ufw allow ssh
    
    # Allow HTTP and HTTPS
    ufw allow 80/tcp
    ufw allow 443/tcp
    
    # Allow local network access to dashboard (adjust as needed)
    ufw allow from 192.168.0.0/16 to any port 3000
    ufw allow from 10.0.0.0/8 to any port 3000
    ufw allow from 172.16.0.0/12 to any port 3000
    
    # Enable UFW
    ufw --force enable
    
    success "Firewall configured and enabled"
}

# Configure Fail2Ban for additional security
configure_fail2ban() {
    log "Configuring Fail2Ban..."
    
    # Create custom jail for nginx
    cat > /etc/fail2ban/jail.d/nginx.conf << 'EOF'
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 6

[nginx-badbots]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2

[nginx-noproxy]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF
    
    # Create custom jail for SSH
    cat > /etc/fail2ban/jail.d/sshd.conf << 'EOF'
[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 3600
findtime = 600
EOF
    
    # Restart fail2ban
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    success "Fail2Ban configured and enabled"
}

# Test nginx configuration
test_nginx_config() {
    log "Testing nginx configuration..."
    
    nginx -t
    
    if [[ $? -eq 0 ]]; then
        success "Nginx configuration is valid"
        return 0
    else
        error "Nginx configuration test failed"
        return 1
    fi
}

# Start and enable services
start_services() {
    log "Starting and enabling services..."
    
    # Start and enable nginx
    systemctl start nginx
    systemctl enable nginx
    
    # Start and enable fail2ban
    systemctl start fail2ban
    systemctl enable fail2ban
    
    success "Services started and enabled"
}

# Create SSL certificate monitoring script
create_ssl_monitoring() {
    log "Creating SSL certificate monitoring script..."
    
    cat > "${TRADING_AGENT_DIR}/scripts/ssl-monitor.sh" << 'EOF'
#!/bin/bash
# SSL Certificate Monitoring Script

SSL_DIR="/opt/trading-agent/ssl"
CERT_FILE="${SSL_DIR}/certs/letsencrypt.crt"

# If Let's Encrypt cert doesn't exist, check self-signed
if [[ ! -f "${CERT_FILE}" ]]; then
    CERT_FILE="${SSL_DIR}/certs/selfsigned.crt"
fi

if [[ -f "${CERT_FILE}" ]]; then
    # Check certificate expiration
    EXPIRY_DATE=$(openssl x509 -in "${CERT_FILE}" -noout -enddate | cut -d= -f2)
    EXPIRY_TIMESTAMP=$(date -d "${EXPIRY_DATE}" +%s)
    CURRENT_TIMESTAMP=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
    
    echo "SSL Certificate Status:"
    echo "  Certificate: ${CERT_FILE}"
    echo "  Expires: ${EXPIRY_DATE}"
    echo "  Days until expiry: ${DAYS_UNTIL_EXPIRY}"
    
    if [[ ${DAYS_UNTIL_EXPIRY} -lt 30 ]]; then
        echo "  ⚠️  WARNING: Certificate expires in less than 30 days!"
    elif [[ ${DAYS_UNTIL_EXPIRY} -lt 7 ]]; then
        echo "  ❌ CRITICAL: Certificate expires in less than 7 days!"
    else
        echo "  ✅ Certificate is valid"
    fi
else
    echo "❌ No SSL certificate found!"
fi
EOF
    
    chmod +x "${TRADING_AGENT_DIR}/scripts/ssl-monitor.sh"
    
    success "SSL monitoring script created"
}

# Display security information
display_security_info() {
    log "Security Configuration Summary:"
    echo ""
    echo "🔒 SSL/TLS Configuration:"
    echo "   - SSL Directory: ${SSL_DIR}"
    echo "   - Nginx Config: ${NGINX_AVAILABLE}/trading-agent"
    echo "   - Let's Encrypt: ${ENABLE_LETSENCRYPT}"
    echo "   - Domain: ${DOMAIN}"
    echo ""
    echo "🛡️  Security Features:"
    echo "   - UFW Firewall: Enabled"
    echo "   - Fail2Ban: Enabled"
    echo "   - HTTPS Redirect: Enabled"
    echo "   - Security Headers: Enabled"
    echo "   - Rate Limiting: Enabled"
    echo ""
    echo "📊 Service Status:"
    systemctl is-active nginx && echo "   - Nginx: Active" || echo "   - Nginx: Inactive"
    systemctl is-active fail2ban && echo "   - Fail2Ban: Active" || echo "   - Fail2Ban: Inactive"
    systemctl is-active ufw && echo "   - UFW: Active" || echo "   - UFW: Inactive"
    echo ""
    echo "🔍 Next Steps:"
    echo "   1. Update DNS records to point to this server (if using domain)"
    echo "   2. Test HTTPS access: https://${DOMAIN}"
    echo "   3. Monitor SSL certificate expiration"
    echo "   4. Review firewall rules and adjust as needed"
    echo ""
}

# Main execution
main() {
    log "Starting SSL Certificate and Security Configuration Setup..."
    
    check_root
    install_dependencies
    create_ssl_directories
    generate_dhparam
    generate_self_signed_certificate
    
    # Setup Let's Encrypt if enabled and configured
    if [[ "${ENABLE_LETSENCRYPT}" == "true" ]]; then
        setup_letsencrypt
    fi
    
    create_nginx_config
    configure_firewall
    configure_fail2ban
    create_ssl_monitoring
    
    if test_nginx_config; then
        start_services
        display_security_info
        success "SSL Certificate and Security Configuration completed successfully!"
    else
        error "Configuration failed. Please check the logs and try again."
        exit 1
    fi
}

# Run main function
main "$@"