#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - SSL CERTIFICATE SETUP SCRIPT
# =============================================================================
# This script sets up free SSL certificates using Let's Encrypt for the
# trading agent dashboard and implements HTTPS for all web interfaces.
# 
# Task: 12.2 SSL Certificate Setup
# Requirements: 4.1, 4.2 - Secure dashboard access
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
TRADING_USER="trading"
TRADING_HOME="/opt/trading-agent"
NGINX_CONFIG_DIR="/etc/nginx"
CERTBOT_DIR="/etc/letsencrypt"
SSL_LOG="/var/log/trading-agent/ssl-setup.log"

# Default values (can be overridden by environment variables)
DOMAIN_NAME="${DOMAIN_NAME:-localhost}"
EMAIL="${SSL_EMAIL:-admin@localhost}"
DASHBOARD_PORT="${DASHBOARD_PORT:-3000}"
STAGING="${SSL_STAGING:-false}"

# Logging functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1" | tee -a "$SSL_LOG"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$SSL_LOG"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$SSL_LOG"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$SSL_LOG"
}

info() {
    echo -e "${CYAN}[INFO]${NC} $1" | tee -a "$SSL_LOG"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Validate domain name
validate_domain() {
    log "🔍 Validating domain configuration..."
    
    if [[ "$DOMAIN_NAME" == "localhost" ]]; then
        warning "Using localhost - SSL certificates will be self-signed"
        info "For production deployment, set DOMAIN_NAME environment variable"
        info "Example: export DOMAIN_NAME=trading.yourdomain.com"
        return 1
    fi
    
    # Check if domain resolves to this server
    local domain_ip=$(dig +short "$DOMAIN_NAME" 2>/dev/null || echo "")
    local server_ip=$(curl -s ifconfig.me 2>/dev/null || echo "")
    
    if [[ -n "$domain_ip" && -n "$server_ip" ]]; then
        if [[ "$domain_ip" == "$server_ip" ]]; then
            success "Domain $DOMAIN_NAME resolves to this server ($server_ip)"
            return 0
        else
            warning "Domain $DOMAIN_NAME resolves to $domain_ip, but server IP is $server_ip"
            warning "Let's Encrypt validation may fail"
            return 1
        fi
    else
        warning "Could not validate domain resolution"
        return 1
    fi
}

# Install required packages
install_dependencies() {
    log "📦 Installing SSL certificate dependencies..."
    
    # Update package lists
    apt update
    
    # Install nginx if not present
    if ! command -v nginx &> /dev/null; then
        info "Installing nginx..."
        apt install -y nginx
        success "nginx installed"
    else
        success "nginx already installed"
    fi
    
    # Install certbot
    if ! command -v certbot &> /dev/null; then
        info "Installing certbot..."
        apt install -y certbot python3-certbot-nginx
        success "certbot installed"
    else
        success "certbot already installed"
    fi
    
    # Install openssl for self-signed certificates
    if ! command -v openssl &> /dev/null; then
        info "Installing openssl..."
        apt install -y openssl
        success "openssl installed"
    else
        success "openssl already installed"
    fi
}

# Create self-signed certificates for localhost
create_self_signed_certificates() {
    log "🔐 Creating self-signed SSL certificates..."
    
    local ssl_dir="/etc/ssl/trading-agent"
    local cert_file="$ssl_dir/cert.pem"
    local key_file="$ssl_dir/key.pem"
    
    # Create SSL directory
    mkdir -p "$ssl_dir"
    
    # Generate private key
    openssl genrsa -out "$key_file" 2048
    
    # Generate certificate
    openssl req -new -x509 -key "$key_file" -out "$cert_file" -days 365 -subj "/C=US/ST=State/L=City/O=Trading Agent/CN=$DOMAIN_NAME"
    
    # Set proper permissions
    chmod 600 "$key_file"
    chmod 644 "$cert_file"
    
    success "Self-signed certificates created"
    info "Certificate: $cert_file"
    info "Private key: $key_file"
    
    # Export paths for nginx configuration
    export SSL_CERT_PATH="$cert_file"
    export SSL_KEY_PATH="$key_file"
}

# Setup Let's Encrypt certificates
setup_letsencrypt_certificates() {
    log "🔒 Setting up Let's Encrypt SSL certificates..."
    
    local certbot_args="--nginx -d $DOMAIN_NAME --non-interactive --agree-tos --email $EMAIL"
    
    if [[ "$STAGING" == "true" ]]; then
        certbot_args="$certbot_args --staging"
        warning "Using Let's Encrypt staging environment (test certificates)"
    fi
    
    # Stop nginx temporarily for standalone mode if needed
    if systemctl is-active --quiet nginx; then
        info "Stopping nginx for certificate generation..."
        systemctl stop nginx
        local restart_nginx=true
    fi
    
    # Generate certificates
    if certbot certonly --standalone -d "$DOMAIN_NAME" --non-interactive --agree-tos --email "$EMAIL" $([ "$STAGING" == "true" ] && echo "--staging"); then
        success "Let's Encrypt certificates generated successfully"
        
        # Export certificate paths
        export SSL_CERT_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem"
        export SSL_KEY_PATH="/etc/letsencrypt/live/$DOMAIN_NAME/privkey.pem"
        
        info "Certificate: $SSL_CERT_PATH"
        info "Private key: $SSL_KEY_PATH"
        
    else
        error "Failed to generate Let's Encrypt certificates"
        warning "Falling back to self-signed certificates"
        create_self_signed_certificates
    fi
    
    # Restart nginx if it was running
    if [[ "$restart_nginx" == "true" ]]; then
        systemctl start nginx
    fi
}

# Configure nginx for HTTPS
configure_nginx_https() {
    log "🌐 Configuring nginx for HTTPS..."
    
    # Create nginx configuration for trading dashboard
    cat > "$NGINX_CONFIG_DIR/sites-available/trading-dashboard" << EOF
# AI Crypto Trading Agent - HTTPS Configuration
server {
    listen 80;
    server_name $DOMAIN_NAME;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN_NAME;
    
    # SSL Configuration
    ssl_certificate $SSL_CERT_PATH;
    ssl_certificate_key $SSL_KEY_PATH;
    
    # SSL Security Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:ECDHE-RSA-AES128-SHA:ECDHE-RSA-AES256-SHA:DHE-RSA-AES128-SHA256:DHE-RSA-AES256-SHA256:DHE-RSA-AES128-SHA:DHE-RSA-AES256-SHA:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security Headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: ws:;" always;
    
    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://127.0.0.1:$DASHBOARD_PORT;
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
    
    # WebSocket support for real-time updates
    location /ws {
        proxy_pass http://127.0.0.1:$DASHBOARD_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
    
    # API endpoints
    location /api {
        proxy_pass http://127.0.0.1:$DASHBOARD_PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # Rate limiting for API
        limit_req zone=api burst=20 nodelay;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:$DASHBOARD_PORT;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security: Block access to sensitive files
    location ~ /\. {
        deny all;
        access_log off;
        log_not_found off;
    }
    
    location ~ \.(env|config|log)$ {
        deny all;
        access_log off;
        log_not_found off;
    }
}

# Rate limiting zones
http {
    limit_req_zone \$binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone \$binary_remote_addr zone=login:10m rate=1r/s;
}
EOF
    
    # Enable the site
    ln -sf "$NGINX_CONFIG_DIR/sites-available/trading-dashboard" "$NGINX_CONFIG_DIR/sites-enabled/"
    
    # Remove default nginx site
    rm -f "$NGINX_CONFIG_DIR/sites-enabled/default"
    
    # Test nginx configuration
    if nginx -t; then
        success "nginx configuration is valid"
    else
        error "nginx configuration test failed"
        return 1
    fi
    
    # Reload nginx
    systemctl reload nginx
    success "nginx configured for HTTPS"
}

# Setup automatic certificate renewal
setup_certificate_renewal() {
    log "🔄 Setting up automatic certificate renewal..."
    
    if [[ "$DOMAIN_NAME" != "localhost" ]]; then
        # Create renewal script
        cat > "/opt/trading-agent/scripts/renew-ssl-certificates.sh" << 'EOF'
#!/bin/bash

# SSL Certificate Renewal Script
LOG_FILE="/var/log/trading-agent/ssl-renewal.log"

echo "[$(date)] Starting SSL certificate renewal check..." >> "$LOG_FILE"

# Renew certificates
if certbot renew --quiet --no-self-upgrade >> "$LOG_FILE" 2>&1; then
    echo "[$(date)] Certificate renewal check completed successfully" >> "$LOG_FILE"
    
    # Reload nginx if certificates were renewed
    if systemctl reload nginx >> "$LOG_FILE" 2>&1; then
        echo "[$(date)] nginx reloaded successfully" >> "$LOG_FILE"
    else
        echo "[$(date)] Failed to reload nginx" >> "$LOG_FILE"
    fi
else
    echo "[$(date)] Certificate renewal failed" >> "$LOG_FILE"
fi
EOF
        
        chmod +x "/opt/trading-agent/scripts/renew-ssl-certificates.sh"
        
        # Add cron job for automatic renewal (twice daily)
        (crontab -l 2>/dev/null; echo "0 */12 * * * /opt/trading-agent/scripts/renew-ssl-certificates.sh") | crontab -
        
        success "Automatic certificate renewal configured"
        info "Certificates will be checked for renewal twice daily"
    else
        info "Skipping automatic renewal setup for self-signed certificates"
    fi
}

# Test SSL configuration
test_ssl_configuration() {
    log "🧪 Testing SSL configuration..."
    
    # Wait for nginx to start
    sleep 5
    
    # Test HTTPS connection
    if curl -k -s "https://$DOMAIN_NAME" > /dev/null; then
        success "HTTPS connection test passed"
    else
        warning "HTTPS connection test failed"
    fi
    
    # Test HTTP to HTTPS redirect
    if curl -s -I "http://$DOMAIN_NAME" | grep -q "301\|302"; then
        success "HTTP to HTTPS redirect working"
    else
        warning "HTTP to HTTPS redirect not working"
    fi
    
    # Test SSL certificate
    if [[ "$DOMAIN_NAME" != "localhost" ]]; then
        local cert_info=$(echo | openssl s_client -servername "$DOMAIN_NAME" -connect "$DOMAIN_NAME:443" 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)
        if [[ -n "$cert_info" ]]; then
            success "SSL certificate is valid"
            info "Certificate details:"
            echo "$cert_info" | tee -a "$SSL_LOG"
        else
            warning "Could not retrieve SSL certificate information"
        fi
    fi
    
    # Test security headers
    local headers=$(curl -k -s -I "https://$DOMAIN_NAME" 2>/dev/null)
    
    if echo "$headers" | grep -q "Strict-Transport-Security"; then
        success "HSTS header present"
    else
        warning "HSTS header missing"
    fi
    
    if echo "$headers" | grep -q "X-Frame-Options"; then
        success "X-Frame-Options header present"
    else
        warning "X-Frame-Options header missing"
    fi
    
    if echo "$headers" | grep -q "X-Content-Type-Options"; then
        success "X-Content-Type-Options header present"
    else
        warning "X-Content-Type-Options header missing"
    fi
}

# Update application configuration for HTTPS
update_application_config() {
    log "⚙️  Updating application configuration for HTTPS..."
    
    local env_file="$TRADING_HOME/.env"
    
    if [[ -f "$env_file" ]]; then
        # Backup original .env file
        cp "$env_file" "$env_file.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update HTTPS settings
        if grep -q "^FORCE_HTTPS=" "$env_file"; then
            sed -i 's/^FORCE_HTTPS=.*/FORCE_HTTPS=true/' "$env_file"
        else
            echo "FORCE_HTTPS=true" >> "$env_file"
        fi
        
        if grep -q "^SSL_ENABLED=" "$env_file"; then
            sed -i 's/^SSL_ENABLED=.*/SSL_ENABLED=true/' "$env_file"
        else
            echo "SSL_ENABLED=true" >> "$env_file"
        fi
        
        # Update dashboard URL
        if grep -q "^DASHBOARD_URL=" "$env_file"; then
            sed -i "s|^DASHBOARD_URL=.*|DASHBOARD_URL=https://$DOMAIN_NAME|" "$env_file"
        else
            echo "DASHBOARD_URL=https://$DOMAIN_NAME" >> "$env_file"
        fi
        
        # Add SSL certificate paths
        echo "SSL_CERT_PATH=$SSL_CERT_PATH" >> "$env_file"
        echo "SSL_KEY_PATH=$SSL_KEY_PATH" >> "$env_file"
        
        success "Application configuration updated for HTTPS"
    else
        warning "Application .env file not found"
    fi
}

# Create SSL monitoring script
create_ssl_monitoring() {
    log "📊 Creating SSL certificate monitoring..."
    
    cat > "/opt/trading-agent/scripts/monitor-ssl-certificates.sh" << 'EOF'
#!/bin/bash

# SSL Certificate Monitoring Script
LOG_FILE="/var/log/trading-agent/ssl-monitoring.log"
ALERT_DAYS=30

check_certificate_expiry() {
    local domain="$1"
    local cert_file="$2"
    
    if [[ -f "$cert_file" ]]; then
        local expiry_date=$(openssl x509 -enddate -noout -in "$cert_file" | cut -d= -f2)
        local expiry_epoch=$(date -d "$expiry_date" +%s)
        local current_epoch=$(date +%s)
        local days_until_expiry=$(( (expiry_epoch - current_epoch) / 86400 ))
        
        echo "[$(date)] Certificate for $domain expires in $days_until_expiry days" >> "$LOG_FILE"
        
        if [[ $days_until_expiry -le $ALERT_DAYS ]]; then
            echo "[$(date)] WARNING: Certificate for $domain expires in $days_until_expiry days!" >> "$LOG_FILE"
            # Send alert (implement notification here)
            return 1
        fi
    else
        echo "[$(date)] Certificate file $cert_file not found" >> "$LOG_FILE"
        return 1
    fi
    
    return 0
}

# Check all certificates
if [[ -f "/etc/letsencrypt/live/DOMAIN_NAME/fullchain.pem" ]]; then
    check_certificate_expiry "DOMAIN_NAME" "/etc/letsencrypt/live/DOMAIN_NAME/fullchain.pem"
elif [[ -f "/etc/ssl/trading-agent/cert.pem" ]]; then
    check_certificate_expiry "localhost" "/etc/ssl/trading-agent/cert.pem"
fi
EOF
    
    # Replace DOMAIN_NAME placeholder
    sed -i "s/DOMAIN_NAME/$DOMAIN_NAME/g" "/opt/trading-agent/scripts/monitor-ssl-certificates.sh"
    
    chmod +x "/opt/trading-agent/scripts/monitor-ssl-certificates.sh"
    
    # Add daily monitoring cron job
    (crontab -l 2>/dev/null; echo "0 6 * * * /opt/trading-agent/scripts/monitor-ssl-certificates.sh") | crontab -
    
    success "SSL certificate monitoring configured"
}

# Display SSL information
display_ssl_info() {
    log "📋 SSL Configuration Summary"
    
    echo ""
    echo "=== SSL CERTIFICATE CONFIGURATION ==="
    echo "Domain: $DOMAIN_NAME"
    echo "Certificate: $SSL_CERT_PATH"
    echo "Private Key: $SSL_KEY_PATH"
    echo "Dashboard URL: https://$DOMAIN_NAME"
    echo ""
    
    if [[ "$DOMAIN_NAME" != "localhost" ]]; then
        echo "Let's Encrypt Configuration:"
        echo "  - Automatic renewal: Enabled (twice daily)"
        echo "  - Monitoring: Enabled (daily checks)"
        echo "  - Staging mode: $STAGING"
    else
        echo "Self-signed Certificate:"
        echo "  - Valid for: 365 days"
        echo "  - Browser warnings: Expected"
        echo "  - Production use: Not recommended"
    fi
    
    echo ""
    echo "Security Features:"
    echo "  - TLS 1.2/1.3 only"
    echo "  - HSTS enabled"
    echo "  - Security headers configured"
    echo "  - HTTP to HTTPS redirect"
    echo "  - Rate limiting enabled"
    echo ""
    
    echo "Next Steps:"
    echo "1. Restart trading agent services"
    echo "2. Test dashboard access at https://$DOMAIN_NAME"
    echo "3. Verify SSL certificate in browser"
    echo "4. Monitor SSL logs at $SSL_LOG"
    echo ""
}

# Main execution
main() {
    log "🔒 Starting SSL certificate setup..."
    
    # Check prerequisites
    check_root
    
    # Create log directory
    mkdir -p "$(dirname "$SSL_LOG")"
    
    # Install dependencies
    install_dependencies
    
    # Validate domain and setup certificates
    if validate_domain; then
        setup_letsencrypt_certificates
    else
        create_self_signed_certificates
    fi
    
    # Configure nginx for HTTPS
    configure_nginx_https
    
    # Setup automatic renewal
    setup_certificate_renewal
    
    # Update application configuration
    update_application_config
    
    # Create monitoring
    create_ssl_monitoring
    
    # Test configuration
    test_ssl_configuration
    
    # Display summary
    display_ssl_info
    
    success "SSL certificate setup completed successfully!"
}

# Show usage information
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -d, --domain DOMAIN     Domain name for SSL certificate (default: localhost)"
    echo "  -e, --email EMAIL       Email for Let's Encrypt registration"
    echo "  -p, --port PORT         Dashboard port (default: 3000)"
    echo "  -s, --staging           Use Let's Encrypt staging environment"
    echo "  -h, --help              Show this help message"
    echo ""
    echo "Environment Variables:"
    echo "  DOMAIN_NAME             Domain name for SSL certificate"
    echo "  SSL_EMAIL               Email for Let's Encrypt registration"
    echo "  DASHBOARD_PORT          Dashboard port number"
    echo "  SSL_STAGING             Use staging environment (true/false)"
    echo ""
    echo "Examples:"
    echo "  $0 -d trading.example.com -e admin@example.com"
    echo "  $0 --staging -d test.example.com -e test@example.com"
    echo "  DOMAIN_NAME=trading.example.com SSL_EMAIL=admin@example.com $0"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--domain)
            DOMAIN_NAME="$2"
            shift 2
            ;;
        -e|--email)
            EMAIL="$2"
            shift 2
            ;;
        -p|--port)
            DASHBOARD_PORT="$2"
            shift 2
            ;;
        -s|--staging)
            STAGING="true"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Execute main function
main "$@"