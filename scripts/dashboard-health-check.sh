#!/bin/bash

# Dashboard Health Check Script
# Monitors the health and accessibility of the web dashboard

set -euo pipefail

LOG_FILE="/var/log/trading-agent/dashboard-health.log"
DASHBOARD_PORT=3000
DASHBOARD_URL="http://localhost:$DASHBOARD_PORT"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [DASHBOARD-HEALTH] $1" | tee -a "$LOG_FILE"
}

# Check if dashboard process is running
check_dashboard_process() {
    if pgrep -f "npm run dashboard:start" >/dev/null || pgrep -f "next start" >/dev/null; then
        log "✅ Dashboard process is running"
        return 0
    else
        log "❌ Dashboard process is not running"
        return 1
    fi
}

# Check if dashboard port is listening
check_port_listening() {
    if netstat -tuln | grep -q ":$DASHBOARD_PORT "; then
        log "✅ Dashboard port $DASHBOARD_PORT is listening"
        return 0
    else
        log "❌ Dashboard port $DASHBOARD_PORT is not listening"
        return 1
    fi
}

# Check dashboard HTTP response
check_http_response() {
    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 10 --max-time 30 "$DASHBOARD_URL" 2>/dev/null || echo "000")
    
    if [[ "$response" =~ ^[23][0-9][0-9]$ ]]; then
        log "✅ Dashboard HTTP response is healthy (HTTP $response)"
        return 0
    else
        log "❌ Dashboard HTTP response is unhealthy (HTTP $response)"
        return 1
    fi
}

# Check dashboard API endpoints
check_api_endpoints() {
    local endpoints=("/api/health" "/api/status")
    local healthy_endpoints=0
    
    for endpoint in "${endpoints[@]}"; do
        local response
        response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 5 --max-time 15 "${DASHBOARD_URL}${endpoint}" 2>/dev/null || echo "000")
        
        if [[ "$response" =~ ^[23][0-9][0-9]$ ]]; then
            log "✅ Dashboard API endpoint healthy: $endpoint (HTTP $response)"
            ((healthy_endpoints++))
        else
            log "⚠️  Dashboard API endpoint issue: $endpoint (HTTP $response)"
        fi
    done
    
    if [ $healthy_endpoints -gt 0 ]; then
        log "✅ Dashboard API endpoints are responding ($healthy_endpoints/${#endpoints[@]})"
        return 0
    else
        log "❌ No dashboard API endpoints are responding"
        return 1
    fi
}

# Check memory usage
check_memory_usage() {
    local pid
    pid=$(pgrep -f "npm run dashboard:start\|next start" | head -1)
    
    if [ -n "$pid" ]; then
        local memory_mb
        memory_mb=$(ps -p "$pid" -o rss= | awk '{print int($1/1024)}')
        
        if [ "$memory_mb" -lt 400 ]; then
            log "✅ Dashboard memory usage is normal: ${memory_mb}MB"
            return 0
        else
            log "⚠️  Dashboard high memory usage: ${memory_mb}MB"
            return 1
        fi
    else
        log "❌ Cannot check memory usage - dashboard process not found"
        return 1
    fi
}

# Check network accessibility from local network
check_network_accessibility() {
    log "🔍 Checking network accessibility..."
    
    # Get local IP addresses and test accessibility
    local ip_addresses
    ip_addresses=$(hostname -I | tr ' ' '\n' | grep -E '^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.' | head -3)
    
    local accessible_ips=0
    local total_ips=0
    
    if [ -n "$ip_addresses" ]; then
        echo "$ip_addresses" | while read -r ip; do
            ((total_ips++))
            local response
            response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 5 --max-time 10 "http://$ip:$DASHBOARD_PORT" 2>/dev/null || echo "000")
            
            if [[ "$response" =~ ^[23][0-9][0-9]$ ]]; then
                log "✅ Dashboard accessible from: http://$ip:$DASHBOARD_PORT"
                ((accessible_ips++))
            else
                log "⚠️  Dashboard not accessible from: http://$ip:$DASHBOARD_PORT"
            fi
        done
        
        if [ $accessible_ips -gt 0 ]; then
            log "✅ Dashboard is accessible from local network ($accessible_ips IPs)"
            return 0
        else
            log "❌ Dashboard is not accessible from any local network IP"
            return 1
        fi
    else
        log "⚠️  No local network IP addresses found"
        return 1
    fi
}

# Main health check function
main() {
    log "Starting dashboard health check..."
    
    local checks_passed=0
    local total_checks=6
    
    # Run all checks
    if check_dashboard_process; then ((checks_passed++)); fi
    if check_port_listening; then ((checks_passed++)); fi
    if check_http_response; then ((checks_passed++)); fi
    if check_api_endpoints; then ((checks_passed++)); fi
    if check_memory_usage; then ((checks_passed++)); fi
    if check_network_accessibility; then ((checks_passed++)); fi
    
    # Report results
    log "Dashboard health check completed: $checks_passed/$total_checks checks passed"
    
    if [ $checks_passed -ge 4 ]; then
        log "🎉 Dashboard is healthy and accessible"
        
        # Show access URLs
        log "🌐 Dashboard access URLs:"
        hostname -I | tr ' ' '\n' | grep -E '^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\.' | head -3 | while read -r ip; do
            log "   🔗 http://$ip:$DASHBOARD_PORT"
        done
        
        exit 0
    else
        log "⚠️  Dashboard has health issues"
        exit 1
    fi
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main "$@"