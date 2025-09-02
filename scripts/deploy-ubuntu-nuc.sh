#!/bin/bash

# AI Crypto Trading Agent - Ubuntu NUC Deployment Script
# This script sets up the complete environment for Intel NUC deployment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TRADING_USER="trading"
TRADING_HOME="/opt/trading-agent"
LOG_DIR="/var/log/trading-agent"
SERVICE_DIR="/etc/systemd/system"
KEYS_DIR="$TRADING_HOME/keys"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Function to update system packages
update_system() {
    print_status "Updating system packages..."
    apt update && apt upgrade -y
    print_success "System packages updated"
}

# Function to install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    apt install -y \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        ufw \
        fail2ban \
        logrotate \
        htop \
        nano \
        vim \
        unzip \
        openssh-client \
        postgresql \
        postgresql-contrib \
        nginx
    print_success "System dependencies installed"
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js 18..."
    
    # Add NodeSource repository
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt install -y nodejs
    
    # Verify installation
    node_version=$(node --version)
    npm_version=$(npm --version)
    
    print_success "Node.js installed: $node_version"
    print_success "npm installed: $npm_version"
}

# Function to configure PostgreSQL
configure_postgresql() {
    print_status "Configuring PostgreSQL..."
    
    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql
    
    # Create trading database and user
    sudo -u postgres psql -c "CREATE USER $TRADING_USER WITH PASSWORD 'trading_secure_password_2024';"
    sudo -u postgres psql -c "CREATE DATABASE trading_agent OWNER $TRADING_USER;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE trading_agent TO $TRADING_USER;"
    
    # Configure PostgreSQL for local connections
    PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
    PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"
    
    # Update pg_hba.conf for local authentication
    sed -i "s/#local   all             all                                     peer/local   all             all                                     md5/" "$PG_CONFIG_DIR/pg_hba.conf"
    
    # Restart PostgreSQL
    systemctl restart postgresql
    
    print_success "PostgreSQL configured"
}

# Function to create trading user and directories
create_trading_user() {
    print_status "Creating trading user and directories..."
    
    # Create system user
    if ! id "$TRADING_USER" &>/dev/null; then
        useradd -r -s /bin/bash -d "$TRADING_HOME" -m "$TRADING_USER"
        print_success "Created user: $TRADING_USER"
    else
        print_warning "User $TRADING_USER already exists"
    fi
    
    # Create directory structure
    mkdir -p "$TRADING_HOME"/{config,logs,scripts,keys,backups}
    mkdir -p "$LOG_DIR"
    
    # Set ownership and permissions
    chown -R "$TRADING_USER:$TRADING_USER" "$TRADING_HOME"
    chown -R "$TRADING_USER:$TRADING_USER" "$LOG_DIR"
    
    # Set secure permissions for keys directory
    chmod 700 "$KEYS_DIR"
    
    print_success "Trading user and directories created"
}

# Function to configure SSH keys for Oracle Cloud
configure_ssh_keys() {
    print_status "Configuring SSH keys for Oracle Cloud access..."
    
    # Check if keys directory exists
    if [[ ! -d "$KEYS_DIR" ]]; then
        mkdir -p "$KEYS_DIR"
        chown "$TRADING_USER:$TRADING_USER" "$KEYS_DIR"
        chmod 700 "$KEYS_DIR"
    fi
    
    # Generate SSH key pair if it doesn't exist
    SSH_KEY_PATH="$KEYS_DIR/oracle_key"
    if [[ ! -f "$SSH_KEY_PATH" ]]; then
        sudo -u "$TRADING_USER" ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -C "trading-agent@intel-nuc"
        chmod 600 "$SSH_KEY_PATH"
        chmod 644 "$SSH_KEY_PATH.pub"
        print_success "SSH key pair generated"
        
        print_warning "IMPORTANT: Copy the public key to Oracle Cloud instance:"
        print_warning "Public key location: $SSH_KEY_PATH.pub"
        print_warning "Run: cat $SSH_KEY_PATH.pub"
    else
        print_warning "SSH keys already exist"
    fi
}

# Function to configure firewall
configure_firewall() {
    print_status "Configuring UFW firewall..."
    
    # Reset UFW to defaults
    ufw --force reset
    
    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing
    
    # Allow SSH (be careful not to lock yourself out)
    ufw allow ssh
    
    # Allow dashboard access from local network
    ufw allow from 192.168.0.0/16 to any port 3000
    ufw allow from 10.0.0.0/8 to any port 3000
    ufw allow from 172.16.0.0/12 to any port 3000
    
    # Allow PostgreSQL from localhost only
    ufw allow from 127.0.0.1 to any port 5432
    
    # Enable firewall
    ufw --force enable
    
    print_success "UFW firewall configured"
}

# Function to configure fail2ban
configure_fail2ban() {
    print_status "Configuring fail2ban..."
    
    # Create local jail configuration
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
backend = systemd

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = %(sshd_backend)s

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10
EOF
    
    # Start and enable fail2ban
    systemctl start fail2ban
    systemctl enable fail2ban
    
    print_success "fail2ban configured"
}

# Function to configure log rotation
configure_logrotate() {
    print_status "Configuring log rotation..."
    
    cat > /etc/logrotate.d/trading-agent << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $TRADING_USER $TRADING_USER
    postrotate
        systemctl reload trading-agent || true
    endscript
}
EOF
    
    print_success "Log rotation configured"
}

# Function to install global npm packages
install_global_npm_packages() {
    print_status "Installing global npm packages..."
    
    npm install -g pm2 typescript ts-node
    
    print_success "Global npm packages installed"
}

# Function to create systemd service templates
create_service_templates() {
    print_status "Creating systemd service templates..."
    
    # SSH Tunnel Service
    cat > "$SERVICE_DIR/ssh-tunnel.service" << EOF
[Unit]
Description=SSH Tunnel to Oracle Cloud for Gate.io API
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=$TRADING_USER
WorkingDirectory=$TRADING_HOME
ExecStart=$TRADING_HOME/scripts/start-tunnel.sh
Restart=always
RestartSec=30
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

    # Trading Agent Service
    cat > "$SERVICE_DIR/trading-agent.service" << EOF
[Unit]
Description=AI Crypto Trading Agent
After=network.target ssh-tunnel.service postgresql.service
Requires=ssh-tunnel.service
Wants=postgresql.service

[Service]
Type=simple
User=$TRADING_USER
WorkingDirectory=$TRADING_HOME
ExecStart=/usr/bin/node dist/main.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$TRADING_HOME/.env

[Install]
WantedBy=multi-user.target
EOF

    # Dashboard Service
    cat > "$SERVICE_DIR/trading-dashboard.service" << EOF
[Unit]
Description=Trading Agent Web Dashboard
After=network.target trading-agent.service

[Service]
Type=simple
User=$TRADING_USER
WorkingDirectory=$TRADING_HOME
ExecStart=/usr/bin/npm run dashboard:start
Restart=always
RestartSec=10
Environment=NODE_ENV=production
EnvironmentFile=$TRADING_HOME/.env

[Install]
WantedBy=multi-user.target
EOF
    
    # Reload systemd
    systemctl daemon-reload
    
    print_success "Systemd service templates created"
}

# Function to set up basic monitoring
setup_monitoring() {
    print_status "Setting up basic system monitoring..."
    
    # Create monitoring script
    cat > "$TRADING_HOME/scripts/health-check.sh" << 'EOF'
#!/bin/bash

# Health check script for trading agent
LOG_FILE="/var/log/trading-agent/health-check.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting health check..." >> "$LOG_FILE"

# Check services
services=("ssh-tunnel" "trading-agent" "trading-dashboard" "postgresql")
for service in "${services[@]}"; do
    if systemctl is-active --quiet "$service"; then
        echo "[$DATE] ✅ $service is running" >> "$LOG_FILE"
    else
        echo "[$DATE] ❌ $service is not running" >> "$LOG_FILE"
    fi
done

# Check disk space
disk_usage=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$disk_usage" -gt 80 ]; then
    echo "[$DATE] ⚠️  Disk usage is high: ${disk_usage}%" >> "$LOG_FILE"
else
    echo "[$DATE] ✅ Disk usage is normal: ${disk_usage}%" >> "$LOG_FILE"
fi

# Check memory usage
memory_usage=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ "$memory_usage" -gt 80 ]; then
    echo "[$DATE] ⚠️  Memory usage is high: ${memory_usage}%" >> "$LOG_FILE"
else
    echo "[$DATE] ✅ Memory usage is normal: ${memory_usage}%" >> "$LOG_FILE"
fi

echo "[$DATE] Health check completed" >> "$LOG_FILE"
EOF
    
    chmod +x "$TRADING_HOME/scripts/health-check.sh"
    chown "$TRADING_USER:$TRADING_USER" "$TRADING_HOME/scripts/health-check.sh"
    
    # Add cron job for health checks
    (crontab -u "$TRADING_USER" -l 2>/dev/null; echo "*/5 * * * * $TRADING_HOME/scripts/health-check.sh") | crontab -u "$TRADING_USER" -
    
    print_success "Basic monitoring setup completed"
}

# Function to create backup script
create_backup_script() {
    print_status "Creating backup script..."
    
    cat > "$TRADING_HOME/scripts/backup.sh" << 'EOF'
#!/bin/bash

# Backup script for trading agent
BACKUP_DIR="/opt/trading-agent/backups"
DATE=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.tar.gz"

echo "Starting backup at $(date)"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Backup configuration files and logs
tar -czf "$BACKUP_FILE" \
    --exclude="$BACKUP_DIR" \
    --exclude="node_modules" \
    --exclude="dist" \
    /opt/trading-agent/.env \
    /opt/trading-agent/config/ \
    /opt/trading-agent/keys/ \
    /var/log/trading-agent/ \
    2>/dev/null || true

# Backup database
pg_dump -h localhost -U trading trading_agent > "$BACKUP_DIR/database_$DATE.sql"

# Keep only last 7 days of backups
find "$BACKUP_DIR" -name "backup_*.tar.gz" -mtime +7 -delete
find "$BACKUP_DIR" -name "database_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
EOF
    
    chmod +x "$TRADING_HOME/scripts/backup.sh"
    chown "$TRADING_USER:$TRADING_USER" "$TRADING_HOME/scripts/backup.sh"
    
    # Add daily backup cron job
    (crontab -u "$TRADING_USER" -l 2>/dev/null; echo "0 2 * * * $TRADING_HOME/scripts/backup.sh") | crontab -u "$TRADING_USER" -
    
    print_success "Backup script created"
}

# Main deployment function
main() {
    print_status "Starting Intel NUC Ubuntu deployment..."
    
    check_root
    update_system
    install_dependencies
    install_nodejs
    configure_postgresql
    create_trading_user
    configure_ssh_keys
    configure_firewall
    configure_fail2ban
    configure_logrotate
    install_global_npm_packages
    create_service_templates
    setup_monitoring
    create_backup_script
    
    print_success "Intel NUC Ubuntu deployment completed successfully!"
    print_warning ""
    print_warning "NEXT STEPS:"
    print_warning "1. Copy your Oracle Cloud public key to: $KEYS_DIR/oracle_key.pub"
    print_warning "2. Add the public key to your Oracle Cloud instance authorized_keys"
    print_warning "3. Create and configure the .env file in $TRADING_HOME"
    print_warning "4. Deploy your application code to $TRADING_HOME"
    print_warning "5. Install npm dependencies and build the application"
    print_warning "6. Enable and start the services:"
    print_warning "   sudo systemctl enable ssh-tunnel trading-agent trading-dashboard"
    print_warning "   sudo systemctl start ssh-tunnel trading-agent trading-dashboard"
    print_warning ""
    print_warning "SSH Public Key for Oracle Cloud:"
    if [[ -f "$KEYS_DIR/oracle_key.pub" ]]; then
        cat "$KEYS_DIR/oracle_key.pub"
    fi
}

# Run main function
main "$@"