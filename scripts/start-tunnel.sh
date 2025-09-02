#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - SSH Tunnel Startup Script for Intel NUC
# =============================================================================
# This script establishes SSH tunnel from Intel NUC to Oracle Cloud
# for secure Gate.io API access
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

# Configuration from environment or defaults
ORACLE_SSH_HOST="${ORACLE_SSH_HOST:-168.138.104.117}"
ORACLE_SSH_USERNAME="${ORACLE_SSH_USERNAME:-opc}"
ORACLE_SSH_PORT="${ORACLE_SSH_PORT:-22}"
SSH_PRIVATE_KEY_PATH="${SSH_PRIVATE_KEY_PATH:-/opt/trading-agent/keys/oracle_key}"
SSH_TUNNEL_LOCAL_PORT="${SSH_TUNNEL_LOCAL_PORT:-8443}"
SSH_TUNNEL_REMOTE_HOST="${SSH_TUNNEL_REMOTE_HOST:-api.gateio.ws}"
SSH_TUNNEL_REMOTE_PORT="${SSH_TUNNEL_REMOTE_PORT:-443}"
SSH_TUNNEL_BIND_ADDRESS="${SSH_TUNNEL_BIND_ADDRESS:-127.0.0.1}"

# SSH connection options
SSH_CONNECT_TIMEOUT="${SSH_CONNECT_TIMEOUT:-30}"
SSH_SERVER_ALIVE_INTERVAL="${SSH_SERVER_ALIVE_INTERVAL:-60}"
SSH_SERVER_ALIVE_COUNT_MAX="${SSH_SERVER_ALIVE_COUNT_MAX:-3}"

# PID file for tunnel process
PID_FILE="/var/run/trading-agent/ssh-tunnel.pid"
PID_DIR=$(dirname "$PID_FILE")

log "🔗 Starting SSH Tunnel from Intel NUC to Oracle Cloud..."

# Create PID directory if it doesn't exist
if [[ ! -d "$PID_DIR" ]]; then
    sudo mkdir -p "$PID_DIR"
    sudo chown trading:trading "$PID_DIR"
fi

# Check if tunnel is already running
if [[ -f "$PID_FILE" ]]; then
    EXISTING_PID=$(cat "$PID_FILE")
    if kill -0 "$EXISTING_PID" 2>/dev/null; then
        warning "SSH tunnel is already running (PID: $EXISTING_PID)"
        exit 0
    else
        log "Removing stale PID file"
        rm -f "$PID_FILE"
    fi
fi

# Validate private key exists
if [[ ! -f "$SSH_PRIVATE_KEY_PATH" ]]; then
    error "SSH private key not found: $SSH_PRIVATE_KEY_PATH"
    exit 1
fi

# Check private key permissions
KEY_PERMS=$(stat -c "%a" "$SSH_PRIVATE_KEY_PATH")
if [[ "$KEY_PERMS" != "600" ]]; then
    warning "Fixing private key permissions (was $KEY_PERMS, setting to 600)"
    chmod 600 "$SSH_PRIVATE_KEY_PATH"
fi

# Test SSH connectivity first
log "Testing SSH connectivity to Oracle Cloud..."
if ! ssh -i "$SSH_PRIVATE_KEY_PATH" \
    -o ConnectTimeout="$SSH_CONNECT_TIMEOUT" \
    -o StrictHostKeyChecking=no \
    -o UserKnownHostsFile=/dev/null \
    -o BatchMode=yes \
    -p "$ORACLE_SSH_PORT" \
    "$ORACLE_SSH_USERNAME@$ORACLE_SSH_HOST" \
    "echo 'SSH connection test successful'" 2>/dev/null; then
    error "SSH connectivity test failed. Check network connection and credentials."
    exit 1
fi

success "SSH connectivity test passed"

# Build SSH tunnel command
SSH_CMD=(
    ssh
    -N  # No remote command execution
    -T  # Disable pseudo-terminal allocation
    -f  # Run in background
    -o StrictHostKeyChecking=no
    -o UserKnownHostsFile=/dev/null
    -o ConnectTimeout="$SSH_CONNECT_TIMEOUT"
    -o ServerAliveInterval="$SSH_SERVER_ALIVE_INTERVAL"
    -o ServerAliveCountMax="$SSH_SERVER_ALIVE_COUNT_MAX"
    -o TCPKeepAlive=yes
    -o Compression=yes
    -o ExitOnForwardFailure=yes
    -p "$ORACLE_SSH_PORT"
    -i "$SSH_PRIVATE_KEY_PATH"
    -L "${SSH_TUNNEL_BIND_ADDRESS}:${SSH_TUNNEL_LOCAL_PORT}:${SSH_TUNNEL_REMOTE_HOST}:${SSH_TUNNEL_REMOTE_PORT}"
    "$ORACLE_SSH_USERNAME@$ORACLE_SSH_HOST"
)

log "Establishing SSH tunnel..."
log "Local endpoint: ${SSH_TUNNEL_BIND_ADDRESS}:${SSH_TUNNEL_LOCAL_PORT}"
log "Remote endpoint: ${SSH_TUNNEL_REMOTE_HOST}:${SSH_TUNNEL_REMOTE_PORT}"
log "SSH server: ${ORACLE_SSH_USERNAME}@${ORACLE_SSH_HOST}:${ORACLE_SSH_PORT}"

# Start SSH tunnel
"${SSH_CMD[@]}" &
TUNNEL_PID=$!

# Save PID
echo "$TUNNEL_PID" > "$PID_FILE"

# Wait a moment for tunnel to establish
sleep 3

# Verify tunnel is running
if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    error "SSH tunnel failed to start"
    rm -f "$PID_FILE"
    exit 1
fi

# Test tunnel connectivity
log "Testing tunnel connectivity..."
if timeout 10 bash -c "echo > /dev/tcp/${SSH_TUNNEL_BIND_ADDRESS}/${SSH_TUNNEL_LOCAL_PORT}" 2>/dev/null; then
    success "SSH tunnel established successfully!"
    success "Tunnel PID: $TUNNEL_PID"
    success "Local endpoint: ${SSH_TUNNEL_BIND_ADDRESS}:${SSH_TUNNEL_LOCAL_PORT}"
    success "Remote endpoint: ${SSH_TUNNEL_REMOTE_HOST}:${SSH_TUNNEL_REMOTE_PORT}"
else
    error "Tunnel connectivity test failed"
    kill "$TUNNEL_PID" 2>/dev/null || true
    rm -f "$PID_FILE"
    exit 1
fi

# Create tunnel status file
STATUS_FILE="/var/run/trading-agent/tunnel-status.json"
cat > "$STATUS_FILE" << EOF
{
    "status": "connected",
    "pid": $TUNNEL_PID,
    "local_endpoint": "${SSH_TUNNEL_BIND_ADDRESS}:${SSH_TUNNEL_LOCAL_PORT}",
    "remote_endpoint": "${SSH_TUNNEL_REMOTE_HOST}:${SSH_TUNNEL_REMOTE_PORT}",
    "ssh_server": "${ORACLE_SSH_USERNAME}@${ORACLE_SSH_HOST}:${ORACLE_SSH_PORT}",
    "started_at": "$(date -Iseconds)",
    "last_check": "$(date -Iseconds)"
}
EOF

success "SSH tunnel startup completed! 🎉"