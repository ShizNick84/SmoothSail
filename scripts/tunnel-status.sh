#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - SSH Tunnel Status Script for Intel NUC
# =============================================================================
# This script checks the status of the SSH tunnel to Oracle Cloud
# =============================================================================

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
PID_FILE="/var/run/trading-agent/ssh-tunnel.pid"
STATUS_FILE="/var/run/trading-agent/tunnel-status.json"
SSH_TUNNEL_LOCAL_PORT="${SSH_TUNNEL_LOCAL_PORT:-8443}"
SSH_TUNNEL_BIND_ADDRESS="${SSH_TUNNEL_BIND_ADDRESS:-127.0.0.1}"

log "🔍 Checking SSH Tunnel Status..."

# Check if PID file exists
if [[ ! -f "$PID_FILE" ]]; then
    error "SSH tunnel PID file not found"
    echo "Status: STOPPED"
    exit 1
fi

# Read PID from file
TUNNEL_PID=$(cat "$PID_FILE")

# Check if process is running
if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    error "SSH tunnel process (PID: $TUNNEL_PID) is not running"
    echo "Status: FAILED"
    rm -f "$PID_FILE"
    rm -f "$STATUS_FILE"
    exit 1
fi

success "SSH tunnel process is running (PID: $TUNNEL_PID)"

# Test tunnel connectivity
log "Testing tunnel connectivity..."
if timeout 5 bash -c "echo > /dev/tcp/${SSH_TUNNEL_BIND_ADDRESS}/${SSH_TUNNEL_LOCAL_PORT}" 2>/dev/null; then
    success "Tunnel connectivity test passed"
    CONNECTIVITY_STATUS="CONNECTED"
else
    error "Tunnel connectivity test failed"
    CONNECTIVITY_STATUS="UNREACHABLE"
fi

# Get process information
PROCESS_INFO=$(ps -p "$TUNNEL_PID" -o pid,ppid,etime,cmd --no-headers 2>/dev/null || echo "Process info unavailable")

# Display status information
echo ""
echo "=== SSH Tunnel Status ==="
echo "Status: $CONNECTIVITY_STATUS"
echo "PID: $TUNNEL_PID"
echo "Local Endpoint: ${SSH_TUNNEL_BIND_ADDRESS}:${SSH_TUNNEL_LOCAL_PORT}"
echo "Process Info: $PROCESS_INFO"

# Display status file if it exists
if [[ -f "$STATUS_FILE" ]]; then
    echo ""
    echo "=== Detailed Status ==="
    cat "$STATUS_FILE" | jq . 2>/dev/null || cat "$STATUS_FILE"
fi

# Update status file
if [[ -f "$STATUS_FILE" ]]; then
    # Update last_check timestamp
    TEMP_FILE=$(mktemp)
    jq --arg timestamp "$(date -Iseconds)" '.last_check = $timestamp' "$STATUS_FILE" > "$TEMP_FILE" && mv "$TEMP_FILE" "$STATUS_FILE"
fi

# Test API connectivity through tunnel
log "Testing Gate.io API connectivity through tunnel..."
if timeout 10 curl -s "http://${SSH_TUNNEL_BIND_ADDRESS}:${SSH_TUNNEL_LOCAL_PORT}/api/v4/spot/currencies" > /dev/null 2>&1; then
    success "Gate.io API is reachable through tunnel"
    API_STATUS="REACHABLE"
else
    warning "Gate.io API test failed (this may be normal if API requires authentication)"
    API_STATUS="TEST_FAILED"
fi

echo "API Status: $API_STATUS"

# Exit with appropriate code
if [[ "$CONNECTIVITY_STATUS" == "CONNECTED" ]]; then
    success "SSH tunnel is healthy! 🎉"
    exit 0
else
    error "SSH tunnel has issues"
    exit 1
fi