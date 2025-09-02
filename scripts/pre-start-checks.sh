#!/bin/bash

# Trading Agent Pre-Start Checks
# Verifies all dependencies and prerequisites before starting the trading agent

set -euo pipefail

LOG_FILE="/var/log/trading-agent/pre-start-checks.log"
ENV_FILE="/opt/trading-agent/.env"
REQUIRED_DIRS=("/opt/trading-agent/logs" "/opt/trading-agent/data" "/opt/trading-agent/keys")
REQUIRED_FILES=("/opt/trading-agent/dist/main.js" "/opt/trading-agent/keys/oracle_key")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [PRE-START] $1" | tee -a "$LOG_FILE"
}

# Print status with color
print_status() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
    log "$message"
}

# Check if SSH tunnel is running
check_ssh_tunnel() {
    print_status $BLUE "🔍 Checking SSH tunnel service..."
    
    if systemctl is-active --quiet ssh-tunnel; then
        print_status $GREEN "✅ SSH tunnel service is running"
        
        # Check if tunnel port is accessible
        if netstat -tuln | grep -q ":8443 "; then
            print_status $GREEN "✅ SSH tunnel port 8443 is listening"
            return 0
        else
            print_status $RED "❌ SSH tunnel port 8443 is not listening"
            return 1
        fi
    else
        print_status $RED "❌ SSH tunnel service is not running"
        return 1
    fi
}

# Check database connectivity
check_database() {
    print_status $BLUE "🔍 Checking database connectivity..."
    
    if systemctl is-active --quiet postgresql; then
        print_status $GREEN "✅ PostgreSQL service is running"
        
        # Test database connection
        if sudo -u trading psql -d trading_agent -c "SELECT 1;" >/dev/null 2>&1; then
            print_status $GREEN "✅ Database connection successful"
            return 0
        else
            print_status $RED "❌ Database connection failed"
            return 1
        fi
    else
        print_status $YELLOW "⚠️  PostgreSQL service is not running (optional)"
        return 0
    fi
}

# Check required directories
check_directories() {
    print_status $BLUE "🔍 Checking required directories..."
    
    local all_dirs_ok=true
    
    for dir in "${REQUIRED_DIRS[@]}"; do
        if [ -d "$dir" ]; then
            print_status $GREEN "✅ Directory exists: $dir"
            
            # Check permissions
            if [ -w "$dir" ]; then
                print_status $GREEN "✅ Directory writable: $dir"
            else
                print_status $RED "❌ Directory not writable: $dir"
                all_dirs_ok=false
            fi
        else
            print_status $YELLOW "⚠️  Creating missing directory: $dir"
            mkdir -p "$dir"
            chown trading:trading "$dir"
            chmod 755 "$dir"
        fi
    done
    
    return $([ "$all_dirs_ok" = true ] && echo 0 || echo 1)
}

# Check required files
check_files() {
    print_status $BLUE "🔍 Checking required files..."
    
    local all_files_ok=true
    
    for file in "${REQUIRED_FILES[@]}"; do
        if [ -f "$file" ]; then
            print_status $GREEN "✅ File exists: $file"
            
            # Check if it's readable
            if [ -r "$file" ]; then
                print_status $GREEN "✅ File readable: $file"
            else
                print_status $RED "❌ File not readable: $file"
                all_files_ok=false
            fi
        else
            print_status $RED "❌ Required file missing: $file"
            all_files_ok=false
        fi
    done
    
    return $([ "$all_files_ok" = true ] && echo 0 || echo 1)
}

# Check environment configuration
check_environment() {
    print_status $BLUE "🔍 Checking environment configuration..."
    
    if [ -f "$ENV_FILE" ]; then
        print_status $GREEN "✅ Environment file exists: $ENV_FILE"
        
        # Check for required environment variables
        local required_vars=("GATE_IO_API_KEY" "GATE_IO_API_SECRET" "NODE_ENV")
        local all_vars_ok=true
        
        for var in "${required_vars[@]}"; do
            if grep -q "^${var}=" "$ENV_FILE"; then
                print_status $GREEN "✅ Environment variable configured: $var"
            else
                print_status $RED "❌ Missing environment variable: $var"
                all_vars_ok=false
            fi
        done
        
        return $([ "$all_vars_ok" = true ] && echo 0 || echo 1)
    else
        print_status $RED "❌ Environment file missing: $ENV_FILE"
        return 1
    fi
}

# Check Node.js and dependencies
check_nodejs() {
    print_status $BLUE "🔍 Checking Node.js environment..."
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        print_status $GREEN "✅ Node.js available: $node_version"
        
        # Check if main.js exists and is valid
        if [ -f "/opt/trading-agent/dist/main.js" ]; then
            print_status $GREEN "✅ Main application file exists"
            return 0
        else
            print_status $RED "❌ Main application file missing: /opt/trading-agent/dist/main.js"
            return 1
        fi
    else
        print_status $RED "❌ Node.js not found"
        return 1
    fi
}

# Test API connectivity through tunnel
test_api_connectivity() {
    print_status $BLUE "🔍 Testing Gate.io API connectivity..."
    
    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 10 --max-time 30 "http://localhost:8443/api/v4/spot/currencies" 2>/dev/null || echo "000")
    
    if [[ "$response" =~ ^[23][0-9][0-9]$ ]]; then
        print_status $GREEN "✅ Gate.io API accessible (HTTP $response)"
        return 0
    else
        print_status $RED "❌ Gate.io API not accessible (HTTP $response)"
        return 1
    fi
}

# Main function
main() {
    log "Starting pre-start checks for trading agent..."
    
    local checks_passed=0
    local total_checks=7
    local critical_failures=0
    
    # Run all checks
    if check_ssh_tunnel; then ((checks_passed++)); else ((critical_failures++)); fi
    if check_database; then ((checks_passed++)); fi
    if check_directories; then ((checks_passed++)); fi
    if check_files; then ((checks_passed++)); else ((critical_failures++)); fi
    if check_environment; then ((checks_passed++)); else ((critical_failures++)); fi
    if check_nodejs; then ((checks_passed++)); else ((critical_failures++)); fi
    if test_api_connectivity; then ((checks_passed++)); else ((critical_failures++)); fi
    
    # Report results
    log "Pre-start checks completed: $checks_passed/$total_checks checks passed"
    
    if [ $critical_failures -eq 0 ]; then
        print_status $GREEN "🎉 All critical pre-start checks passed - ready to start trading agent"
        exit 0
    else
        print_status $RED "❌ $critical_failures critical checks failed - cannot start trading agent"
        exit 1
    fi
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main "$@"