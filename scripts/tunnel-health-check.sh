#!/bin/bash

# SSH Tunnel Health Check Script
# Verifies that the SSH tunnel is working and Gate.io API is accessible

set -euo pipefail

TUNNEL_PORT=8443
ORACLE_HOST="168.138.104.117"
LOG_FILE="/var/log/trading-agent/tunnel-health.log"
MAX_RETRIES=3
RETRY_DELAY=5

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [TUNNEL-HEALTH] $1" | tee -a "$LOG_FILE"
}

# Check if tunnel port is listening
check_tunnel_port() {
    if netstat -tuln | grep -q ":$TUNNEL_PORT "; then
        log "✅ SSH tunnel port $TUNNEL_PORT is listening"
        return 0
    else
        log "❌ SSH tunnel port $TUNNEL_PORT is not listening"
        return 1
    fi
}

# Check SSH connection to Oracle Cloud
check_ssh_connection() {
    if ssh -o ConnectTimeout=10 -o BatchMode=yes -i /opt/trading-agent/keys/oracle_key opc@$ORACLE_HOST "echo 'SSH connection test'" >/dev/null 2>&1; then
        log "✅ SSH connection to Oracle Cloud is working"
        return 0
    else
        log "❌ SSH connection to Oracle Cloud failed"
        return 1
    fi
}

# Check Gate.io API accessibility through tunnel
check_api_access() {
    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 10 --max-time 30 "http://localhost:$TUNNEL_PORT/api/v4/spot/currencies" 2>/dev/null || echo "000")
    
    if [[ "$response" =~ ^[23][0-9][0-9]$ ]]; then
        log "✅ Gate.io API accessible through tunnel (HTTP $response)"
        return 0
    else
        log "❌ Gate.io API not accessible through tunnel (HTTP $response)"
        return 1
    fi
}

# Main health check function
main() {
    log "Starting SSH tunnel health check..."
    
    local checks_passed=0
    local total_checks=3
    
    # Check 1: Tunnel port listening
    if check_tunnel_port; then
        ((checks_passed++))
    fi
    
    # Check 2: SSH connection
    if check_ssh_connection; then
        ((checks_passed++))
    fi
    
    # Check 3: API access through tunnel
    if check_api_access; then
        ((checks_passed++))
    fi
    
    # Report results
    log "Health check completed: $checks_passed/$total_checks checks passed"
    
    if [ $checks_passed -eq $total_checks ]; then
        log "🎉 SSH tunnel is healthy and fully operational"
        exit 0
    else
        log "⚠️  SSH tunnel has issues - some checks failed"
        exit 1
    fi
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main "$@"