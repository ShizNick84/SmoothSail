#!/bin/bash

# =============================================================================
# Production Environment Validation Script for Intel NUC
# =============================================================================
# This script validates the production environment configuration
# Run this before starting the trading agent in production
# =============================================================================

set -e

echo "🔍 Validating Intel NUC Production Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $message${NC}"
            ;;
    esac
}

# Check if .env file exists
if [ ! -f "/opt/trading-agent/.env" ]; then
    print_status "ERROR" ".env file not found at /opt/trading-agent/.env"
    print_status "INFO" "Copy .env.production to .env and configure it"
    exit 1
fi

print_status "SUCCESS" ".env file found"

# Load environment variables
source /opt/trading-agent/.env

# Validation counters
ERRORS=0
WARNINGS=0

# Function to validate required environment variable
validate_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    local is_secret=${2:-false}
    
    if [ -z "$var_value" ]; then
        print_status "ERROR" "$var_name is not set"
        ((ERRORS++))
        return 1
    elif [ "$var_value" = "REPLACE_WITH_"* ]; then
        print_status "ERROR" "$var_name still contains placeholder value"
        ((ERRORS++))
        return 1
    else
        if [ "$is_secret" = "true" ]; then
            print_status "SUCCESS" "$var_name is configured (value hidden)"
        else
            print_status "SUCCESS" "$var_name = $var_value"
        fi
        return 0
    fi
}

# Validate system configuration
print_status "INFO" "Validating system configuration..."
validate_env_var "NODE_ENV"
validate_env_var "HOST"
validate_env_var "PORT"
validate_env_var "DASHBOARD_PORT"

# Validate security configuration
print_status "INFO" "Validating security configuration..."
validate_env_var "MASTER_ENCRYPTION_KEY" true
validate_env_var "JWT_SECRET" true
validate_env_var "SESSION_SECRET" true

# Validate Gate.io API configuration
print_status "INFO" "Validating Gate.io API configuration..."
validate_env_var "GATE_IO_API_KEY" true
validate_env_var "GATE_IO_API_SECRET" true
validate_env_var "GATE_IO_BASE_URL"

# Validate SSH tunnel configuration
print_status "INFO" "Validating SSH tunnel configuration..."
validate_env_var "ORACLE_SSH_HOST"
validate_env_var "ORACLE_SSH_USERNAME"
validate_env_var "ORACLE_PRIVATE_KEY_PATH"

# Check SSH key file
if [ ! -f "$ORACLE_PRIVATE_KEY_PATH" ]; then
    print_status "ERROR" "SSH private key not found at $ORACLE_PRIVATE_KEY_PATH"
    ((ERRORS++))
else
    # Check SSH key permissions
    KEY_PERMS=$(stat -c "%a" "$ORACLE_PRIVATE_KEY_PATH")
    if [ "$KEY_PERMS" != "600" ]; then
        print_status "WARNING" "SSH key permissions are $KEY_PERMS, should be 600"
        print_status "INFO" "Run: chmod 600 $ORACLE_PRIVATE_KEY_PATH"
        ((WARNINGS++))
    else
        print_status "SUCCESS" "SSH key permissions are correct (600)"
    fi
fi

# Validate database configuration
print_status "INFO" "Validating database configuration..."
validate_env_var "DATABASE_HOST"
validate_env_var "DATABASE_NAME"
validate_env_var "DATABASE_USER"
validate_env_var "DATABASE_PASSWORD" true

# Test PostgreSQL connection
print_status "INFO" "Testing PostgreSQL connection..."
if command -v psql >/dev/null 2>&1; then
    if PGPASSWORD="$DATABASE_PASSWORD" psql -h "$DATABASE_HOST" -U "$DATABASE_USER" -d "$DATABASE_NAME" -c "SELECT 1;" >/dev/null 2>&1; then
        print_status "SUCCESS" "PostgreSQL connection successful"
    else
        print_status "ERROR" "PostgreSQL connection failed"
        ((ERRORS++))
    fi
else
    print_status "WARNING" "psql not found, cannot test database connection"
    ((WARNINGS++))
fi

# Validate notification configuration
print_status "INFO" "Validating notification configuration..."

# Check Telegram configuration
if [ "$TELEGRAM_NOTIFICATIONS_ENABLED" = "true" ]; then
    validate_env_var "TELEGRAM_BOT_TOKEN" true
    validate_env_var "TELEGRAM_CHAT_ID" true
fi

# Check Email configuration
if [ "$ENABLE_EMAIL_NOTIFICATIONS" = "true" ]; then
    validate_env_var "EMAIL_FROM"
    validate_env_var "EMAIL_PASSWORD" true
    validate_env_var "EMAIL_TO"
fi

# Validate AI configuration
print_status "INFO" "Validating AI configuration..."
if [ "$ENABLE_AI_MARKET_ANALYSIS" = "true" ]; then
    validate_env_var "GOOGLE_AI_API_KEY" true
fi

# Check directory permissions
print_status "INFO" "Validating directory permissions..."

REQUIRED_DIRS=(
    "/opt/trading-agent"
    "/opt/trading-agent/logs"
    "/opt/trading-agent/data"
    "/opt/trading-agent/backups"
    "/var/log/trading-agent"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        print_status "WARNING" "Directory $dir does not exist"
        ((WARNINGS++))
    else
        # Check if trading user can write to directory
        if [ -w "$dir" ]; then
            print_status "SUCCESS" "Directory $dir is writable"
        else
            print_status "ERROR" "Directory $dir is not writable by trading user"
            ((ERRORS++))
        fi
    fi
done

# Check systemd services
print_status "INFO" "Validating systemd services..."

SERVICES=("ssh-tunnel" "trading-agent" "trading-dashboard")

for service in "${SERVICES[@]}"; do
    if systemctl list-unit-files | grep -q "$service.service"; then
        print_status "SUCCESS" "$service.service is installed"
        
        if systemctl is-enabled "$service.service" >/dev/null 2>&1; then
            print_status "SUCCESS" "$service.service is enabled"
        else
            print_status "WARNING" "$service.service is not enabled for auto-start"
            ((WARNINGS++))
        fi
    else
        print_status "ERROR" "$service.service is not installed"
        ((ERRORS++))
    fi
done

# Check Node.js version
print_status "INFO" "Validating Node.js installation..."
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    print_status "SUCCESS" "Node.js version: $NODE_VERSION"
    
    # Check if version is >= 18
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        print_status "SUCCESS" "Node.js version is compatible (>= 18)"
    else
        print_status "ERROR" "Node.js version must be >= 18, found $NODE_VERSION"
        ((ERRORS++))
    fi
else
    print_status "ERROR" "Node.js is not installed"
    ((ERRORS++))
fi

# Check npm dependencies
print_status "INFO" "Validating npm dependencies..."
if [ -f "/opt/trading-agent/package.json" ]; then
    if [ -d "/opt/trading-agent/node_modules" ]; then
        print_status "SUCCESS" "node_modules directory exists"
    else
        print_status "WARNING" "node_modules directory not found, run 'npm install'"
        ((WARNINGS++))
    fi
    
    if [ -f "/opt/trading-agent/dist/main.js" ]; then
        print_status "SUCCESS" "Application is built (dist/main.js exists)"
    else
        print_status "WARNING" "Application not built, run 'npm run build'"
        ((WARNINGS++))
    fi
else
    print_status "ERROR" "package.json not found in /opt/trading-agent"
    ((ERRORS++))
fi

# Network connectivity tests
print_status "INFO" "Testing network connectivity..."

# Test Oracle Cloud SSH connectivity
if command -v ssh >/dev/null 2>&1; then
    if ssh -o ConnectTimeout=10 -o BatchMode=yes -i "$ORACLE_PRIVATE_KEY_PATH" "$ORACLE_SSH_USERNAME@$ORACLE_SSH_HOST" exit 2>/dev/null; then
        print_status "SUCCESS" "SSH connection to Oracle Cloud successful"
    else
        print_status "ERROR" "SSH connection to Oracle Cloud failed"
        ((ERRORS++))
    fi
else
    print_status "ERROR" "SSH client not installed"
    ((ERRORS++))
fi

# Test internet connectivity
if ping -c 1 8.8.8.8 >/dev/null 2>&1; then
    print_status "SUCCESS" "Internet connectivity available"
else
    print_status "ERROR" "No internet connectivity"
    ((ERRORS++))
fi

# Summary
echo ""
print_status "INFO" "Validation Summary:"
print_status "INFO" "Errors: $ERRORS"
print_status "INFO" "Warnings: $WARNINGS"

if [ $ERRORS -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        print_status "SUCCESS" "All validations passed! Ready for production deployment."
        exit 0
    else
        print_status "WARNING" "Validation completed with warnings. Review and fix warnings before deployment."
        exit 1
    fi
else
    print_status "ERROR" "Validation failed with $ERRORS errors. Fix all errors before deployment."
    exit 2
fi