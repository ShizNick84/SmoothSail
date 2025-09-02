#!/bin/bash

# =============================================================================
# AI CRYPTO TRADING AGENT - SSH Tunnel Stop Script for Intel NUC
# =============================================================================
# This script gracefully stops the SSH tunnel to Oracle Cloud
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

# PID file for tunnel process
PID_FILE="/var/run/trading-agent/ssh-tunnel.pid"
STATUS_FILE="/var/run/trading-agent/tunnel-status.json"

log "🛑 Stopping SSH Tunnel..."

# Check if PID file exists
if [[ ! -f "$PID_FILE" ]]; then
    warning "SSH tunnel PID file not found. Tunnel may not be running."
    
    # Try to find SSH tunnel processes anyway
    TUNNEL_PIDS=$(pgrep -f "ssh.*api.gateio.ws" || true)
    if [[ -n "$TUNNEL_PIDS" ]]; then
        warning "Found SSH tunnel processes: $TUNNEL_PIDS"
        log "Attempting to stop found processes..."
        for pid in $TUNNEL_PIDS; do
            if kill -TERM "$pid" 2>/dev/null; then
                log "Sent SIGTERM to process $pid"
            fi
        done
        
        # Wait for processes to exit
        sleep 3
        
        # Force kill if still running
        for pid in $TUNNEL_PIDS; do
            if kill -0 "$pid" 2>/dev/null; then
                warning "Force killing process $pid"
                kill -KILL "$pid" 2>/dev/null || true
            fi
        done
    fi
    
    # Clean up status file
    rm -f "$STATUS_FILE"
    success "SSH tunnel cleanup completed"
    exit 0
fi

# Read PID from file
TUNNEL_PID=$(cat "$PID_FILE")

# Check if process is running
if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
    warning "SSH tunnel process (PID: $TUNNEL_PID) is not running"
    rm -f "$PID_FILE"
    rm -f "$STATUS_FILE"
    success "Cleaned up stale PID file"
    exit 0
fi

log "Stopping SSH tunnel process (PID: $TUNNEL_PID)..."

# Graceful termination
if kill -TERM "$TUNNEL_PID" 2>/dev/null; then
    log "Sent SIGTERM to SSH tunnel process"
    
    # Wait for graceful shutdown
    for i in {1..10}; do
        if ! kill -0 "$TUNNEL_PID" 2>/dev/null; then
            success "SSH tunnel stopped gracefully"
            break
        fi
        log "Waiting for tunnel to stop... ($i/10)"
        sleep 1
    done
    
    # Force kill if still running
    if kill -0 "$TUNNEL_PID" 2>/dev/null; then
        warning "Tunnel did not stop gracefully, force killing..."
        kill -KILL "$TUNNEL_PID" 2>/dev/null || true
        sleep 1
    fi
else
    error "Failed to send SIGTERM to tunnel process"
fi

# Verify process is stopped
if kill -0 "$TUNNEL_PID" 2>/dev/null; then
    error "Failed to stop SSH tunnel process"
    exit 1
fi

# Clean up files
rm -f "$PID_FILE"
rm -f "$STATUS_FILE"

success "SSH tunnel stopped successfully! 🎉"