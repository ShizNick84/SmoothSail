#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - SSH Tunnel Health Monitor for Intel NUC
# =============================================================================
# This script continuously monitors SSH tunnel health and auto-restarts if needed
# Run this as a systemd service or cron job
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

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="/var/run/trading-agent/ssh-tunnel.pid"
HEALTH_LOG="/var/log/trading-agent/tunnel-health.log"
SSH_TUNNEL_LOCAL_PORT="${SSH_TUNNEL_LOCAL_PORT:-8443}"
SSH_TUNNEL_BIND_ADDRESS="${SSH_TUNNEL_BIND_ADDRESS:-127.0.0.1}"
HEALTH_CHECK_INTERVAL="${HEALTH_CHECK_INTERVAL:-60}"
MAX_RESTART_ATTEMPTS="${MAX_RESTART_ATTEMPTS:-3}"
RESTART_COOLDOWN="${RESTART_COOLDOWN:-300}"

# Counters
RESTART_ATTEMPTS=0
LAST_RESTART_TIME=0

# Ensure log directory exists
LOG_DIR=$(dirname "$HEALTH_LOG")
if [[ ! -d "$LOG_DIR" ]]; then
    sudo mkdir -p "$LOG_DIR"
    sudo chown trading:trading "$LOG_DIR"
fi

# Logging to file
log_to_file() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" >> "$HEALTH_LOG"
}

# Health check function
check_tunnel_health() {
    local health_status="HEALTHY"
    local issues=()
    
    # Check if PID file exists
    if [[ ! -f "$PID_FILE" ]]; then
        health_status="UNHEALTHY"
        issues+=("PID file missing")
        return 1
    fi
    
    # Check if process is running
    local tunnel_pid=$(cat "$PID_FILE")
    if ! kill -0 "$tunnel_pid" 2>/dev/null; then
        health_status="UNHEALTHY"
        issues+=("Process not running (PID: $tunnel_pid)")
        return 1
    fi
    
    # Check tunnel connectivity
    if ! timeout 5 bash -c "echo > /dev/tcp/${SSH_TUNNEL_BIND_ADDRESS}/${SSH_TUNNEL_LOCAL_PORT}" 2>/dev/null; then
        health_status="UNHEALTHY"
        issues+=("Tunnel port unreachable")
        return 1
    fi
    
    # Test API connectivity (optional, may fail due to auth)
    if timeout 10 curl -s --max-time 5 "http://${SSH_TUNNEL_BIND_ADDRESS}:${SSH_TUNNEL_LOCAL_PORT}/api/v4/spot/currencies" > /dev/null 2>&1; then
        log_to_file "API connectivity test passed"
    else
        log_to_file "API connectivity test failed (may be normal)"
    fi
    
    return 0
}

# Restart tunnel function
restart_tunnel() {
    local current_time=$(date +%s)
    
    # Check restart cooldown
    if (( current_time - LAST_RESTART_TIME < RESTART_COOLDOWN )); then
        local remaining=$((RESTART_COOLDOWN - (current_time - LAST_RESTART_TIME)))
        warning "Restart cooldown active. Waiting ${remaining}s before restart."
        return 1
    fi
    
    # Check max restart attempts
    if (( RESTART_ATTEMPTS >= MAX_RESTART_ATTEMPTS )); then
        error "Maximum restart attempts ($MAX_RESTART_ATTEMPTS) reached. Manual intervention required."
        log_to_file "ERROR: Maximum restart attempts reached. Manual intervention required."
        return 1
    fi
    
    log "Attempting to restart SSH tunnel (attempt $((RESTART_ATTEMPTS + 1))/$MAX_RESTART_ATTEMPTS)..."
    log_to_file "Restarting SSH tunnel (attempt $((RESTART_ATTEMPTS + 1))/$MAX_RESTART_ATTEMPTS)"
    
    # Stop existing tunnel
    if [[ -x "$SCRIPT_DIR/stop-tunnel.sh" ]]; then
        "$SCRIPT_DIR/stop-tunnel.sh" || true
    fi
    
    # Wait a moment
    sleep 5
    
    # Start tunnel
    if [[ -x "$SCRIPT_DIR/start-tunnel.sh" ]]; then
        if "$SCRIPT_DIR/start-tunnel.sh"; then
            success "SSH tunnel restarted successfully"
            log_to_file "SSH tunnel restarted successfully"
            RESTART_ATTEMPTS=$((RESTART_ATTEMPTS + 1))
            LAST_RESTART_TIME=$current_time
            return 0
        else
            error "Failed to restart SSH tunnel"
            log_to_file "ERROR: Failed to restart SSH tunnel"
            RESTART_ATTEMPTS=$((RESTART_ATTEMPTS + 1))
            LAST_RESTART_TIME=$current_time
            return 1
        fi
    else
        error "Start tunnel script not found or not executable"
        return 1
    fi
}

# Reset restart counter on successful health checks
reset_restart_counter() {
    if (( RESTART_ATTEMPTS > 0 )); then
        log "Tunnel stable. Resetting restart counter."
        log_to_file "Tunnel stable. Resetting restart counter."
        RESTART_ATTEMPTS=0
    fi
}

# Main monitoring loop
main() {
    log "🔍 Starting SSH Tunnel Health Monitor..."
    log_to_file "SSH Tunnel Health Monitor started"
    
    local consecutive_healthy_checks=0
    local required_healthy_checks=5  # Reset counter after 5 consecutive healthy checks
    
    while true; do
        if check_tunnel_health; then
            success "Tunnel health check passed"
            log_to_file "Tunnel health check passed"
            
            consecutive_healthy_checks=$((consecutive_healthy_checks + 1))
            
            # Reset restart counter after several consecutive healthy checks
            if (( consecutive_healthy_checks >= required_healthy_checks )); then
                reset_restart_counter
                consecutive_healthy_checks=0
            fi
        else
            error "Tunnel health check failed"
            log_to_file "ERROR: Tunnel health check failed"
            consecutive_healthy_checks=0
            
            # Attempt restart
            if restart_tunnel; then
                log "Tunnel restart successful, continuing monitoring..."
            else
                error "Tunnel restart failed, continuing monitoring..."
            fi
        fi
        
        # Wait before next check
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Signal handlers
cleanup() {
    log "Received shutdown signal, stopping health monitor..."
    log_to_file "SSH Tunnel Health Monitor stopped"
    exit 0
}

trap cleanup SIGTERM SIGINT

# Check if running as daemon
if [[ "${1:-}" == "--daemon" ]]; then
    # Run as daemon
    main &
    echo $! > /var/run/trading-agent/tunnel-health-monitor.pid
    wait
else
    # Run in foreground
    main
fi