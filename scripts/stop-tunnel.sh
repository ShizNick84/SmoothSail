#!/bin/bash

# SSH Tunnel Stop Script for Intel NUC
# This script gracefully stops the SSH tunnel

set -e

# Configuration
PID_FILE="/var/run/ssh-tunnel.pid"
LOG_FILE="/var/log/trading-agent/ssh-tunnel.log"

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
    
    # Also log to file if log file exists
    if [[ -f "$LOG_FILE" ]]; then
        echo "[$timestamp] [$level] $message" >> "$LOG_FILE"
    fi
}

# Function to stop SSH tunnel
stop_tunnel() {
    log_message "INFO" "Stopping SSH tunnel..."
    
    if [[ ! -f "$PID_FILE" ]]; then
        log_message "WARNING" "PID file not found, tunnel may not be running"
        return 0
    fi
    
    local pid=$(cat "$PID_FILE")
    
    if ! ps -p "$pid" > /dev/null 2>&1; then
        log_message "WARNING" "SSH tunnel process (PID: $pid) is not running"
        rm -f "$PID_FILE"
        return 0
    fi
    
    # Send TERM signal first
    log_message "INFO" "Sending TERM signal to SSH tunnel process (PID: $pid)"
    kill -TERM "$pid"
    
    # Wait for graceful shutdown
    local count=0
    while ps -p "$pid" > /dev/null 2>&1 && [[ $count -lt 10 ]]; do
        sleep 1
        ((count++))
    done
    
    # If still running, force kill
    if ps -p "$pid" > /dev/null 2>&1; then
        log_message "WARNING" "Process still running, sending KILL signal"
        kill -KILL "$pid"
        sleep 2
    fi
    
    # Verify process is stopped
    if ps -p "$pid" > /dev/null 2>&1; then
        log_message "ERROR" "Failed to stop SSH tunnel process"
        return 1
    else
        log_message "SUCCESS" "SSH tunnel stopped successfully"
        rm -f "$PID_FILE"
        return 0
    fi
}

# Main execution
main() {
    log_message "INFO" "SSH tunnel stop script started"
    
    if stop_tunnel; then
        log_message "SUCCESS" "SSH tunnel stop completed"
        exit 0
    else
        log_message "ERROR" "SSH tunnel stop failed"
        exit 1
    fi
}

# Run main function
main "$@"