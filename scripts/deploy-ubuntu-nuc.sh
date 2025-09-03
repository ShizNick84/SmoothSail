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

# Function to check system requirements
check_system_requirements() {
    print_status "Checking system requirements..."
    
    # Check Ubuntu version
    if ! grep -q "Ubuntu" /etc/os-release; then
        print_error "This script requires Ubuntu OS"
        exit 1
    fi
    
    local ubuntu_version=$(lsb_release -rs 2>/dev/null || echo "unknown")
    print_status "Detected Ubuntu version: $ubuntu_version"
    
    # Check available memory (minimum 4GB recommended)
    local mem_gb=$(free -g | awk 'NR==2{print $2}')
    if [[ $mem_gb -lt 4 ]]; then
        print_warning "System has ${mem_gb}GB RAM, 4GB+ recommended for optimal performance"
    else
        print_success "Memory check passed: ${mem_gb}GB RAM available"
    fi
    
    # Check available disk space (minimum 20GB required)
    local disk_gb=$(df -BG / | awk 'NR==2{print $4}' | sed 's/G//')
    if [[ $disk_gb -lt 20 ]]; then
        print_error "At least 20GB free disk space required (found: ${disk_gb}GB)"
        exit 1
    else
        print_success "Disk space check passed: ${disk_gb}GB available"
    fi
    
    # Check internet connectivity
    print_status "Testing internet connectivity..."
    if ! ping -c 1 -W 5 8.8.8.8 &> /dev/null; then
        print_error "Internet connectivity required for deployment"
        exit 1
    else
        print_success "Internet connectivity check passed"
    fi
    
    # Check if ports are available
    local ports_to_check=(3000 3001 5432 8443)
    for port in "${ports_to_check[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            print_warning "Port $port is already in use"
        fi
    done
    
    print_success "System requirements check completed"
}

# Function to update system packages
update_system() {
    print_status "Updating system packages..."
    
    # Update package lists
    if ! apt update; then
        print_error "Failed to update package lists"
        exit 1
    fi
    
    # Upgrade packages (non-interactive)
    export DEBIAN_FRONTEND=noninteractive
    if ! apt upgrade -y; then
        print_warning "Some packages failed to upgrade, continuing..."
    fi
    
    # Install essential packages first
    if ! apt install -y curl wget; then
        print_error "Failed to install essential packages"
        exit 1
    fi
    
    print_success "System packages updated"
}

# Function to install system dependencies
install_dependencies() {
    print_status "Installing system dependencies..."
    
    export DEBIAN_FRONTEND=noninteractive
    
    # Install packages in groups for better error handling
    local essential_packages=(
        "curl"
        "wget" 
        "git"
        "build-essential"
        "software-properties-common"
        "apt-transport-https"
        "ca-certificates"
        "gnupg"
        "lsb-release"
    )
    
    local security_packages=(
        "ufw"
        "fail2ban"
    )
    
    local utility_packages=(
        "logrotate"
        "htop"
        "nano"
        "vim"
        "unzip"
        "openssh-client"
        "net-tools"
        "netstat-nat"
    )
    
    local database_packages=(
        "postgresql"
        "postgresql-contrib"
        "postgresql-client"
    )
    
    local web_packages=(
        "nginx"
    )
    
    # Install essential packages
    print_status "Installing essential packages..."
    if ! apt install -y "${essential_packages[@]}"; then
        print_error "Failed to install essential packages"
        exit 1
    fi
    
    # Install security packages
    print_status "Installing security packages..."
    if ! apt install -y "${security_packages[@]}"; then
        print_warning "Some security packages failed to install"
    fi
    
    # Install utility packages
    print_status "Installing utility packages..."
    if ! apt install -y "${utility_packages[@]}"; then
        print_warning "Some utility packages failed to install"
    fi
    
    # Install database packages
    print_status "Installing PostgreSQL..."
    if ! apt install -y "${database_packages[@]}"; then
        print_error "Failed to install PostgreSQL"
        exit 1
    fi
    
    # Install web server (optional)
    print_status "Installing Nginx..."
    if ! apt install -y "${web_packages[@]}"; then
        print_warning "Nginx installation failed, continuing without it"
    fi
    
    print_success "System dependencies installed"
}

# Function to install Node.js
install_nodejs() {
    print_status "Installing Node.js 18..."
    
    # Check if Node.js is already installed with correct version
    if command -v node &> /dev/null; then
        local current_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ $current_version -ge 18 ]]; then
            print_success "Node.js $(node --version) is already installed"
            return 0
        else
            print_status "Node.js version $current_version is too old, upgrading to v18..."
        fi
    fi
    
    # Add NodeSource repository
    print_status "Adding NodeSource repository..."
    if ! curl -fsSL https://deb.nodesource.com/setup_18.x | bash -; then
        print_error "Failed to add NodeSource repository"
        exit 1
    fi
    
    # Install Node.js
    print_status "Installing Node.js from NodeSource..."
    if ! apt install -y nodejs; then
        print_error "Failed to install Node.js"
        exit 1
    fi
    
    # Verify installation
    if ! command -v node &> /dev/null; then
        print_error "Node.js installation verification failed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm installation verification failed"
        exit 1
    fi
    
    local node_version=$(node --version)
    local npm_version=$(npm --version)
    
    print_success "Node.js installed: $node_version"
    print_success "npm installed: $npm_version"
    
    # Install global packages
    print_status "Installing global npm packages..."
    if ! npm install -g pm2; then
        print_warning "Failed to install PM2 globally"
    else
        print_success "PM2 installed globally"
    fi
}

# Function to configure PostgreSQL
configure_postgresql() {
    print_status "Configuring PostgreSQL..."
    
    # Start and enable PostgreSQL
    if ! systemctl start postgresql; then
        print_error "Failed to start PostgreSQL service"
        return 1
    fi
    
    if ! systemctl enable postgresql; then
        print_warning "Failed to enable PostgreSQL service"
    fi
    
    # Wait for PostgreSQL to be ready
    print_status "Waiting for PostgreSQL to be ready..."
    local max_attempts=30
    local attempt=0
    
    while ! sudo -u postgres psql -c "SELECT 1;" &>/dev/null; do
        attempt=$((attempt + 1))
        if [ $attempt -ge $max_attempts ]; then
            print_error "PostgreSQL failed to start after $max_attempts attempts"
            return 1
        fi
        print_status "Waiting for PostgreSQL... (attempt $attempt/$max_attempts)"
        sleep 2
    done
    
    print_success "PostgreSQL is ready"
    
    # Create trading database and user (with error handling)
    print_status "Creating database user and database..."
    
    # Check if user already exists
    if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$TRADING_USER'" | grep -q 1; then
        print_warning "User '$TRADING_USER' already exists, skipping user creation"
    else
        if ! sudo -u postgres psql -c "CREATE USER $TRADING_USER WITH PASSWORD 'trading_secure_password_2024';"; then
            print_error "Failed to create PostgreSQL user"
            return 1
        fi
        print_success "Created PostgreSQL user: $TRADING_USER"
    fi
    
    # Check if database already exists
    if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw trading_agent; then
        print_warning "Database 'trading_agent' already exists, skipping database creation"
    else
        if ! sudo -u postgres psql -c "CREATE DATABASE trading_agent OWNER $TRADING_USER;"; then
            print_error "Failed to create PostgreSQL database"
            return 1
        fi
        print_success "Created PostgreSQL database: trading_agent"
    fi
    
    # Grant privileges
    if ! sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE trading_agent TO $TRADING_USER;"; then
        print_warning "Failed to grant privileges (user may already have them)"
    fi
    
    # Find PostgreSQL configuration directory with better detection
    print_status "Configuring PostgreSQL authentication..."
    
    # Try multiple methods to find PostgreSQL version and config
    PG_VERSION=""
    PG_CONFIG_DIR=""
    
    # Method 1: Get version from PostgreSQL directly
    if [ -z "$PG_VERSION" ]; then
        PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" 2>/dev/null | grep -oP 'PostgreSQL \K\d+(\.\d+)?' | head -1)
    fi
    
    # Method 2: Check installed packages
    if [ -z "$PG_VERSION" ]; then
        PG_VERSION=$(dpkg -l | grep postgresql-[0-9] | head -1 | awk '{print $2}' | grep -oP '\d+(\.\d+)?')
    fi
    
    # Method 3: Check directory structure
    if [ -z "$PG_VERSION" ]; then
        if [ -d "/etc/postgresql" ]; then
            PG_VERSION=$(ls /etc/postgresql/ | grep -E '^[0-9]+(\.[0-9]+)?$' | sort -V | tail -1)
        fi
    fi
    
    print_status "Detected PostgreSQL version: $PG_VERSION"
    
    # Find config directory
    if [ -n "$PG_VERSION" ]; then
        # Try common paths
        for path in "/etc/postgresql/$PG_VERSION/main" "/etc/postgresql/$PG_VERSION" "/etc/postgresql/main"; do
            if [ -f "$path/pg_hba.conf" ]; then
                PG_CONFIG_DIR="$path"
                break
            fi
        done
    fi
    
    # Fallback: search for pg_hba.conf
    if [ -z "$PG_CONFIG_DIR" ]; then
        PG_HBA_PATH=$(find /etc/postgresql -name "pg_hba.conf" 2>/dev/null | head -1)
        if [ -n "$PG_HBA_PATH" ]; then
            PG_CONFIG_DIR=$(dirname "$PG_HBA_PATH")
        fi
    fi
    
    if [ -z "$PG_CONFIG_DIR" ] || [ ! -f "$PG_CONFIG_DIR/pg_hba.conf" ]; then
        print_error "Could not find PostgreSQL configuration directory"
        print_error "Please manually configure pg_hba.conf for md5 authentication"
        return 1
    fi
    
    print_status "Using PostgreSQL config directory: $PG_CONFIG_DIR"
    
    # Backup original pg_hba.conf
    if [ ! -f "$PG_CONFIG_DIR/pg_hba.conf.backup" ]; then
        cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup"
        print_status "Backed up original pg_hba.conf"
    fi
    
    # Update pg_hba.conf for local authentication
    # Look for the local all all peer line and change to md5
    if grep -q "^local.*all.*all.*peer" "$PG_CONFIG_DIR/pg_hba.conf"; then
        sed -i 's/^local\s*all\s*all\s*peer$/local   all             all                                     md5/' "$PG_CONFIG_DIR/pg_hba.conf"
        print_success "Updated pg_hba.conf for md5 authentication"
    elif grep -q "^#local.*all.*all.*peer" "$PG_CONFIG_DIR/pg_hba.conf"; then
        sed -i 's/^#local\s*all\s*all\s*peer$/local   all             all                                     md5/' "$PG_CONFIG_DIR/pg_hba.conf"
        print_success "Enabled and updated pg_hba.conf for md5 authentication"
    else
        # Add the line if it doesn't exist
        echo "local   all             all                                     md5" >> "$PG_CONFIG_DIR/pg_hba.conf"
        print_success "Added md5 authentication line to pg_hba.conf"
    fi
    
    # Restart PostgreSQL to apply changes
    print_status "Restarting PostgreSQL to apply configuration changes..."
    if ! systemctl restart postgresql; then
        print_error "Failed to restart PostgreSQL"
        return 1
    fi
    
    # Wait for PostgreSQL to be ready again
    sleep 3
    local restart_attempts=10
    local restart_attempt=0
    
    while ! sudo -u postgres psql -c "SELECT 1;" &>/dev/null; do
        restart_attempt=$((restart_attempt + 1))
        if [ $restart_attempt -ge $restart_attempts ]; then
            print_error "PostgreSQL failed to restart properly"
            return 1
        fi
        print_status "Waiting for PostgreSQL restart... (attempt $restart_attempt/$restart_attempts)"
        sleep 2
    done
    
    # Test database connection with new authentication
    print_status "Testing database connection..."
    if PGPASSWORD='trading_secure_password_2024' psql -h localhost -U "$TRADING_USER" -d trading_agent -c "SELECT 1;" &>/dev/null; then
        print_success "Database connection test successful"
    else
        print_warning "Database connection test failed - you may need to manually configure authentication"
    fi
    
    print_success "PostgreSQL configuration completed"
}

# Function to create trading user and directories
create_trading_user() {
    print_status "Creating trading user and directories..."
    
    # Create system user
    if ! id "$TRADING_USER" &>/dev/null; then
        if ! useradd -r -s /bin/bash -d "$TRADING_HOME" -m "$TRADING_USER"; then
            print_error "Failed to create user: $TRADING_USER"
            exit 1
        fi
        print_success "Created user: $TRADING_USER"
    else
        print_warning "User $TRADING_USER already exists"
    fi
    
    # Create directory structure
    print_status "Creating directory structure..."
    local directories=(
        "$TRADING_HOME/config"
        "$TRADING_HOME/logs" 
        "$TRADING_HOME/scripts"
        "$TRADING_HOME/keys"
        "$TRADING_HOME/backups"
        "$TRADING_HOME/data"
        "$LOG_DIR"
    )
    
    for dir in "${directories[@]}"; do
        if ! mkdir -p "$dir"; then
            print_error "Failed to create directory: $dir"
            exit 1
        fi
    done
    
    # Set ownership and permissions
    print_status "Setting permissions..."
    if ! chown -R "$TRADING_USER:$TRADING_USER" "$TRADING_HOME"; then
        print_error "Failed to set ownership for $TRADING_HOME"
        exit 1
    fi
    
    if ! chown -R "$TRADING_USER:$TRADING_USER" "$LOG_DIR"; then
        print_error "Failed to set ownership for $LOG_DIR"
        exit 1
    fi
    
    # Set secure permissions for keys directory
    chmod 700 "$KEYS_DIR"
    chmod 755 "$TRADING_HOME"/{config,logs,scripts,backups,data}
    chmod 755 "$LOG_DIR"
    
    print_success "Trading user and directories created"
}

# Function to configure SSH keys for Oracle Cloud
configure_ssh_keys() {
    print_status "Configuring SSH keys for Oracle Cloud access..."
    
    # Check if keys directory exists
    if [[ ! -d "$KEYS_DIR" ]]; then
        if ! mkdir -p "$KEYS_DIR"; then
            print_error "Failed to create keys directory"
            exit 1
        fi
        chown "$TRADING_USER:$TRADING_USER" "$KEYS_DIR"
        chmod 700 "$KEYS_DIR"
    fi
    
    # Generate SSH key pair if it doesn't exist
    SSH_KEY_PATH="$KEYS_DIR/oracle_key"
    if [[ ! -f "$SSH_KEY_PATH" ]]; then
        print_status "Generating SSH key pair for Oracle Cloud..."
        
        if ! sudo -u "$TRADING_USER" ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH" -N "" -C "trading-agent@intel-nuc"; then
            print_error "Failed to generate SSH key pair"
            exit 1
        fi
        
        # Set proper permissions
        chmod 600 "$SSH_KEY_PATH"
        chmod 644 "$SSH_KEY_PATH.pub"
        
        # Verify key was created
        if [[ ! -f "$SSH_KEY_PATH" ]] || [[ ! -f "$SSH_KEY_PATH.pub" ]]; then
            print_error "SSH key generation failed - files not created"
            exit 1
        fi
        
        print_success "SSH key pair generated successfully"
        
        print_warning ""
        print_warning "🔑 IMPORTANT: Add this SSH public key to your Oracle Cloud instance:"
        print_warning "Key location: $SSH_KEY_PATH.pub"
        print_warning ""
        print_warning "Public key content:"
        cat "$SSH_KEY_PATH.pub"
        print_warning ""
    else
        print_warning "SSH keys already exist at $SSH_KEY_PATH"
        
        # Verify existing keys
        if [[ -f "$SSH_KEY_PATH.pub" ]]; then
            print_status "Existing public key:"
            cat "$SSH_KEY_PATH.pub"
        fi
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

# Function to validate deployment
validate_deployment() {
    print_status "Validating deployment..."
    
    local validation_failed=false
    
    # Check if trading user exists
    if ! id "$TRADING_USER" &>/dev/null; then
        print_error "Trading user not created properly"
        validation_failed=true
    fi
    
    # Check if directories exist
    local required_dirs=(
        "$TRADING_HOME"
        "$TRADING_HOME/keys"
        "$TRADING_HOME/scripts"
        "$LOG_DIR"
    )
    
    for dir in "${required_dirs[@]}"; do
        if [[ ! -d "$dir" ]]; then
            print_error "Required directory missing: $dir"
            validation_failed=true
        fi
    done
    
    # Check if SSH key exists
    if [[ ! -f "$KEYS_DIR/oracle_key" ]]; then
        print_error "SSH key not generated properly"
        validation_failed=true
    fi
    
    # Check if PostgreSQL is running
    if ! systemctl is-active --quiet postgresql; then
        print_error "PostgreSQL is not running"
        validation_failed=true
    fi
    
    # Check if database exists
    if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw trading_agent; then
        print_error "Trading database not created properly"
        validation_failed=true
    fi
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        print_error "Node.js not installed properly"
        validation_failed=true
    fi
    
    if [[ "$validation_failed" == "true" ]]; then
        print_error "Deployment validation failed!"
        return 1
    else
        print_success "Deployment validation passed!"
        return 0
    fi
}

# Main deployment function
main() {
    print_status "Starting Intel NUC Ubuntu deployment..."
    
    # Pre-deployment checks
    check_root
    check_system_requirements
    
    # System setup
    update_system
    install_dependencies
    install_nodejs
    
    # User and directory setup
    create_trading_user
    
    # Database setup
    configure_postgresql
    
    # Security setup
    configure_ssh_keys
    configure_firewall
    configure_fail2ban
    
    # System configuration
    configure_logrotate
    create_service_templates
    setup_monitoring
    create_backup_script
    
    # Validate deployment
    if ! validate_deployment; then
        print_error "Deployment validation failed. Please check the errors above."
        exit 1
    fi
    
    print_success "Intel NUC Ubuntu deployment completed successfully!"
    print_warning ""
    print_warning "🎉 DEPLOYMENT COMPLETE! 🎉"
    print_warning ""
    print_warning "📋 NEXT STEPS:"
    print_warning "1. Add this SSH public key to your Oracle Cloud instance:"
    print_warning ""
    if [[ -f "$KEYS_DIR/oracle_key.pub" ]]; then
        echo "   $(cat "$KEYS_DIR/oracle_key.pub")"
    fi
    print_warning ""
    print_warning "2. Clone your SmoothSail repository:"
    print_warning "   sudo su - trading"
    print_warning "   cd /opt/trading-agent"
    print_warning "   git clone https://github.com/ShizNick84/SmoothSail.git ."
    print_warning ""
    print_warning "3. Install dependencies and build:"
    print_warning "   npm install"
    print_warning "   npm run build"
    print_warning ""
    print_warning "4. Configure environment:"
    print_warning "   cp .env.example .env"
    print_warning "   nano .env"
    print_warning ""
    print_warning "5. Start services:"
    print_warning "   exit  # Back to your user"
    print_warning "   sudo systemctl enable ssh-tunnel trading-agent trading-dashboard"
    print_warning "   sudo systemctl start ssh-tunnel trading-agent trading-dashboard"
    print_warning ""
    print_warning "🔧 USEFUL COMMANDS:"
    print_warning "   Check status: sudo systemctl status trading-agent"
    print_warning "   View logs: sudo journalctl -u trading-agent -f"
    print_warning "   Health check: /opt/trading-agent/scripts/health-check.sh"
}

# Run main function
main "$@"