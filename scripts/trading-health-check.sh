#!/bin/bash

# Trading Agent Health Check Script
# Monitors the health and functionality of the trading agent

set -euo pipefail

LOG_FILE="/var/log/trading-agent/health-check.log"
PID_FILE="/var/run/trading-agent.pid"
HEALTH_ENDPOINT="http://localhost:3001/health"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [HEALTH-CHECK] $1" | tee -a "$LOG_FILE"
}

# Check if trading agent process is running
check_process() {
    if pgrep -f "node dist/main.js" >/dev/null; then
        log "✅ Trading agent process is running"
        return 0
    else
        log "❌ Trading agent process is not running"
        return 1
    fi
}

# Check if health endpoint responds
check_health_endpoint() {
    local response
    response=$(curl -s -w "%{http_code}" -o /dev/null --connect-timeout 5 --max-time 10 "$HEALTH_ENDPOINT" 2>/dev/null || echo "000")
    
    if [[ "$response" =~ ^[23][0-9][0-9]$ ]]; then
        log "✅ Trading agent health endpoint responding (HTTP $response)"
        return 0
    else
        log "❌ Trading agent health endpoint not responding (HTTP $response)"
        return 1
    fi
}

# Check memory usage
check_memory_usage() {
    local pid
    pid=$(pgrep -f "node dist/main.js" | head -1)
    
    if [ -n "$pid" ]; then
        local memory_mb
        memory_mb=$(ps -p "$pid" -o rss= | awk '{print int($1/1024)}')
        
        if [ "$memory_mb" -lt 800 ]; then
            log "✅ Memory usage is normal: ${memory_mb}MB"
            return 0
        else
            log "⚠️  High memory usage: ${memory_mb}MB"
            return 1
        fi
    else
        log "❌ Cannot check memory usage - process not found"
        return 1
    fi
}

# Check log file for recent errors
check_recent_errors() {
    local error_count
    error_count=$(tail -100 /var/log/trading-agent/app.log 2>/dev/null | grep -i "error\|exception\|failed" | wc -l || echo "0")
    
    if [ "$error_count" -lt 5 ]; then
        log "✅ Low error count in recent logs: $error_count"
        return 0
    else
        log "⚠️  High error count in recent logs: $error_count"
        return 1
    fi
}

# Main health check
main() {
    log "Starting trading agent health check..."
    
    local checks_passed=0
    local total_checks=4
    
    if check_process; then ((checks_passed++)); fi
    if check_health_endpoint; then ((checks_passed++)); fi
    if check_memory_usage; then ((checks_passed++)); fi
    if check_recent_errors; then ((checks_passed++)); fi
    
    log "Health check completed: $checks_passed/$total_checks checks passed"
    
    if [ $checks_passed -ge 3 ]; then
        log "🎉 Trading agent is healthy"
        exit 0
    else
        log "⚠️  Trading agent has health issues"
        exit 1
    fi
}

# Create log directory if it doesn't exist
mkdir -p "$(dirname "$LOG_FILE")"

# Run main function
main "$@"