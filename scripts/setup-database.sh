#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - PostgreSQL Database Setup Script for Intel NUC
# =============================================================================
# This script sets up PostgreSQL database for the trading agent on Intel NUC
# Run this script with sudo privileges during Intel NUC deployment
# =============================================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root. Run as the trading user."
    exit 1
fi

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    error "PostgreSQL is not installed. Please install PostgreSQL first."
    exit 1
fi

# Configuration
DB_NAME="trading_agent"
DB_USER="trading"
DB_PASSWORD="trading_secure_password_2024"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_INIT_FILE="$SCRIPT_DIR/init-postgresql.sql"

log "🗄️  Setting up PostgreSQL database for AI Crypto Trading Agent..."

# Check if PostgreSQL service is running
if ! systemctl is-active --quiet postgresql; then
    log "Starting PostgreSQL service..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

# Check if database already exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    warning "Database '$DB_NAME' already exists. Skipping database creation."
else
    log "Creating database '$DB_NAME'..."
    
    # Create database and user
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" || true
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;" || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" || true
    
    success "Database '$DB_NAME' created successfully"
fi

# Run initialization script if it exists
if [[ -f "$SQL_INIT_FILE" ]]; then
    log "Running database initialization script..."
    sudo -u postgres psql -d "$DB_NAME" -f "$SQL_INIT_FILE"
    success "Database initialization completed"
else
    warning "Database initialization script not found at $SQL_INIT_FILE"
fi

# Test database connection
log "Testing database connection..."
if PGPASSWORD="$DB_PASSWORD" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" > /dev/null 2>&1; then
    success "Database connection test successful"
else
    error "Database connection test failed"
    exit 1
fi

# Configure PostgreSQL for local connections
log "Configuring PostgreSQL for local connections..."

# Get PostgreSQL version and config directory
PG_VERSION=$(sudo -u postgres psql -t -c "SELECT version();" | grep -oP '\d+\.\d+' | head -1)
PG_CONFIG_DIR="/etc/postgresql/$PG_VERSION/main"

if [[ -d "$PG_CONFIG_DIR" ]]; then
    # Backup original configuration
    sudo cp "$PG_CONFIG_DIR/pg_hba.conf" "$PG_CONFIG_DIR/pg_hba.conf.backup" 2>/dev/null || true
    sudo cp "$PG_CONFIG_DIR/postgresql.conf" "$PG_CONFIG_DIR/postgresql.conf.backup" 2>/dev/null || true
    
    # Configure pg_hba.conf for local connections
    log "Updating pg_hba.conf for local connections..."
    sudo sed -i "s/#local   all             all                                     peer/local   all             all                                     md5/" "$PG_CONFIG_DIR/pg_hba.conf" || true
    sudo sed -i "s/local   all             all                                     peer/local   all             all                                     md5/" "$PG_CONFIG_DIR/pg_hba.conf" || true
    
    # Ensure local connections are allowed
    if ! sudo grep -q "local   all             $DB_USER                                md5" "$PG_CONFIG_DIR/pg_hba.conf"; then
        echo "local   all             $DB_USER                                md5" | sudo tee -a "$PG_CONFIG_DIR/pg_hba.conf" > /dev/null
    fi
    
    # Configure postgresql.conf
    log "Updating postgresql.conf settings..."
    sudo sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "$PG_CONFIG_DIR/postgresql.conf" || true
    sudo sed -i "s/#port = 5432/port = 5432/" "$PG_CONFIG_DIR/postgresql.conf" || true
    
    # Restart PostgreSQL to apply changes
    log "Restarting PostgreSQL service..."
    sudo systemctl restart postgresql
    
    success "PostgreSQL configuration updated"
else
    warning "PostgreSQL configuration directory not found. Manual configuration may be required."
fi

# Create database connection test script
log "Creating database connection test script..."
cat > "$SCRIPT_DIR/test-database-connection.sh" << EOF
#!/bin/bash
# Test database connection for AI Crypto Trading Agent

DB_NAME="$DB_NAME"
DB_USER="$DB_USER"
DB_PASSWORD="$DB_PASSWORD"

echo "Testing database connection..."
if PGPASSWORD="\$DB_PASSWORD" psql -h localhost -U "\$DB_USER" -d "\$DB_NAME" -c "SELECT 'Connection successful!' as status, NOW() as timestamp;" 2>/dev/null; then
    echo "✅ Database connection test successful"
    exit 0
else
    echo "❌ Database connection test failed"
    exit 1
fi
EOF

chmod +x "$SCRIPT_DIR/test-database-connection.sh"

# Display connection information
log "Database setup completed successfully!"
echo ""
echo "📊 Database Connection Information:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: $DB_NAME"
echo "   Username: $DB_USER"
echo "   Password: $DB_PASSWORD"
echo ""
echo "🔗 Connection URL:"
echo "   postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
echo ""
echo "🧪 Test connection:"
echo "   $SCRIPT_DIR/test-database-connection.sh"
echo ""

success "PostgreSQL database setup completed successfully! 🎉"