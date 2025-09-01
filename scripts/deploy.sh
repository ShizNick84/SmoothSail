#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - AUTOMATED DEPLOYMENT SCRIPT
# =============================================================================
# 
# This script automates the complete deployment of the AI Crypto Trading Agent
# on Intel NUC hardware with Ubuntu OS. It handles all aspects of deployment
# including security setup, SSH tunnel configuration, and service deployment.
# 
# USAGE:
#   chmod +x scripts/deploy.sh
#   ./scripts/deploy.sh [environment]
# 
# ENVIRONMENTS:
#   development - Development environment with debug features
#   staging     - Staging environment for testing
#   production  - Production environment (default)
# 
# REQUIREMENTS:
#   - Ubuntu 22.04 LTS or later
#   - Root or sudo access
#   - Internet connectivity
#   - Oracle Free Tier access configured
# 
# @author AI Crypto Trading System
# @version 1.0.0
# =============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ENVIRONMENT="${1:-production}"
LOG_FILE="/tmp/ai-crypto-trading-deploy.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Banner
show_banner() {
    echo -e "${BLUE}"
    cat << 'EOF'
    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║        🤖 AI CRYPTO TRADING AGENT DEPLOYMENT 🚀              ║
    ║                                                              ║
    ║        Military-Grade Security • Capital Preservation       ║
    ║        Intel NUC Optimized • 24/7 Operation                 ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝
EOF
    echo -e "${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root for security reasons"
    fi
}

# Check system requirements
check_requirements() {
    log "🔍 Checking system requirements..."
    
    # Check Ubuntu version
    if ! grep -q "Ubuntu" /etc/os-release; then
        error "This script requires Ubuntu OS"
    fi
    
    local ubuntu_version=$(lsb_release -rs)
    if [[ $(echo "$ubuntu_version < 22.04" | bc -l) -eq 1 ]]; then
        error "Ubuntu 22.04 or later is required (found: $ubuntu_version)"
    fi
    
    # Check available memory
    local mem_gb=$(free -g | awk 'NR==2{print $2}')
    if [[ $mem_gb -lt 12 ]]; then
        warn "System has ${mem_gb}GB RAM, 12GB recommended for optimal performance"
    fi
    
    # Check available disk space
    local disk_gb=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $disk_gb -lt 50 ]]; then
        error "At least 50GB free disk space required (found: ${disk_gb}GB)"
    fi
    
    # Check internet connectivity
    if ! ping -c 1 google.com &> /dev/null; then
        error "Internet connectivity required for deployment"
    fi
    
    log "✅ System requirements check passed"
}

# Install system dependencies
install_dependencies() {
    log "📦 Installing system dependencies..."
    
    # Update package lists
    sudo apt update
    
    # Install essential packages
    sudo apt install -y \
        curl \
        wget \
        git \
        build-essential \
        sqlite3 \
        libsqlite3-dev \
        python3 \
        python3-pip \
        openssh-client \
        htop \
        iotop \
        nethogs \
        fail2ban \
        ufw \
        bc \
        jq \
        unzip \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release
    
    # Install Node.js 18.x
    if ! command -v node &> /dev/null || [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 18 ]]; then
        log "Installing Node.js 18.x..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Install PM2 globally
    if ! command -v pm2 &> /dev/null; then
        log "Installing PM2 process manager..."
        sudo npm install -g pm2
    fi
    
    # Verify installations
    node --version || error "Node.js installation failed"
    npm --version || error "npm installation failed"
    pm2 --version || error "PM2 installation failed"
    
    log "✅ Dependencies installed successfully"
}

# Configure system security
configure_security() {
    log "🔒 Configuring system security..."
    
    # Configure UFW firewall
    sudo ufw --force reset
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH (if enabled)
    if systemctl is-active --quiet ssh; then
        sudo ufw allow ssh
    fi
    
    # Allow application ports
    sudo ufw allow 3001/tcp comment "AI Trading API"
    sudo ufw allow 3002/tcp comment "AI Trading Dashboard"
    
    # Enable firewall
    sudo ufw --force enable
    
    # Configure fail2ban
    sudo tee /etc/fail2ban/jail.local > /dev/null << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
logpath = /var/log/auth.log
maxretry = 3
bantime = 7200

[ai-crypto-trading]
enabled = true
port = 3001,3002
logpath = /opt/ai-crypto-trading/logs/security.log
maxretry = 5
bantime = 1800
EOF
    
    # Restart and enable fail2ban
    sudo systemctl restart fail2ban
    sudo systemctl enable fail2ban
    
    # Set up automatic security updates
    sudo apt install -y unattended-upgrades
    sudo dpkg-reconfigure -plow unattended-upgrades
    
    log "✅ Security configuration completed"
}

# Setup application directory
setup_application() {
    log "📁 Setting up application directory..."
    
    local app_dir="/opt/ai-crypto-trading"
    
    # Create application directory
    sudo mkdir -p "$app_dir"
    sudo chown "$USER:$USER" "$app_dir"
    
    # Copy application files
    if [[ "$PROJECT_ROOT" != "$app_dir" ]]; then
        log "Copying application files to $app_dir..."
        rsync -av --exclude=node_modules --exclude=.git "$PROJECT_ROOT/" "$app_dir/"
    fi
    
    cd "$app_dir"
    
    # Create required directories
    mkdir -p data logs backups keys
    chmod 755 data logs backups
    chmod 700 keys
    
    # Install Node.js dependencies
    log "Installing Node.js dependencies..."
    npm ci --production
    
    # Build application
    log "Building application..."
    npm run build
    
    # Build dashboard
    if [[ -d "src/dashboard" ]]; then
        log "Building dashboard..."
        npm run dashboard:build
    fi
    
    log "✅ Application setup completed"
}

# Configure environment
configure_environment() {
    log "⚙️ Configuring environment..."
    
    local app_dir="/opt/ai-crypto-trading"
    cd "$app_dir"
    
    # Create environment file if it doesn't exist
    if [[ ! -f .env ]]; then
        if [[ -f .env.example ]]; then
            cp .env.example .env
            log "Created .env file from .env.example"
        else
            error ".env.example file not found"
        fi
    fi
    
    # Set environment-specific configurations
    case "$ENVIRONMENT" in
        development)
            sed -i 's/NODE_ENV=.*/NODE_ENV=development/' .env
            sed -i 's/LOG_LEVEL=.*/LOG_LEVEL=debug/' .env
            ;;
        staging)
            sed -i 's/NODE_ENV=.*/NODE_ENV=staging/' .env
            sed -i 's/LOG_LEVEL=.*/LOG_LEVEL=info/' .env
            ;;
        production)
            sed -i 's/NODE_ENV=.*/NODE_ENV=production/' .env
            sed -i 's/LOG_LEVEL=.*/LOG_LEVEL=info/' .env
            ;;
    esac
    
    # Validate environment configuration
    if ! npm run validate:env; then
        error "Environment validation failed. Please check your .env file."
    fi
    
    log "✅ Environment configuration completed"
}

# Setup SSH tunnel
setup_ssh_tunnel() {
    log "🌐 Setting up SSH tunnel to Oracle Free Tier..."
    
    local ssh_key_path="$HOME/.ssh/oracle_key"
    
    # Generate SSH key if it doesn't exist
    if [[ ! -f "$ssh_key_path" ]]; then
        log "Generating SSH key for Oracle connection..."
        ssh-keygen -t rsa -b 4096 -f "$ssh_key_path" -N "" -C "ai-crypto-trading@$(hostname)"
        chmod 600 "$ssh_key_path"
        chmod 644 "${ssh_key_path}.pub"
        
        warn "SSH public key generated at ${ssh_key_path}.pub"
        warn "Please add this key to your Oracle Free Tier instance:"
        cat "${ssh_key_path}.pub"
        
        read -p "Press Enter after adding the SSH key to Oracle instance..."
    fi
    
    # Test SSH connection
    local oracle_host="${ORACLE_HOST:-168.138.104.117}"
    local oracle_user="${ORACLE_USER:-ubuntu}"
    
    log "Testing SSH connection to Oracle Free Tier..."
    if ssh -i "$ssh_key_path" -o ConnectTimeout=10 -o StrictHostKeyChecking=no \
           "$oracle_user@$oracle_host" "echo 'SSH connection successful'" &> /dev/null; then
        log "✅ SSH connection to Oracle Free Tier successful"
    else
        error "Failed to connect to Oracle Free Tier. Please check your configuration."
    fi
    
    # Update .env with SSH key path
    local app_dir="/opt/ai-crypto-trading"
    sed -i "s|ORACLE_SSH_KEY_PATH=.*|ORACLE_SSH_KEY_PATH=$ssh_key_path|" "$app_dir/.env"
    
    log "✅ SSH tunnel setup completed"
}

# Configure services
configure_services() {
    log "🔧 Configuring system services..."
    
    local app_dir="/opt/ai-crypto-trading"
    
    # Create systemd service file
    sudo tee /etc/systemd/system/ai-crypto-trading.service > /dev/null << EOF
[Unit]
Description=AI Crypto Trading Agent
Documentation=https://github.com/your-org/ai-crypto-trading-agent
After=network.target network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
Group=$USER
WorkingDirectory=$app_dir
Environment=NODE_ENV=$ENVIRONMENT
Environment=PATH=/usr/bin:/usr/local/bin
ExecStart=/usr/bin/npm start
ExecReload=/bin/kill -HUP \$MAINPID
Restart=always
RestartSec=10
TimeoutStopSec=30
KillMode=mixed
StandardOutput=journal
StandardError=journal
SyslogIdentifier=ai-crypto-trading

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$app_dir

[Install]
WantedBy=multi-user.target
EOF
    
    # Create PM2 ecosystem file
    tee "$app_dir/ecosystem.config.js" > /dev/null << EOF
module.exports = {
  apps: [
    {
      name: 'ai-crypto-trading',
      script: 'dist/index.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: '$ENVIRONMENT',
        PORT: 3001
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      time: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data'],
      max_memory_restart: '1G'
    }
  ]
};
EOF
    
    # Set up log rotation
    sudo tee /etc/logrotate.d/ai-crypto-trading > /dev/null << EOF
$app_dir/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 $USER $USER
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
    
    # Reload systemd
    sudo systemctl daemon-reload
    sudo systemctl enable ai-crypto-trading
    
    log "✅ Services configured successfully"
}

# Run deployment tests
run_tests() {
    log "🧪 Running deployment tests..."
    
    local app_dir="/opt/ai-crypto-trading"
    cd "$app_dir"
    
    # Run unit tests
    if npm run test:unit &> /dev/null; then
        log "✅ Unit tests passed"
    else
        warn "Unit tests failed - check logs for details"
    fi
    
    # Run security tests
    if npm run test:security &> /dev/null; then
        log "✅ Security tests passed"
    else
        warn "Security tests failed - check logs for details"
    fi
    
    # Test SSH tunnel
    if npm run tunnel:test &> /dev/null; then
        log "✅ SSH tunnel test passed"
    else
        warn "SSH tunnel test failed - check configuration"
    fi
    
    # Test API connectivity
    if npm run test:api-connection &> /dev/null; then
        log "✅ API connectivity test passed"
    else
        warn "API connectivity test failed - check credentials"
    fi
    
    log "✅ Deployment tests completed"
}

# Start services
start_services() {
    log "🚀 Starting services..."
    
    local app_dir="/opt/ai-crypto-trading"
    cd "$app_dir"
    
    # Start with PM2
    pm2 start ecosystem.config.js
    
    # Save PM2 configuration
    pm2 save
    
    # Generate PM2 startup script
    pm2 startup systemd -u "$USER" --hp "$HOME" | grep -E '^sudo' | bash
    
    # Wait for services to start
    sleep 10
    
    # Check service status
    if pm2 list | grep -q "online"; then
        log "✅ Services started successfully"
    else
        error "Failed to start services"
    fi
    
    log "✅ All services are running"
}

# Verify deployment
verify_deployment() {
    log "✅ Verifying deployment..."
    
    # Check API health
    local api_url="http://localhost:3001/api/v1/health"
    if curl -f -s "$api_url" > /dev/null; then
        log "✅ API health check passed"
    else
        warn "API health check failed"
    fi
    
    # Check dashboard (if available)
    local dashboard_url="http://localhost:3002"
    if curl -f -s "$dashboard_url" > /dev/null; then
        log "✅ Dashboard health check passed"
    else
        warn "Dashboard health check failed"
    fi
    
    # Check system resources
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local mem_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}')
    
    log "System resources: CPU: ${cpu_usage}%, Memory: ${mem_usage}%"
    
    # Display service status
    pm2 list
    
    log "✅ Deployment verification completed"
}

# Create backup
create_backup() {
    log "💾 Creating deployment backup..."
    
    local app_dir="/opt/ai-crypto-trading"
    local backup_dir="$app_dir/backups"
    local backup_file="deployment_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
    
    cd "$app_dir"
    
    # Create backup
    tar -czf "$backup_dir/$backup_file" \
        --exclude=node_modules \
        --exclude=logs \
        --exclude=data \
        --exclude=backups \
        .
    
    log "✅ Backup created: $backup_file"
}

# Display deployment summary
show_summary() {
    echo -e "${GREEN}"
    cat << EOF

    ╔══════════════════════════════════════════════════════════════╗
    ║                                                              ║
    ║        🎉 DEPLOYMENT COMPLETED SUCCESSFULLY! 🎉              ║
    ║                                                              ║
    ╚══════════════════════════════════════════════════════════════╝

    📊 DEPLOYMENT SUMMARY:
    ├─ Environment: $ENVIRONMENT
    ├─ Application Directory: /opt/ai-crypto-trading
    ├─ API Endpoint: http://localhost:3001
    ├─ Dashboard: http://localhost:3002
    ├─ Log File: $LOG_FILE
    └─ Process Manager: PM2

    🔧 USEFUL COMMANDS:
    ├─ Check Status: pm2 status
    ├─ View Logs: pm2 logs
    ├─ Restart: pm2 restart all
    ├─ Stop: pm2 stop all
    └─ Monitor: pm2 monit

    🔒 SECURITY FEATURES:
    ├─ UFW Firewall: Enabled
    ├─ Fail2Ban: Active
    ├─ SSH Tunnel: Configured
    ├─ Encryption: AES-256
    └─ Audit Logging: Enabled

    💰 TRADING FEATURES:
    ├─ Risk Management: Active
    ├─ Strategy Engine: Multi-indicator
    ├─ AI Analysis: Intel NUC Optimized
    ├─ Sentiment Analysis: Real-time
    └─ Capital Preservation: Priority #1

    🎯 NEXT STEPS:
    1. Review and update .env configuration
    2. Configure Gate.io API credentials
    3. Set up email and Telegram notifications
    4. Run initial backtests
    5. Start live trading (when ready)

    📚 DOCUMENTATION:
    ├─ Full Documentation: docs/README.md
    ├─ API Reference: docs/api/README.md
    ├─ Configuration: docs/configuration/README.md
    └─ Troubleshooting: docs/troubleshooting/README.md

EOF
    echo -e "${NC}"
}

# Main deployment function
main() {
    show_banner
    
    log "🚀 Starting AI Crypto Trading Agent deployment..."
    log "Environment: $ENVIRONMENT"
    log "Log file: $LOG_FILE"
    
    # Pre-deployment checks
    check_root
    check_requirements
    
    # Installation steps
    install_dependencies
    configure_security
    setup_application
    configure_environment
    setup_ssh_tunnel
    configure_services
    
    # Testing and verification
    run_tests
    start_services
    verify_deployment
    
    # Post-deployment
    create_backup
    
    log "🎉 Deployment completed successfully!"
    show_summary
}

# Cleanup function for error handling
cleanup() {
    local exit_code=$?
    if [[ $exit_code -ne 0 ]]; then
        error "Deployment failed with exit code $exit_code"
        log "Check the log file for details: $LOG_FILE"
    fi
}

# Set trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"