#!/bin/bash

# Dashboard Pre-Start Checks
# Verifies prerequisites before starting the web dashboard

set -euo pipefail

LOG_FILE="/var/log/trading-agent/dashboard-pre-start.log"
DASHBOARD_PORT=3000
TRADING_AGENT_PORT=3001

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [DASHBOARD-PRE-START] $1" | tee -a "$LOG_FILE"
}

# Check if trading agent is running
check_trading_agent() {
    log "🔍 Checking trading agent availability..."
    
    if systemctl is-active --quiet trading-agent; then
        log "✅ Trading agent service is running"
        
        # Check if trading agent API is responding
        local response
        response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 5 --max-time 10 "http://localhost:$TRADING_AGENT_PORT/health" 2>/dev/null || echo "000")
        
        if [[ "$response" =~ ^[23][0-9][0-9]$ ]]; then
            log "✅ Trading agent API is responding (HTTP $response)"
            return 0
        else
            log "❌ Trading agent API not responding (HTTP $response)"
            return 1
        fi
    else
        log "❌ Trading agent service is not running"
        return 1
    fi
}

# Check if dashboard port is available
check_port_availability() {
    log "🔍 Checking dashboard port availability..."
    
    if netstat -tuln | grep -q ":$DASHBOARD_PORT "; then
        log "❌ Port $DASHBOARD_PORT is already in use"
        return 1
    else
        log "✅ Port $DASHBOARD_PORT is available"
        return 0
    fi
}

# Check Node.js and npm availability
check_nodejs_npm() {
    log "🔍 Checking Node.js and npm..."
    
    if command -v node >/dev/null 2>&1; then
        local node_version=$(node --version)
        log "✅ Node.js available: $node_version"
    else
        log "❌ Node.js not found"
        return 1
    fi
    
    if command -v npm >/dev/null 2>&1; then
        local npm_version=$(npm --version)
        log "✅ npm available: $npm_version"
    else
        log "❌ npm not found"
        return 1
    fi
    
    return 0
}

# Check dashboard files and dependencies
check_dashboard_files() {
    log "🔍 Checking dashboard files..."
    
    # Check if package.json exists
    if [ -f "/opt/trading-agent/package.json" ]; then
        log "✅ package.json exists"
    else
        log "❌ package.json not found"
        return 1
    fi
    
    # Check if node_modules exists
    if [ -d "/opt/trading-agent/node_modules" ]; then
        log "✅ node_modules directory exists"
    else
        log "❌ node_modules directory not found"
        return 1
    fi
    
    # Check if dashboard script exists in package.json
    if grep -q "dashboard:start" "/opt/trading-agent/package.json"; then
        log "✅ dashboard:start script found in package.json"
    else
        log "❌ dashboard:start script not found in package.json"
        return 1
    fi
    
    return 0
}

# Check network configuration
check_network_config() {
    log "🔍 Checking network configuration..."
    
    # Get local IP addresses
    local ip_addresses
    ip_addresses=$(hostname -I | tr ' ' '\n' | grep -E '^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.' | head -3)
    
    if [ -n "$ip_addresses" ]; then
        log "✅ Local network IP addresses found:"
        echo "$ip_addresses" | while read -r ip; do
            log "   📍 $ip:$DASHBOARD_PORT"
        done
        return 0
    else
        log "⚠️  No local network IP addresses found"
        return 1
    fi
}

# Check environment variables
check_environment() {
    log "🔍 Checking dashboard environment variables..."
    
    local env_file="/opt/trading-agent/.env"
    local required_vars=("NODE_ENV")
    local all_vars_ok=true
    
    if [ -f "$env_file" ]; then
        for var in "${required_vars[@]}"; do
            if grep -q "^${var}=" "$env_file"; then
                log "✅ Environment variable configured: $var"
            else
                log "⚠️  Environment variable not set: $var (using default)"
            fi
        done
    else
        log "⚠️  Environment file not found: $env_file (using defaults)"
    fi
    
    return 0
}

# Main function
main() {
    log "Starting dashboard pre-start checks..."
    
    local checks_passed=0
    local total_checks=5
    local critical_failures=0
    
    # Run all checks
    if check_trading_agent; then ((checks_passed++)); else ((critical_failures++)); fi
    if check_port_availability; then ((checks_passed++)); else ((critical_failures++)); fi
    if check_nodejs_npm; then ((checks_passed++)); else ((critical_failures++)); fi
    if check_dashboard_files; then ((checks_passed++)); else ((critical_failures++)); fi
    if check_network_config; then ((checks_passed++)); fi
    check_environment && ((checks_passed++))
    
    # Report results
    log "Dashboard pre-start checks completed: $checks_passed/$total_checks checks passed"
    
    if [ $critical_failures -eq 0 ]; then
        log "🎉 All critical pre-start checks passed - ready to start dashboard"
        log "🌐 Dashboard will be accessible at:"
        hostname -I | tr ' ' '\n' | grep -E '^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.' | head -3 | while read -r ip; do
            log "   🔗 http://$ip:$DASHBOARD_PORT"
        done
        exit 0
    else
        log "❌ $critical_failures critical checks failed - cannot start dashboard"
        exit 1
    fi
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main "$@"