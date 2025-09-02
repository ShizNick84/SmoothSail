#!/bin/bash

# SSH Tunnel Startup Script for Intel NUC to Oracle Cloud
# This script establishes and maintains SSH tunnel for Gate.io API access

set -e

# Load environment variables if .env file exists
if [[ -f "/opt/trading-agent/.env" ]]; then
    source /opt/trading-agent/.env
fi

# Default configuration (can be overridden by environment variables)
ORACLE_SSH_HOST=${ORACLE_SSH_HOST:-"168.138.104.117"}
ORACLE_SSH_USERNAME=${ORACLE_SSH_USERNAME:-"opc"}
ORACLE_SSH_PORT=${ORACLE_SSH_PORT:-"22"}
SSH_PRIVATE_KEY_PATH=${SSH_PRIVATE_KEY_PATH:-"/opt/trading-agent/keys/oracle_key"}
SSH_TUNNEL_LOCAL_PORT=${SSH_TUNNEL_LOCAL_PORT:-"8443"}
SSH_TUNNEL_REMOTE_HOST=${SSH_TUNNEL_REMOTE_HOST:-"api.gateio.ws"}
SSH_TUNNEL_REMOTE_PORT=${SSH_TUNNEL_REMOTE_PORT:-"443"}
SSH_TUNNEL_BIND_ADDRESS=${SSH_TUNNEL_BIND_ADDRESS:-"127.0.0.1"}

# SSH connection options
SSH_CONNECT_TIMEOUT=${SSH_CONNECT_TIMEOUT:-"30"}
SSH_SERVER_ALIVE_INTERVAL=${SSH_SERVER_ALIVE_INTERVAL:-"60"}
SSH_SERVER_ALIVE_COUNT_MAX=${SSH_SERVER_ALIVE_COUNT_MAX:-"3"}
SSH_STRICT_HOST_KEY_CHECKING=${SSH_STRICT_HOST_KEY_CHECKING:-"no"}

# Logging
LOG_FILE="/var/log/trading-agent/ssh-tunnel.log"
PID_FILE="/var/run/ssh-tunnel.pid"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to log messages
log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${BLUE}[INFO]${NC} $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} $message"
            ;;
        "WARNING")
            echo -e "${YELLOW}[WARNING]${NC} $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} $message"
            ;;
    esac
    
    # Also log to file
    echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
}

# Function to check if tunnel is already running
check_existing_tunnel() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_message "WARNING" "SSH tunnel is already running with PID: $pid"
            return 0
        else
            log_message "INFO" "Removing stale PID file"
            rm -f "$PID_FILE"
        fi
    fi
    return 1
}

# Function to check if port is already in use
check_port_availability() {
    if netstat -tuln | grep -q ":$SSH_TUNNEL_LOCAL_PORT "; then
        log_message "ERROR" "Port $SSH_TUNNEL_LOCAL_PORT is already in use"
        return 1
    fi
    return 0
}

# Function to validate SSH key
validate_ssh_key() {
    if [[ ! -f "$SSH_PRIVATE_KEY_PATH" ]]; then
        log_message "ERROR" "SSH private key not found: $SSH_PRIVATE_KEY_PATH"
        return 1
    fi
    
    # Check key permissions
    local key_perms=$(stat -c "%a" "$SSH_PRIVATE_KEY_PATH")
    if [[ "$key_perms" != "600" ]]; then
        log_message "WARNING" "SSH key permissions are $key_perms, should be 600"
        chmod 600 "$SSH_PRIVATE_KEY_PATH"
        log_message "INFO" "Fixed SSH key permissions"
    fi
    
    return 0
}

# Function to test SSH connectivity
test_ssh_connectivity() {
    log_message "INFO" "Testing SSH connectivity to Oracle Cloud..."
    
    if ssh -i "$SSH_PRIVATE_KEY_PATH" \
           -o ConnectTimeout="$SSH_CONNECT_TIMEOUT" \
           -o StrictHostKeyChecking="$SSH_STRICT_HOST_KEY_CHECKING" \
           -o BatchMode=yes \
           -p "$ORACLE_SSH_PORT" \
           "$ORACLE_SSH_USERNAME@$ORACLE_SSH_HOST" \
           "echo 'SSH connection successful'" 2>/dev/null; then
        log_message "SUCCESS" "SSH connectivity test passed"
        return 0
    else
        log_message "ERROR" "SSH connectivity test failed"
        return 1
    fi
}

# Function to establish SSH tunnel
establish_tunnel() {
    log_message "INFO" "Establishing SSH tunnel..."
    log_message "INFO" "Local: $SSH_TUNNEL_BIND_ADDRESS:$SSH_TUNNEL_LOCAL_PORT"
    log_message "INFO" "Remote: $SSH_TUNNEL_REMOTE_HOST:$SSH_TUNNEL_REMOTE_PORT"
    log_message "INFO" "Via: $ORACLE_SSH_USERNAME@$ORACLE_SSH_HOST:$ORACLE_SSH_PORT"
    
    # Build SSH command
    ssh_cmd=(
        ssh
        -i "$SSH_PRIVATE_KEY_PATH"
        -L "$SSH_TUNNEL_BIND_ADDRESS:$SSH_TUNNEL_LOCAL_PORT:$SSH_TUNNEL_REMOTE_HOST:$SSH_TUNNEL_REMOTE_PORT"
        -N
        -T
        -o ConnectTimeout="$SSH_CONNECT_TIMEOUT"
        -o ServerAliveInterval="$SSH_SERVER_ALIVE_INTERVAL"
        -o ServerAliveCountMax="$SSH_SERVER_ALIVE_COUNT_MAX"
        -o StrictHostKeyChecking="$SSH_STRICT_HOST_KEY_CHECKING"
        -o ExitOnForwardFailure=yes
        -o BatchMode=yes
        -p "$ORACLE_SSH_PORT"
        "$ORACLE_SSH_USERNAME@$ORACLE_SSH_HOST"
    )
    
    # Start SSH tunnel in background
    "${ssh_cmd[@]}" &
    local ssh_pid=$!
    
    # Save PID
    echo "$ssh_pid" > "$PID_FILE"
    
    # Wait a moment for tunnel to establish
    sleep 5
    
    # Check if tunnel is still running
    if ps -p "$ssh_pid" > /dev/null 2>&1; then
        log_message "SUCCESS" "SSH tunnel established successfully (PID: $ssh_pid)"
        return 0
    else
        log_message "ERROR" "SSH tunnel failed to establish"
        rm -f "$PID_FILE"
        return 1
    fi
}

# Function to test tunnel connectivity
test_tunnel_connectivity() {
    log_message "INFO" "Testing tunnel connectivity..."
    
    # Test HTTP connection through tunnel
    if curl -s --connect-timeout 10 "http://localhost:$SSH_TUNNEL_LOCAL_PORT" > /dev/null 2>&1; then
        log_message "SUCCESS" "Tunnel connectivity test passed"
        return 0
    else
        log_message "WARNING" "Tunnel connectivity test failed (this may be normal if the remote service doesn't respond to basic HTTP)"
        # Don't return error as Gate.io API might not respond to basic HTTP requests
        return 0
    fi
}

# Function to monitor tunnel health
monitor_tunnel() {
    log_message "INFO" "Starting tunnel health monitoring..."
    
    while true; do
        if [[ -f "$PID_FILE" ]]; then
            local pid=$(cat "$PID_FILE")
            if ps -p "$pid" > /dev/null 2>&1; then
                # Tunnel is running, test connectivity every 5 minutes
                sleep 300
                
                # Test if we can still connect through tunnel
                if ! curl -s --connect-timeout 5 "http://localhost:$SSH_TUNNEL_LOCAL_PORT" > /dev/null 2>&1; then
                    log_message "WARNING" "Tunnel connectivity check failed, but continuing monitoring"
                fi
            else
                log_message "ERROR" "SSH tunnel process died, attempting restart..."
                rm -f "$PID_FILE"
                
                # Wait a bit before restart
                sleep 10
                
                # Restart tunnel
                if establish_tunnel; then
                    log_message "SUCCESS" "SSH tunnel restarted successfully"
                else
                    log_message "ERROR" "Failed to restart SSH tunnel, retrying in 30 seconds..."
                    sleep 30
                fi
            fi
        else
            log_message "ERROR" "PID file missing, tunnel may have died"
            sleep 30
        fi
    done
}

# Function to cleanup on exit
cleanup() {
    log_message "INFO" "Cleaning up SSH tunnel..."
    
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill "$pid"
            log_message "INFO" "SSH tunnel process terminated"
        fi
        rm -f "$PID_FILE"
    fi
    
    log_message "INFO" "Cleanup completed"
}

# Set up signal handlers
trap cleanup EXIT INT TERM

# Main execution
main() {
    log_message "INFO" "Starting SSH tunnel to Oracle Cloud..."
    
    # Create log directory if it doesn't exist
    mkdir -p "$(dirname "$LOG_FILE")"
    
    # Check if tunnel is already running
    if check_existing_tunnel; then
        log_message "INFO" "Using existing tunnel, starting monitoring..."
        monitor_tunnel
        return 0
    fi
    
    # Validate prerequisites
    if ! validate_ssh_key; then
        log_message "ERROR" "SSH key validation failed"
        exit 1
    fi
    
    if ! check_port_availability; then
        log_message "ERROR" "Port availability check failed"
        exit 1
    fi
    
    # Test SSH connectivity
    if ! test_ssh_connectivity; then
        log_message "ERROR" "SSH connectivity test failed"
        exit 1
    fi
    
    # Establish tunnel
    if ! establish_tunnel; then
        log_message "ERROR" "Failed to establish SSH tunnel"
        exit 1
    fi
    
    # Test tunnel connectivity
    test_tunnel_connectivity
    
    # Start monitoring
    monitor_tunnel
}

# Run main function
main "$@"